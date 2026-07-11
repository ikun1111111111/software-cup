import fs from 'fs';
import path from 'path';

describe('VRM render quality', () => {
  test('keeps floating VRM render resolution high enough for dense mobile screens', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'vrm', 'VRMView.tsx'),
      'utf8',
    );

    expect(source).toContain('const MIN_FLOAT_PIXEL_RATIO = 2;');
    expect(source).toContain('const MAX_FLOAT_PIXEL_RATIO = 3;');
    expect(source).toContain("const minPixelRatio = mode === 'float' ? MIN_FLOAT_PIXEL_RATIO : 1;");
    expect(source).toContain('renderer.setPixelRatio(targetPixelRatio);');
  });

  test('uses custom framing during initial web and native VRM attach', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'vrm', 'VRMView.tsx'),
      'utf8',
    );
    const initialAttachCalls = source.match(/loadAndAttachVRM\(scene, camera, mode, costumeIdRef\.current, framing, false/g);

    expect(initialAttachCalls).toHaveLength(2);
    expect(source).toContain('const shouldUseCachedTransform = !framing;');
    expect(source).not.toContain("const targetH = mode === 'float' ? 2.5 : 1.4;");
  });

  test('gives the home hero avatar enough canvas area for a crisp render', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'vrm', 'PageDigitalHumanDock.tsx'),
      'utf8',
    );
    const canvasStyle = source.match(/canvas:\s*\{[\s\S]*?\n  \},/);

    expect(canvasStyle?.[0]).toMatch(/width:\s*175/);
    expect(canvasStyle?.[0]).toMatch(/height:\s*380/);
    expect(canvasStyle?.[0]).toMatch(/marginBottom:\s*15/);
    expect(canvasStyle?.[0]).toMatch(/transform:\s*\[\{\s*translateY:\s*DOCK_VISUAL_OFFSET_Y\s*\}\]/);
  });
});
