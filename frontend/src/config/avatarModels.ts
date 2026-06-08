/**
 * Avatar model ID → Live2D model file path mapping.
 *
 * To add a new model:
 * 1. Place the .model3.json file under public/models/<name>/
 * 2. Add a new entry here mapping the model ID to the path
 */

export const MODEL_MAP: Record<string, string> = {
  'model-1': '/models/haru/haru_greeter_t03.model3.json',
  'model-2': '/models/haru/haru_greeter_t03.model3.json',
  'model-3': '/models/haru/haru_greeter_t03.model3.json',
};

export function getModelPath(modelId: string): string {
  return MODEL_MAP[modelId] || MODEL_MAP['model-1'];
}

/**
 * Map appearance config (skin/hair/outfit) to a Live2D expression name.
 * Uses the haru model's 8 expressions (f00–f07) to create visible differences.
 */
export function getExpressionForAppearance(appearance: {
  skin: string;
  hair: string;
  outfit: string;
}): string {
  // Skin determines base expression
  const skinExprMap: Record<string, string> = {
    'skin-1': 'f00',  // default
    'skin-2': 'f01',  // brighter
    'skin-3': 'f02',  // warm
  };
  return skinExprMap[appearance.skin] || 'f00';
}

/**
 * Resolve the texture path for a given costume ID.
 * Returns undefined for daily-classic (uses default model textures).
 */
export function getCostumeTexturePath(costumeId: string): string | undefined {
  // Lazy import to avoid circular dependency
  const { getCostume } = require('./costumeMap');
  const costume = getCostume(costumeId);
  if (costume.id === 'daily-classic') return undefined;
  return costume.texturePath;
}
