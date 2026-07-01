import type { Spot } from '@/api/spots';
import { CAT_COLORS } from '@/constants/scenic';
import { Colors } from '@/constants/colors';
import {
  SCENIC_COORDINATE_SOURCE,
  toScenicAmapPoint,
  type CoordinateSource,
  type MapPoint,
} from '@/utils/amapCoordinates';

export const AMAP_KEY = '69ce537355cca1a2ba0bbf3b737c5d35';
export const LINGSHAN_CENTER = { latitude: 31.4268, longitude: 120.0962 };
export type { CoordinateSource, MapPoint } from '@/utils/amapCoordinates';

export interface AmapViewRef {
  setCenter: (lat: number, lng: number, zoom?: number, source?: CoordinateSource) => void;
  drawRoute: (points: MapPoint[]) => void;
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
  routeSpotIds?: string[];
  activeSpotId?: string | null;
  style?: any;
  onMapReady?: () => void;
  onMapError?: (message: string) => void;
  showLocationControls?: boolean;
  calibrationMode?: boolean;
  calibratedCoordinates?: Record<string, { latitude: number; longitude: number }>;
  onSpotCoordinateChange?: (spotId: string, point: { latitude: number; longitude: number }) => void;
}

export function buildHTML(
  spots: Spot[],
  center: { latitude: number; longitude: number },
  zoom: number,
  postMessage: string,
  routeSpotIds: string[] = [],
  activeSpotId: string | null = null,
): string {
  const routeSet = new Set(routeSpotIds);
  const spotsJson = JSON.stringify(
    spots.map((s, i) => ({
      id: s.id,
      name: s.name,
      lat: s.latitude,
      lng: s.longitude,
      category: s.category || '',
      idx: i + 1,
      color: CAT_COLORS[s.category || ''] || Colors.gray500 || '#999',
      inRoute: routeSet.has(s.id),
      active: activeSpotId === s.id,
    })),
  );
  const mapCenter = toScenicAmapPoint(center);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  * { margin:0; padding:0; }
  html,body,#map { width:100%; height:100%; }
  body {
    overflow:hidden;
    background:#e8efe8;
    font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;
  }
  #map {
    background:#e8efe8;
  }
  #fallback {
    position:absolute; inset:0; z-index:20;
    display:none; align-items:center; justify-content:center;
    background:
      radial-gradient(circle at 18% 20%, rgba(200,75,49,0.18), transparent 22%),
      radial-gradient(circle at 84% 24%, rgba(106,156,137,0.22), transparent 24%),
      linear-gradient(135deg, #eef3e8 0%, #d9e7da 54%, #f8f1df 100%);
  }
  body.map-failed #fallback { display:flex; }
  .fallback-panel {
    width:78%; max-width:300px;
    padding:18px 16px; border-radius:18px;
    background:rgba(255,255,255,0.82);
    border:1px solid rgba(106,156,137,0.24);
    box-shadow:0 12px 30px rgba(42,37,32,0.12);
    text-align:left;
  }
  .fallback-title {
    font-size:18px; line-height:24px; color:#2A2520; font-weight:800;
    letter-spacing:1px;
  }
  .fallback-copy {
    margin-top:8px; font-size:12px; line-height:19px; color:#5C554C;
  }
  .fallback-route {
    position:relative; margin-top:18px; height:96px;
    border-radius:14px; overflow:hidden;
    background:rgba(247,245,240,0.82);
  }
  .fallback-route svg { width:100%; height:100%; display:block; }
  .fallback-badge {
    position:absolute; left:12px; bottom:10px;
    padding:4px 8px; border-radius:999px;
    background:#C84B31; color:#fff; font-size:11px; font-weight:700;
  }
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
  .spot-dot.route {
    width:30px; height:30px; border-radius:15px;
    border-color:#F7E3A0;
    box-shadow:0 0 0 4px rgba(200,136,46,0.2),0 2px 8px rgba(0,0,0,0.32);
  }
  .spot-dot.active {
    width:34px; height:34px; border-radius:17px;
    border-color:#fff;
    background:#C8882E!important;
    box-shadow:0 0 0 5px rgba(200,136,46,0.28),0 4px 12px rgba(0,0,0,0.36);
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
<div id="fallback">
  <div class="fallback-panel">
    <div class="fallback-title">灵山导览地图</div>
    <div class="fallback-copy">真实地图暂时没有连上，已切换离线导览底图。小灵仍可继续推荐路线和讲解景点。</div>
    <div class="fallback-route">
      <svg viewBox="0 0 280 96" aria-hidden="true">
        <path d="M22 68 C70 16, 122 88, 170 36 C206 0, 236 22, 258 14" fill="none" stroke="#6A9C89" stroke-width="7" stroke-linecap="round" opacity="0.26"/>
        <path d="M22 68 C70 16, 122 88, 170 36 C206 0, 236 22, 258 14" fill="none" stroke="#C84B31" stroke-width="3" stroke-linecap="round" stroke-dasharray="8 8"/>
        <circle cx="22" cy="68" r="8" fill="#6A9C89"/>
        <circle cx="98" cy="54" r="8" fill="#B87333"/>
        <circle cx="170" cy="36" r="8" fill="#C84B31"/>
        <circle cx="258" cy="14" r="8" fill="#2A4D6E"/>
      </svg>
      <div class="fallback-badge">离线可讲解</div>
    </div>
  </div>
</div>
<script>
function wgs84ToGcj02(lat,lng){
  var a=6378245.0,ee=0.00669342162296594323;
  if(lng<72.004||lng>137.8347||lat<0.8293||lat>55.8271) return {latitude:lat,longitude:lng};
  function transformLat(x,y){
    var ret=-100.0+2.0*x+3.0*y+0.2*y*y+0.1*x*y+0.2*Math.sqrt(Math.abs(x));
    ret+=((20.0*Math.sin(6.0*x*Math.PI)+20.0*Math.sin(2.0*x*Math.PI))*2.0)/3.0;
    ret+=((20.0*Math.sin(y*Math.PI)+40.0*Math.sin((y/3.0)*Math.PI))*2.0)/3.0;
    ret+=((160.0*Math.sin((y/12.0)*Math.PI)+320*Math.sin((y*Math.PI)/30.0))*2.0)/3.0;
    return ret;
  }
  function transformLng(x,y){
    var ret=300.0+x+2.0*y+0.1*x*x+0.1*x*y+0.1*Math.sqrt(Math.abs(x));
    ret+=((20.0*Math.sin(6.0*x*Math.PI)+20.0*Math.sin(2.0*x*Math.PI))*2.0)/3.0;
    ret+=((20.0*Math.sin(x*Math.PI)+40.0*Math.sin((x/3.0)*Math.PI))*2.0)/3.0;
    ret+=((150.0*Math.sin((x/12.0)*Math.PI)+300.0*Math.sin((x/30.0)*Math.PI))*2.0)/3.0;
    return ret;
  }
  var dLat=transformLat(lng-105.0,lat-35.0);
  var dLng=transformLng(lng-105.0,lat-35.0);
  var radLat=(lat/180.0)*Math.PI;
  var magic=Math.sin(radLat);
  magic=1-ee*magic*magic;
  var sqrtMagic=Math.sqrt(magic);
  dLat=(dLat*180.0)/(((a*(1-ee))/(magic*sqrtMagic))*Math.PI);
  dLng=(dLng*180.0)/((a/sqrtMagic)*Math.cos(radLat)*Math.PI);
  return {latitude:lat+dLat,longitude:lng+dLng};
}

function toAmapPoint(point, source){
  if(source === 'wgs84' || point.source === 'wgs84'){
    return wgs84ToGcj02(point.latitude, point.longitude);
  }
  return {latitude:point.latitude,longitude:point.longitude};
}

function toScenicAmapPoint(point, source){
  return toAmapPoint(point, source || point.source || '${SCENIC_COORDINATE_SOURCE}');
}

var map, markers=[], userMarker=null, routeLine=null;
var SPOTS=${spotsJson};
var _mapInited=false;
var _readyPosted=false;

function postToApp(data){
  try{
    if(window.ReactNativeWebView){
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    } else if(window.parent && window.parent !== window){
      window.parent.postMessage(data,'*');
    }
  }catch(e){}
}

function reportReady(){
  if(_readyPosted) return;
  _readyPosted=true;
  document.body.classList.remove('map-failed');
  postToApp({type:'mapReady'});
}

function reportError(message){
  document.body.classList.add('map-failed');
  postToApp({type:'mapError',message:message || '地图服务暂时不可用'});
}

function initMap(){
  if(_mapInited) return;
  _mapInited=true;
  try{
    map=new AMap.Map('map',{
      center:[${mapCenter.longitude},${mapCenter.latitude}],
      zoom:${zoom},
      zooms:[13,18],
      resizeEnable:true,
      touchZoom:true,
      scrollWheel:true,
      viewMode:'2D',
      mapStyle:'amap://styles/normal',
      showIndoorMap:false,
      features:['bg','road','building','point'],
    });
    map.addControl(new AMap.Scale({position:'LB'}));
    map.on('complete', reportReady);
  }catch(e){
    reportError('地图初始化失败');
    return;
  }

  SPOTS.forEach(function(s){
    if(s.lat == null || s.lng == null) return;
    var point=toScenicAmapPoint({latitude:s.lat,longitude:s.lng});
    var dotSize=s.active?34:(s.inRoute?30:26);
    var dotRadius=dotSize/2;
    var dotClass='spot-dot'+(s.inRoute?' route':'')+(s.active?' active':'');
    var content='<div class="spot-marker" data-id="'+s.id+'">'
      +'<div class="'+dotClass+'" style="background:'+s.color+'">'+s.idx+'</div>'
      +'<div class="spot-label">'+s.name+'</div></div>';

    var marker=new AMap.Marker({
      position:[point.longitude,point.latitude],
      content:content,
      offset:new AMap.Pixel(-dotRadius,-dotRadius),
      extData:s,
      zIndex:s.active?90:(s.inRoute?70:50),
    });
    marker.on('click',function(){
      ${postMessage};
    });
    map.add(marker);
    markers.push(marker);
  });

  if(markers.length>0){
    try{ map.setFitView(markers,false,[118,48,240,48]); }catch(e){}
  }

}

function setUserLocation(lat,lng){
  if(!map) return;
  var point=wgs84ToGcj02(lat,lng);
  if(userMarker){ map.remove(userMarker); }
  userMarker=new AMap.Marker({
    position:[point.longitude,point.latitude],
    content:'<div style="position:relative"><div class="user-ring"></div><div class="user-dot"></div></div>',
    offset:new AMap.Pixel(-7,-7),
    zIndex:100,
  });
  map.add(userMarker);
}

function setCenter(lat,lng,z,source){
  if(!map) return;
  var point=source ? toAmapPoint({latitude:lat,longitude:lng}, source) : toScenicAmapPoint({latitude:lat,longitude:lng});
  map.setCenter(new AMap.LngLat(point.longitude,point.latitude));
  if(z) map.setZoom(z);
}

function drawRoute(points){
  if(!map) return;
  if(routeLine){ map.remove(routeLine); }
  var path=points.map(function(p){
    var point=p.source ? toAmapPoint(p) : toScenicAmapPoint(p);
    return new AMap.LngLat(point.longitude,point.latitude);
  });
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
  if(!map) return;
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
    if(d.cmd==='setCenter') setCenter(d.lat,d.lng,d.zoom,d.source);
    else if(d.cmd==='setUserLocation') setUserLocation(d.lat,d.lng);
    else if(d.cmd==='drawRoute') drawRoute(d.points);
    else if(d.cmd==='clearRoute') clearRoute();
  }catch(ex){}
});
</script>
<script>
setTimeout(function(){
  if(!window.AMap && !_mapInited){
    reportError('地图脚本加载超时');
  }
}, 7000);
</script>
<script src="https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Scale,AMap.ToolBar&callback=initMap" onerror="reportError('地图脚本加载失败')"></script>
</body>
</html>`;
}
