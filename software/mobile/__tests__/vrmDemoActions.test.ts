import fs from 'fs';
import path from 'path';

const mobileRoot = path.resolve(__dirname, '..');
const playerSource = fs.readFileSync(
  path.join(mobileRoot, 'components/vrm/vrmDemoActionPlayer.ts'),
  'utf8',
);

describe('standalone demo action integration', () => {
  test.each([
    ['wave', 'waving1.glb'],
    ['thinking', 'thinking.glb'],
    ['explain', 'explain.glb'],
    ['listen', 'listen.glb'],
    ['waiting1', 'waiting1.glb'],
    ['waiting2', 'waiting2.glb'],
    ['waiting3', 'waiting3.glb'],
  ])('registers %s with %s', (action, fileName) => {
    expect(playerSource).toContain(`${action}: require('../../assets/animations/${fileName}')`);
    expect(fs.existsSync(path.join(mobileRoot, 'assets/animations', fileName))).toBe(true);
  });

  test('only retargets moving humanoid quaternion tracks', () => {
    expect(playerSource).toContain("parts.property === 'quaternion'");
    expect(playerSource).toContain("parts.nodeName.startsWith('J_Bip_')");
    expect(playerSource).toContain('trackHasMotion(track)');
    expect(playerSource).toContain('track.sourceBase.clone().invert().multiply(sampled)');
  });

  test('uses the shared absolute-time scheduler instead of a page-local zero deadline', () => {
    expect(playerSource).toContain("import { sharedVRMIdleActionScheduler } from './vrmIdleActionScheduler'");
    expect(playerSource).toContain('sharedVRMIdleActionScheduler.claim(nowMs)');
    expect(playerSource).not.toContain('private idleDueAt = 0');
    expect(playerSource).not.toContain('elapsed >= this.idleDueAt');
  });

  test('postpones random waiting actions around speech and explicit actions', () => {
    expect(playerSource).toContain('sharedVRMIdleActionScheduler.postpone(nowMs)');
    expect(playerSource).toContain('idleEligible !== this.wasIdleEligible');
    expect(playerSource).toMatch(/normalized === 'none' && speaking[\s\S]*?stopActive\(\)/);
  });

  test('does not start an idle GLB that finishes loading after speech begins', () => {
    expect(playerSource).toContain(
      "if (action.startsWith('waiting') && this.wasIdleEligible !== true) return;",
    );
  });

  test('lets a started speech GLB finish when React releases the action', () => {
    expect(playerSource).toContain("this.activeAction?.startsWith('waiting')");
    expect(playerSource).toMatch(/normalized === 'none'[\s\S]*?activeAction[\s\S]*?stopActive/);
    expect(playerSource).not.toMatch(/normalized === 'none' && speaking\)[\s\S]*?this\.stopActive\(\)/);
  });
});
