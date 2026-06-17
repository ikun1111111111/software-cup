import type { Spot } from '@/api/spots';
import { CAT_COLORS } from '@/constants/scenic';
import { Colors } from '@/constants/colors';

export const AMAP_KEY = '494e984ed64dac1da5265fdef139bb48';
export const LINGSHAN_CENTER = { latitude: 31.424, longitude: 120.355 };

export interface AmapViewRef {
  setCenter: (lat: number, lng: number, zoom?: number) => void;
  drawRoute: (points: { latitude: number; longitude: number }[]) => void;
  clearRoute: () => void;
}

export interface AmapViewProps {
  spots: Spot[];
  center?: { latitude: number; longitude: number };
  zoom?: number;
  height?: number;
  onSpotTap?: (spot: Spot) => void;
  showUserLocation?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
  style?: any;
}

export function buildHTML(spots: Spot[], center: { latitude: number; longitude: number }, zoom: number, postMessage: string): string {
  const spotsJson = JSON.stringify(
    spots.map((s, i) => ({
      id: s.id,
      name: s.name,
      lat: s.latitude,
      lng: s.longitude,
      category: s.category || '',
      idx: i + 1,
      color: CAT_COLORS[s.category || ''] || Colors.gray500 || '#999',
    })),
  );

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  * { margin:0; padding:0; }
  html,body,#map { width:100%; height:100%; }
  .spot-marker {
    display:flex; flex-direction:column; align-items:center;
    cursor:pointer; -webkit-tap-highlight-color:transparent;
  }
  .spot-dot {
    width:26px; height:26px; border-radius:13px;
    border:2.5px solid #fff;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
    font-size:10px; font-weight:700; color:#fff;
    font-family:-apple-system,sans-serif;
  }
  .spot-label {
    margin-top:2px; padding:2px 5px;
    background:rgba(255,255,255,0.92);
    border-radius:3px; border:0.5px solid rgba(0,0,0,0.08);
    font-size:10px; font-weight:500; color:#333;
    white-space:nowrap; max-width:80px; overflow:hidden; text-overflow:ellipsis;
    font-family:-apple-system,sans-serif;
  }
  .user-dot {
    width:14px; height:14px; border-radius:7px;
    background:#4A90D9; border:2.5px solid #fff;
    box-shadow:0 0 8px rgba(74,144,217,0.5);
  }
  .user-ring {
    position:absolute; top:-8px; left:-8px;
    width:30px; height:30px; border-radius:15px;
    background:rgba(74,144,217,0.18);
    animation:userPulse 2s ease-out infinite;
  }
  @keyframes userPulse {
    0%{transform:scale(0.8);opacity:0.8}
    100%{transform:scale(2);opacity:0}
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
var map, markers=[], userMarker=null, routeLine=null;
var SPOTS=${spotsJson};
var _mapInited=false;

function initMap(){
  if(_mapInited) return;
  _mapInited=true;
  map=new AMap.Map('map',{
    center:[${center.longitude},${center.latitude}],
    zoom:${zoom},
    resizeEnable:true,
    touchZoom:true,
    scrollWheel:true,
    viewMode:'2D',
  });

  SPOTS.forEach(function(s){
    var content='<div class="spot-marker" data-id="'+s.id+'">'
      +'<div class="spot-dot" style="background:'+s.color+'">'+s.idx+'</div>'
      +'<div class="spot-label">'+s.name+'</div></div>';

    var marker=new AMap.Marker({
      position:[s.lng,s.lat],
      content:content,
      offset:new AMap.Pixel(-13,-26),
      extData:s,
    });
    marker.on('click',function(){
      ${postMessage};
    });
    map.add(marker);
    markers.push(marker);
  });

  if(SPOTS.length>0){
    try{ map.setFitView(null,false,[60,60,60,60]); }catch(e){}
  }
}

function setUserLocation(lat,lng){
  if(userMarker){ map.remove(userMarker); }
  userMarker=new AMap.Marker({
    position:[lng,lat],
    content:'<div style="position:relative"><div class="user-ring"></div><div class="user-dot"></div></div>',
    offset:new AMap.Pixel(-7,-7),
    zIndex:100,
  });
  map.add(userMarker);
}

function setCenter(lat,lng,z){
  map.setCenter(new AMap.LngLat(lng,lat));
  if(z) map.setZoom(z);
}

function drawRoute(points){
  if(routeLine){ map.remove(routeLine); }
  var path=points.map(function(p){ return new AMap.LngLat(p.longitude,p.latitude); });
  routeLine=new AMap.Polyline({
    path:path,
    strokeColor:'#6A9C89',
    strokeWeight:4,
    strokeStyle:'dashed',
    strokeDasharray:[8,4],
  });
  map.add(routeLine);
  try{ map.setFitView(routeLine,false,[60,60,60,60]); }catch(e){}
}

function clearRoute(){
  if(routeLine){ map.remove(routeLine); routeLine=null; }
}

window.initMap=initMap;
window.setUserLocation=setUserLocation;
window.setCenter=setCenter;
window.drawRoute=drawRoute;
window.clearRoute=clearRoute;

window.addEventListener('message',function(e){
  try{
    var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(d.cmd==='setCenter') setCenter(d.lat,d.lng,d.zoom);
    else if(d.cmd==='setUserLocation') setUserLocation(d.lat,d.lng);
    else if(d.cmd==='drawRoute') drawRoute(d.points);
    else if(d.cmd==='clearRoute') clearRoute();
  }catch(ex){}
});
</script>
<script src="https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Scale,AMap.ToolBar&callback=initMap"></script>
</body>
</html>`;
}
