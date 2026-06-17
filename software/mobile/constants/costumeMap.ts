export type CostumeCategory = 'festival';

export interface CostumeDef {
  id: string;
  name: string;
  category: CostumeCategory;
  description: string;
  color: string;
  modelFile: string;
}

export const COSTUMES: Record<string, CostumeDef> = {
  'festival-spring': {
    id: 'festival-spring',
    name: '锦绣红袍',
    category: 'festival',
    description: '喜庆红色，春节氛围',
    color: '#C84B31',
    modelFile: '8024308560058477433.vrm',
  },
  'festival-lantern': {
    id: 'festival-lantern',
    name: '灯彩华裳',
    category: 'festival',
    description: '暖色调，元宵灯会',
    color: '#E8A040',
    modelFile: '4353238926149796085.vrm',
  },
  'festival-qingming': {
    id: 'festival-qingming',
    name: '踏青轻衣',
    category: 'festival',
    description: '青绿色调，春意盎然',
    color: '#6A9C89',
    modelFile: '5186055420774500970.vrm',
  },
  'festival-dragon': {
    id: 'festival-dragon',
    name: '龙舟竞渡',
    category: 'festival',
    description: '蓝白配色，端午龙纹',
    color: '#3A6EA5',
    modelFile: '4104272907947728185.vrm',
  },
  'festival-midautumn': {
    id: 'festival-midautumn',
    name: '月华裳',
    category: 'festival',
    description: '桂花金+月白，中秋团圆',
    color: '#C8A951',
    modelFile: '5784779633385764689.vrm',
  },
  'festival-national': {
    id: 'festival-national',
    name: '锦绣华章',
    category: 'festival',
    description: '中国红+金，国庆庄严',
    color: '#DC4444',
    modelFile: '8511002460770470367.vrm',
  },
};

export const ALL_COSTUME_IDS = Object.keys(COSTUMES);

export function getCostume(id: string): CostumeDef {
  return COSTUMES[id] ?? COSTUMES['festival-spring'];
}
