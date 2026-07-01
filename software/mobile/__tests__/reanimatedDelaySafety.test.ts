import fs from 'fs';
import path from 'path';

const filesWithAnimatedStyles = [
  'app/(tabs)/index.tsx',
  'components/home/IntroSection.tsx',
];

function extractUseAnimatedStyleBodies(source: string): string[] {
  const bodies: string[] = [];
  const marker = 'useAnimatedStyle';
  let searchFrom = 0;

  while (searchFrom < source.length) {
    const markerIndex = source.indexOf(marker, searchFrom);
    if (markerIndex === -1) break;

    const arrowIndex = source.indexOf('=>', markerIndex);
    if (arrowIndex === -1) break;

    let depth = 0;
    let end = arrowIndex;
    for (let index = arrowIndex; index < source.length; index += 1) {
      const char = source[index];
      if (char === '(' || char === '{' || char === '[') depth += 1;
      if (char === ')' || char === '}' || char === ']') depth -= 1;
      if (depth < 0) {
        end = index;
        break;
      }
    }

    bodies.push(source.slice(arrowIndex, end));
    searchFrom = end + 1;
  }

  return bodies;
}

describe('Reanimated delayed animation safety', () => {
  test('does not create withDelay animations inside animated style worklets', () => {
    const offenders = filesWithAnimatedStyles.flatMap((relativePath) => {
      const absolutePath = path.join(__dirname, '..', relativePath);
      const source = fs.readFileSync(absolutePath, 'utf8');
      return extractUseAnimatedStyleBodies(source)
        .filter((body) => body.includes('withDelay('))
        .map(() => relativePath);
    });

    expect(offenders).toEqual([]);
  });
});
