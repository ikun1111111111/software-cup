/**
 * Avatar model ID → VRM model file path mapping.
 *
 * All costumes are festival-only now.
 */

export const MODEL_MAP: Record<string, string> = {
  'model-1': '/models/488366049787804013.vrm',
  'model-2': '/models/4104272907947728185.vrm',
  'model-3': '/models/4353238926149796085.vrm',
};

export function getModelPath(modelId: string): string {
  return MODEL_MAP[modelId] || MODEL_MAP['model-1'];
}

/**
 * Map appearance config (skin/hair/outfit) to a VRM expression name.
 * Uses the VRM model's preset expressions.
 */
export function getExpressionForAppearance(appearance: {
  skin: string;
  hair: string;
  outfit: string;
}): string {
  // Skin determines base expression
  const skinExprMap: Record<string, string> = {
    'skin-1': 'f00',  // default
    'skin-2': 'f01',  // happy
    'skin-3': 'f02',  // relaxed
  };
  return skinExprMap[appearance.skin] || 'f00';
}

/**
 * Resolve the VRM model path for a given costume ID.
 */
export function getCostumeTexturePath(costumeId: string): string | undefined {
  const { getCostume } = require('./costumeMap');
  const costume = getCostume(costumeId);
  return costume.modelPath;
}
