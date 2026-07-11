import fs from 'fs';
import path from 'path';

describe('home page VRM avatar', () => {
  function readHomeSource(): string {
    return fs.readFileSync(
      path.join(__dirname, '..', 'app', '(tabs)', 'index.tsx'),
      'utf8',
    );
  }

  function readDockSource(): string {
    return fs.readFileSync(
      path.join(__dirname, '..', 'components', 'vrm', 'PageDigitalHumanDock.tsx'),
      'utf8',
    );
  }

  test('renders a page-level bottom-right avatar for Xiaoling', () => {
    const homeSource = readHomeSource();
    const dockSource = readDockSource();

    expect(homeSource).toMatch(/import\s*\{[^}]*PageDigitalHumanDock[^}]*\}\s*from\s*['"]@\/components\/vrm\/PageDigitalHumanDock['"]/);
    expect(homeSource).toContain('<PageDigitalHumanDock digitalHuman={homeDigitalHuman} />');
    expect(homeSource).not.toContain('id="home-hero-avatar"');

    const avatarMatch = dockSource.match(/<LazyPageVRMView[\s\S]*?\/>/);
    expect(avatarMatch).not.toBeNull();
    expect(avatarMatch![0]).toMatch(/expression=\{digitalHuman\.expression\}/);
    expect(avatarMatch![0]).toMatch(/mouthOpen=\{digitalHuman\.mouthOpen\}/);
    expect(avatarMatch![0]).toMatch(/speaking=\{digitalHuman\.isSpeaking\}/);
    expect(avatarMatch![0]).toMatch(/framing=\{\{[\s\S]*cameraDistance/);
    expect(avatarMatch![0]).toMatch(/cameraDistance:\s*4\.3/);
    expect(avatarMatch![0]).toMatch(/cameraY:\s*0\.35/);
  });

  test('keeps the home avatar anchored in a compact page bottom-right container', () => {
    const dockSource = readDockSource();
    const stageStyle = dockSource.match(/dock:\s*\{[\s\S]*?\n  \},/);

    expect(dockSource).toContain("const bottom = insets.bottom + (Platform.OS === 'web' ? 0 : 72);");
    expect(stageStyle?.[0]).toMatch(/position:\s*'absolute'/);
    expect(stageStyle?.[0]).toMatch(/right:\s*-22/);
    expect(stageStyle?.[0]).toMatch(/width:\s*188/);
    expect(stageStyle?.[0]).toMatch(/alignItems:\s*'flex-end'/);
    expect(stageStyle?.[0]).toMatch(/zIndex:\s*20/);
  });

  test('gives the home hero avatar enough canvas area for a crisp render', () => {
    const dockSource = readDockSource();
    const canvasStyle = dockSource.match(/canvas:\s*\{[\s\S]*?\n  \},/);

    expect(canvasStyle?.[0]).toMatch(/width:\s*175/);
    expect(canvasStyle?.[0]).toMatch(/height:\s*380/);
    expect(canvasStyle?.[0]).toMatch(/marginBottom:\s*15/);
    expect(canvasStyle?.[0]).toMatch(/transform:\s*\[\{\s*translateY:\s*DOCK_VISUAL_OFFSET_Y\s*\}\]/);
  });

  test('does not enable the measured overlay stage on the home route', () => {
    const providerSource = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'vrm', 'VRMStageProvider.tsx'),
      'utf8',
    );

    expect(providerSource).toContain("new Set(['/attractions', '/routes'])");
  });
});
