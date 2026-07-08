# 灵山三维运营沙盘模型目录

将 Blender 导出的精致概念沙盘放在本目录：

```text
frontend/public/models/lingshan/lingshan-scene.glb
```

前端会自动尝试加载该文件；如果文件不存在或加载失败，会回退到程序化 WebGL 沙盘，保证管理后台可演示。

当前仓库已提供一版可加载的“全息蓝图风”概念沙盘 GLB，可通过以下命令重新生成：

```bash
node scripts/generate-lingshan-scene.mjs
```

后续如果使用 Blender 人工精修，建议继续沿用深蓝透明材质、青色线框边缘和橙色核心热点；只需要用新导出的同名文件覆盖 `lingshan-scene.glb`。

## 必需锚点

模型中建议放置 Empty 对象作为数据锚点：

- `spot_ling_shan_da_zhao_bi`
- `spot_fo_shou_guang_chang`
- `spot_bai_zi_xi_mi_le`
- `spot_xiang_fu_chan_si`
- `spot_fan_gong`
- `spot_pu_ti_da_dao`
- `spot_ling_shan_da_fo`
- `spot_wu_yin_tan_cheng`
- `spot_jiu_long_guan_yu`
- `spot_san_sheng_dian`
- `spot_man_fei_long_ta`
- `spot_ling_shan_jing_she`

详细规格见：

```text
docs/03-技术文档/灵山三维运营沙盘开发方案.md
```

机器可读清单：

```text
frontend/public/models/lingshan/scene-manifest.json
```
