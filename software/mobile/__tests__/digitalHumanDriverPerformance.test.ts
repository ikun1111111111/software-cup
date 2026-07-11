import fs from 'fs';
import path from 'path';

describe('digital human driver performance guard', () => {
  test('does not drive lookUp animation with per-frame React state timers', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useDigitalHumanDriver.ts'),
      'utf8',
    );

    expect(source).not.toContain('computeLookUpHeadRotation');
    expect(source).not.toMatch(/setInterval\s*\(/);
  });

  test('pairs demo actions with their intended facial expressions', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useDigitalHumanDriver.ts'),
      'utf8',
    );

    expect(source).toMatch(/case 'thinking':[\s\S]*?return 'thinking'/);
    expect(source).toMatch(/case 'wave':[\s\S]*?case 'showcase':[\s\S]*?return 'happy'/);
    expect(source).toMatch(/case 'explain':[\s\S]*?return expression === 'neutral' \? 'relaxed' : expression/);
  });
});
