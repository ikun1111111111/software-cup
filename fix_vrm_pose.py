"""Rebuild VRM file: rotate arms from T-pose to natural hanging position."""
import struct
import json
import math
import numpy as np


def quat_to_mat4(q):
    x, y, z, w = q
    return np.array([
        [1-2*(y*y+z*z), 2*(x*y-w*z),   2*(x*z+w*y),   0],
        [2*(x*y+w*z),   1-2*(x*x+z*z), 2*(y*z-w*x),   0],
        [2*(x*z-w*y),   2*(y*z+w*x),   1-2*(x*x+y*y), 0],
        [0,             0,             0,             1],
    ], dtype=np.float64)


def node_local_mat(node):
    t = np.eye(4, dtype=np.float64)
    t[:3, 3] = node.get("translation", [0, 0, 0])
    return t @ quat_to_mat4(node.get("rotation", [0, 0, 0, 1]))


def main():
    src = "frontend/public/models/avatar_hanging.vrm"
    dst = "frontend/public/models/avatar.vrm"
    with open(src, "rb") as f:
        raw = f.read()
    print(f"Source: {src} ({len(raw)} bytes)")

    # Parse GLB
    jlen = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20+jlen].decode('utf-8'))
    nodes = gltf["nodes"]
    blen = struct.unpack_from('<I', raw, 20+jlen)[0]
    bindata = bytearray(raw[20+jlen+8:20+jlen+8+blen])

    # Build parent map & compute world transforms
    for i, n in enumerate(nodes):
        for c in n.get("children", []):
            nodes[c]["_parent"] = i
    wcache = {}
    def compute_world(idx):
        if idx in wcache: return wcache[idx]
        node = nodes[idx]
        local = node_local_mat(node)
        p = node.get("_parent")
        wcache[idx] = compute_world(p) @ local if p is not None else local
        return wcache[idx]
    for i in range(len(nodes)):
        compute_world(i)

    # Find shoulder bones and ALL their descendants (the entire arm subtree)
    shoulder_l = None
    shoulder_r = None
    for i, n in enumerate(nodes):
        nm = n.get("name", "")
        if "J_Bip_L_Shoulder" in nm:
            shoulder_l = i
        if "J_Bip_R_Shoulder" in nm:
            shoulder_r = i

    # Collect all descendants of a bone recursively
    def collect_descendants(idx, result):
        result.add(idx)
        for c in nodes[idx].get("children", []):
            collect_descendants(c, result)

    arm_l = set()
    arm_r = set()
    collect_descendants(shoulder_l, arm_l)
    collect_descendants(shoulder_r, arm_r)
    print(f"L arm subtree: {len(arm_l)} bones (incl. shoulder)")
    print(f"R arm subtree: {len(arm_r)} bones (incl. shoulder)")

    # Rotation angles: L arm -90° around Z, R arm +90° around Z
    def Rz(deg):
        r = math.radians(deg)
        c, s = math.cos(r), math.sin(r)
        return np.array([[c,-s,0,0],[s,c,0,0],[0,0,1,0],[0,0,0,1]], dtype=np.float64)

    # ALL arm bones (including shoulder + descendants) get the rotation
    # 65° for natural hanging: arms slightly away from body (~15-20° from vertical)
    R_d = {}
    for jn in arm_l:
        R_d[jn] = Rz(-65)
    for jn in arm_r:
        R_d[jn] = Rz(65)

    # For verification
    arm_verify = {}
    for i, n in enumerate(nodes):
        nm = n.get("name", "")
        for key in ["J_Bip_L_UpperArm","J_Bip_L_LowerArm","J_Bip_L_Hand",
                     "J_Bip_R_UpperArm","J_Bip_R_LowerArm","J_Bip_R_Hand",
                     "J_Bip_L_Shoulder","J_Bip_R_Shoulder"]:
            if key in nm:
                arm_verify[key] = i

    # Joint matrix: rotation R_d around shoulder point sh
    l_sh = wcache[shoulder_l][:3, 3].copy()
    r_sh = wcache[shoulder_r][:3, 3].copy()
    shoulder_map = {}
    for jn in arm_l:
        shoulder_map[jn] = l_sh
    for jn in arm_r:
        shoulder_map[jn] = r_sh

    skins = gltf["skins"]
    accessors = gltf["accessors"]
    bviews = gltf["bufferViews"]

    for si, skin in enumerate(skins):
        acc = accessors[skin["inverseBindMatrices"]]
        bv = bviews[acc["bufferView"]]
        base = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
        for jp, jn in enumerate(skin["joints"]):
            world = wcache[jn]
            if jn in R_d:
                sh = shoulder_map[jn]
                # Build J matrix: rotation R_d around shoulder point sh
                Rd = R_d[jn]
                J = np.eye(4, dtype=np.float64)
                J[:3,:3] = Rd[:3,:3]
                J[:3, 3] = sh - Rd[:3,:3] @ sh  # (I - R_d) @ sh
                # IBM = W^(-1) @ J
                ibm = np.linalg.inv(world) @ J
            else:
                ibm = np.linalg.inv(world)
            off = base + jp * 64
            if off + 64 <= len(bindata):
                struct.pack_into('<16f', bindata, off, *ibm.T.flatten().astype(np.float32))
        print(f"  Skin {si}: wrote {len(skin['joints'])} IBMs")

    # Verify
    s0 = skins[0]
    acc0 = accessors[s0["inverseBindMatrices"]]
    bv0 = bviews[acc0["bufferView"]]
    b0 = bv0.get("byteOffset",0) + acc0.get("byteOffset",0)
    print("\nVerification (shoulder invariance):")
    for name in ["J_Bip_L_Shoulder", "J_Bip_L_UpperArm", "J_Bip_L_LowerArm", "J_Bip_L_Hand"]:
        jn = arm_verify[name]
        ji = s0["joints"].index(jn)
        ibm_packed = np.array(struct.unpack_from('<16f', bindata, b0+ji*64), dtype=np.float32).reshape(4,4).T
        ibm = ibm_packed.astype(np.float64)
        world = wcache[jn]
        jm = world @ ibm
        sh4 = np.array([l_sh[0], l_sh[1], l_sh[2], 1.0])
        result = jm @ sh4
        err = np.linalg.norm(result[:3] - l_sh)
        print(f"  {name}: err={err:.6f}")
    for name in ["J_Bip_R_Shoulder", "J_Bip_R_UpperArm", "J_Bip_R_LowerArm", "J_Bip_R_Hand"]:
        jn = arm_verify[name]
        ji = s0["joints"].index(jn)
        ibm_packed = np.array(struct.unpack_from('<16f', bindata, b0+ji*64), dtype=np.float32).reshape(4,4).T
        ibm = ibm_packed.astype(np.float64)
        world = wcache[jn]
        jm = world @ ibm
        sh4 = np.array([r_sh[0], r_sh[1], r_sh[2], 1.0])
        result = jm @ sh4
        err = np.linalg.norm(result[:3] - r_sh)
        print(f"  {name}: err={err:.6f}")

    # Write GLB
    for n in nodes:
        n.pop("_parent", None)
    jout = json.dumps(gltf, separators=(',',':')).encode()
    jp = (4 - len(jout)%4)%4; jout += b' '*jp
    bp = (4 - len(bindata)%4)%4; bout = bindata + bytearray(b'\x00'*bp)
    total = 12+8+len(jout)+8+len(bout)
    out = bytearray()
    out += struct.pack('<III', 0x46546C67, 2, total)
    out += struct.pack('<II', len(jout), 0x4E4F534A)
    out += jout
    out += struct.pack('<II', len(bout), 0x004E4942)
    out += bout
    with open(dst, "wb") as f:
        f.write(out)
    print(f"\nWrote {len(out)} bytes to {dst}")


if __name__ == "__main__":
    main()
