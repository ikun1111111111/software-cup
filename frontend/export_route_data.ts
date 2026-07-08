import { SPOT_META, ROUTES } from './src/components/Galgame/routeData.ts';
import * as fs from 'fs';

const data = {
  spots: Object.values(SPOT_META).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    duration: s.duration,
    icon: s.icon,
    x: s.x,
    y: s.y,
  })),
  routes: ROUTES.map(r => ({
    id: r.id,
    name: r.name,
    duration: r.duration,
    color: r.color,
    brushImage: r.brushImage,
    openingText: r.openingText,
    closingText: r.closingText,
    spots: r.spots.map(s => ({
      id: s.id,
      qa: s.qa,
    })),
  })),
};

fs.writeFileSync('../tmp_route_data.json', JSON.stringify(data, null, 2), 'utf-8');
console.log('exported to ../tmp_route_data.json');
