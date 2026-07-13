import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { COSTUMES } from '../config/costumeMap';

describe('VRM costume assets', () => {
  const modelFiles = [...new Set(
    Object.values(COSTUMES).map((costume) => costume.modelFile || 'avatar.vrm'),
  )];

  it.each(modelFiles)('provides %s as a Web static asset', (modelFile) => {
    const modelPath = resolve(process.cwd(), 'public', 'models', modelFile);
    const header = readFileSync(modelPath).subarray(0, 4).toString('ascii');

    expect(header).toBe('glTF');
  });
});
