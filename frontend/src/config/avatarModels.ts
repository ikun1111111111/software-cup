/**
 * Avatar model ID → VRM model file mapping.
 *
 * To add a new model:
 * 1. Place the .vrm file under public/models/
 * 2. Add a new entry here mapping the model ID to the file name
 */

export const MODEL_MAP: Record<string, string> = {
  'model-1': '/models/avatar.vrm',
  'model-2': '/models/488366049787804013.vrm',
  'model-3': '/models/8511002460770470367.vrm',
};

export function getModelPath(modelId: string): string {
  return MODEL_MAP[modelId] || MODEL_MAP['model-1'];
}

/**
 * Map appearance config (skin/hair/outfit) to an expression name.
 * Uses the haru model's 8 expressions (f00–f07) to create visible differences.
 */
export function getExpressionForAppearance(appearance: {
  skin: string;
  hair: string;
  outfit: string;
}): string {
  // Skin determines base expression
  const skinExprMap: Record<string, string> = {
    'skin-1': 'f00', // default
    'skin-2': 'f01', // brighter
    'skin-3': 'f02', // warm
  };
  return skinExprMap[appearance.skin] || 'f00';
}

/**
 * Resolve the texture path for a given costume ID.
 * Returns undefined for daily-artistic (uses default model textures).
 */
export function getCostumeTexturePath(costumeId: string): string | undefined {
  // Lazy import to avoid circular dependency
  const { getCostume } = require('./costumeMap');
  const costume = getCostume(costumeId);
  if (costume.id === 'daily-artistic') return undefined;
  return costume.texturePath;
}
