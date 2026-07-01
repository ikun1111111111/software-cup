import fs from 'fs';
import path from 'path';

describe('home VRM greeting action', () => {
  test('starts the homepage greeting with an explicit wave action', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(tabs)/index.tsx'),
      'utf8',
    );

    expect(source).toMatch(/speakWithDigitalHuman\('欢迎来到灵山胜境[\s\S]*?action: 'wave'[\s\S]*?actionDuration: 1600[\s\S]*?replaceCurrent: true/s);
  });
});
