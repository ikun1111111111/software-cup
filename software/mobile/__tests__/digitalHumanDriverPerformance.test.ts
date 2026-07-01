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
});
