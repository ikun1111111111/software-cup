# 景区导览地图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在"云游胜境"模块新增灵山景区导览地图，支持高德地图渲染、GPS 实时定位、景点标记、步行导航路线。

**Architecture:** 后端 `ScenicSpot` 模型扩展经纬度字段，前端通过 `@amap/amap-jsapi-loader` 加载高德 JS API 2.0，使用浏览器 Geolocation API 获取用户位置，AMap Walking 插件计算步行路线。

**Tech Stack:** React 18, TypeScript, Vite, @amap/amap-jsapi-loader, FastAPI, SQLAlchemy, Alembic

---

## File Structure

### 新建文件

| 文件 | 职责 |
|------|------|
| `frontend/src/hooks/useGeolocation.ts` | GPS 定位 hook，封装 Geolocation API |
| `frontend/src/components/map/AMapContainer.tsx` | 高德地图初始化、销毁、实例管理 |
| `frontend/src/components/map/SpotMarkers.tsx` | 景点标记点渲染，点击回调 |
| `frontend/src/components/map/UserPosition.tsx` | 用户蓝点 + "我的位置"按钮 |
| `frontend/src/components/map/RoutePanel.tsx` | 路线面板：距离/时间/导航控制 |
| `frontend/src/pages/tourist/MapGuidePage.tsx` | 地图导览主页面，组合所有组件 |
| `backend/alembic/versions/002_add_spot_coords.py` | 数据库迁移：ScenicSpot 加 lat/lng |

### 修改文件

| 文件 | 改动 |
|------|------|
| `backend/app/models/tourist.py` | ScenicSpot 加 latitude/longitude 字段 |
| `backend/app/api/spots.py` | SpotOut schema 加 latitude/longitude |
| `backend/data/ling_sheng_jing_spots.json` | 补充各景点 GCJ-02 坐标 |
| `frontend/src/api/spots.ts` | Spot 接口加 latitude/longitude |
| `frontend/src/App.tsx` | 添加 /map 路由 |
| `frontend/package.json` | 添加 @amap/amap-jsapi-loader |
| `frontend/.env` | 添加高德 Key 占位 |

---

### Task 1: 后端模型扩展 — ScenicSpot 加坐标字段

**Files:**
- Modify: `backend/app/models/tourist.py:25-37`
- Create: `backend/alembic/versions/002_add_spot_coords.py`

- [ ] **Step 1: 修改 ScenicSpot 模型**

在 `backend/app/models/tourist.py` 的 `ScenicSpot` 类中，在 `is_active` 字段之前添加：

```python
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, comment="纬度 GCJ-02")
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, comment="经度 GCJ-02")
```

- [ ] **Step 2: 生成 Alembic 迁移**

```bash
cd backend
alembic revision --autogenerate -m "add_spot_coords"
```

检查生成的迁移文件 `backend/alembic/versions/002_add_spot_coords.py`，确认包含 `add_column('scenic_spots', Column('latitude', Float))` 和 `add_column('scenic_spots', Column('longitude', Float))`。

- [ ] **Step 3: 运行迁移**

```bash
cd backend
alembic upgrade head
```

Expected: `Running upgrade 001 -> 002, add_spot_coords`

- [ ] **Step 4: 验证**

```bash
cd backend
python -c "from app.models.tourist import ScenicSpot; print(hasattr(ScenicSpot, 'latitude'), hasattr(ScenicSpot, 'longitude'))"
```

Expected: `True True`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/tourist.py backend/alembic/versions/002_add_spot_coords.py
git commit -m "feat: add latitude/longitude fields to ScenicSpot model"
```

---

### Task 2: 后端 API 扩展 — 返回坐标数据

**Files:**
- Modify: `backend/app/api/spots.py:13-22`

- [ ] **Step 1: 修改 SpotOut schema**

在 `backend/app/api/spots.py` 的 `SpotOut` 类中添加坐标字段：

```python
class SpotOut(BaseModel):
    id: str
    name: str
    category: str
    tags: list[str] | None
    overview: str
    qr_code: str | None
    latitude: float | None = None
    longitude: float | None = None

    class Config:
        from_attributes = True
```

- [ ] **Step 2: 验证 API 返回坐标字段**

启动后端服务：

```bash
cd backend
python run.py
```

在另一个终端：

```bash
curl http://localhost:8000/api/spots | python -m json.tool | head -20
```

Expected: 每个 spot 对象中包含 `"latitude": null, "longitude": null` 字段。

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/spots.py
git commit -m "feat: expose latitude/longitude in spots API response"
```

---

### Task 3: 种子数据 — 补充灵山景点坐标

**Files:**
- Modify: `backend/data/ling_sheng_jing_spots.json`

- [ ] **Step 1: 为每个景点添加坐标**

在 `backend/data/ling_sheng_jing_spots.json` 中，为每个 spot 对象添加 `latitude` 和 `longitude` 字段。坐标使用 GCJ-02 坐标系：

```json
{
  "id": "ling-shan-da-fo",
  "name": "灵山大佛",
  "latitude": 31.4250,
  "longitude": 120.3550,
  ...
}
```

完整坐标表：

| 景点 ID | 纬度 | 经度 |
|---------|------|------|
| ling-shan-da-fo | 31.4250 | 120.3550 |
| fan-gong | 31.4280 | 120.3580 |
| jiu-long-guan-yu | 31.4220 | 120.3520 |
| wu-yin-tan-cheng | 31.4200 | 120.3500 |
| xiang-fu-chan-si | 31.4240 | 120.3560 |
| fo-shou-guang-chang | 31.4230 | 120.3530 |
| bai-zi-xi-mi-le | 31.4235 | 120.3540 |
| san-sheng-dian | 31.4210 | 120.3510 |
| ling-shan-jing-she | 31.4255 | 120.3570 |
| puti-da-dao | 31.4245 | 120.3555 |
| man-fei-long-ta | 31.4260 | 120.3600 |

- [ ] **Step 2: 重新导入种子数据**

```bash
cd backend
python seed_spots.py
```

Expected: 输出导入成功，无报错。

- [ ] **Step 3: 验证 API 返回坐标**

```bash
curl http://localhost:8000/api/spots | python -c "import sys,json; spots=json.load(sys.stdin); [print(f'{s[\"name\"]}: {s.get(\"latitude\")}, {s.get(\"longitude\")}') for s in spots[:3]]"
```

Expected: 输出景点名称和对应坐标（非 null）。

- [ ] **Step 4: Commit**

```bash
git add backend/data/ling_sheng_jing_spots.json
git commit -m "data: add GCJ-02 coordinates for Lingshan scenic spots"
```

---

### Task 4: 前端依赖安装 — 高德地图 SDK

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/.env`

- [ ] **Step 1: 安装高德地图加载器**

```bash
cd frontend
npm install @amap/amap-jsapi-loader
```

- [ ] **Step 2: 创建环境变量文件**

创建 `frontend/.env`：

```env
VITE_AMAP_KEY=your_amap_key_here
VITE_AMAP_SECURITY_CODE=your_amap_security_code_here
```

创建 `frontend/.env.example`：

```env
VITE_AMAP_KEY=
VITE_AMAP_SECURITY_CODE=
```

- [ ] **Step 3: 验证安装**

```bash
cd frontend
node -e "const m = require('@amap/amap-jsapi-loader'); console.log(typeof m.default)"
```

Expected: `function`

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/.env.example
git commit -m "chore: add @amap/amap-jsapi-loader dependency"
```

---

### Task 5: 前端 API 类型扩展

**Files:**
- Modify: `frontend/src/api/spots.ts:1-25`

- [ ] **Step 1: 扩展 Spot 接口**

修改 `frontend/src/api/spots.ts`，在 `Spot` 接口中添加坐标字段：

```typescript
export interface Spot {
  id: string;
  name: string;
  category: string;
  tags: string[] | null;
  overview: string;
  qr_code: string | null;
  latitude: number | null;
  longitude: number | null;
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/spots.ts
git commit -m "feat: add latitude/longitude to Spot API type"
```

---

### Task 6: useGeolocation Hook

**Files:**
- Create: `frontend/src/hooks/useGeolocation.ts`

- [ ] **Step 1: 编写 useGeolocation hook**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: true,
    error: null,
  });
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, loading: false, error: '浏览器不支持定位' }));
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState((s) => ({
          ...s,
          loading: false,
          error: err.code === 1 ? '已拒绝定位授权' : '定位失败',
        }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return state;
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd frontend
npx tsc --noEmit src/hooks/useGeolocation.ts
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useGeolocation.ts
git commit -m "feat: add useGeolocation hook for GPS tracking"
```

---

### Task 7: AMapContainer 组件

**Files:**
- Create: `frontend/src/components/map/AMapContainer.tsx`

- [ ] **Step 1: 编写地图容器组件**

```tsx
import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

export interface AMapContextValue {
  map: AMap.Map | null;
  AMap: typeof AMap | null;
  ready: boolean;
}

export const AMapContext = createContext<AMapContextValue>({
  map: null,
  AMap: null,
  ready: false,
});

export const useAMap = () => useContext(AMapContext);

interface AMapContainerProps {
  center?: [number, number];
  zoom?: number;
  children?: React.ReactNode;
}

const AMapContainer: React.FC<AMapContainerProps> = ({
  center = [120.355, 31.424],
  zoom = 16,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<AMapContextValue>({
    map: null,
    AMap: null,
    ready: false,
  });

  useEffect(() => {
    let mapInstance: AMap.Map | null = null;

    AMapLoader.load({
      key: import.meta.env.VITE_AMAP_KEY || '',
      version: '2.0',
      plugins: ['AMap.Walking', 'AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation'],
    })
      .then((AMap) => {
        if (!containerRef.current) return;
        mapInstance = new AMap.Map(containerRef.current, {
          center,
          zoom,
          viewMode: '2D',
          resizeEnable: true,
        });
        setMapState({ map: mapInstance, AMap, ready: true });
      })
      .catch((err) => {
        console.error('AMap load failed:', err);
      });

    return () => {
      mapInstance?.destroy();
    };
  }, []);

  return (
    <AMapContext.Provider value={mapState}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      >
        {mapState.ready && children}
      </div>
    </AMapContext.Provider>
  );
};

export default AMapContainer;
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/map/AMapContainer.tsx
git commit -m "feat: add AMapContainer component with AMap JS API 2.0"
```

---

### Task 8: SpotMarkers 组件

**Files:**
- Create: `frontend/src/components/map/SpotMarkers.tsx`

- [ ] **Step 1: 编写景点标记组件**

```tsx
import React, { useEffect, useRef } from 'react';
import { useAMap } from './AMapContainer';
import type { Spot } from '../../api/spots';

interface SpotMarkersProps {
  spots: Spot[];
  onSpotClick?: (spot: Spot) => void;
}

const SpotMarkers: React.FC<SpotMarkersProps> = ({ spots, onSpotClick }) => {
  const { map, AMap } = useAMap();
  const markersRef = useRef<AMap.Marker[]>([]);

  useEffect(() => {
    if (!map || !AMap || spots.length === 0) return;

    const markers = spots
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((spot) => {
        const marker = new AMap.Marker({
          position: new AMap.LngLat(spot.longitude!, spot.latitude!),
          title: spot.name,
          content: `<div style="
            display:flex;align-items:center;gap:4px;
            background:#fff;border:2px solid #C84B31;border-radius:16px;
            padding:4px 10px;font-size:12px;font-weight:600;color:#1A1614;
            box-shadow:0 2px 8px rgba(0,0,0,0.15);white-space:nowrap;
            font-family:var(--font-serif),serif;
          ">
            <span style="color:#C84B31;font-size:14px;">●</span>
            ${spot.name}
          </div>`,
          offset: new AMap.Pixel(-40, -16),
        });

        marker.on('click', () => {
          onSpotClick?.(spot);
        });

        return marker;
      });

    markers.forEach((m) => m.setMap(map));
    markersRef.current = markers;

    return () => {
      markers.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, AMap, spots, onSpotClick]);

  return null;
};

export default SpotMarkers;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/map/SpotMarkers.tsx
git commit -m "feat: add SpotMarkers component for scenic spot markers on map"
```

---

### Task 9: UserPosition 组件

**Files:**
- Create: `frontend/src/components/map/UserPosition.tsx`

- [ ] **Step 1: 编写用户定位组件**

```tsx
import React, { useEffect, useRef } from 'react';
import { useAMap } from './AMapContainer';
import type { GeolocationState } from '../../hooks/useGeolocation';

interface UserPositionProps {
  location: GeolocationState;
  onLocate?: () => void;
}

const UserPosition: React.FC<UserPositionProps> = ({ location, onLocate }) => {
  const { map, AMap } = useAMap();
  const markerRef = useRef<AMap.Marker | null>(null);

  useEffect(() => {
    if (!map || !AMap) return;

    if (location.latitude == null || location.longitude == null) return;

    const pos = new AMap.LngLat(location.longitude, location.latitude);

    if (!markerRef.current) {
      markerRef.current = new AMap.Marker({
        position: pos,
        content: `<div style="
          width:16px;height:16px;border-radius:50%;
          background:#1890FF;border:3px solid #fff;
          box-shadow:0 0 8px rgba(24,144,255,0.5);
        "></div>`,
        offset: new AMap.Pixel(-8, -8),
        zIndex: 200,
      });
      markerRef.current.setMap(map);
    } else {
      markerRef.current.setPosition(pos);
    }
  }, [map, AMap, location.latitude, location.longitude]);

  const handleLocate = () => {
    if (map && location.latitude != null && location.longitude != null) {
      map.setZoomAndCenter(17, [location.longitude, location.latitude]);
    }
    onLocate?.();
  };

  return (
    <button
      onClick={handleLocate}
      disabled={location.loading || !!location.error}
      style={{
        position: 'absolute',
        bottom: 140,
        right: 16,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: 'none',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        color: location.error ? '#ccc' : '#1890FF',
      }}
      title="我的位置"
    >
      ◎
    </button>
  );
};

export default UserPosition;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/map/UserPosition.tsx
git commit -m "feat: add UserPosition component with GPS blue dot and locate button"
```

---

### Task 10: RoutePanel 组件

**Files:**
- Create: `frontend/src/components/map/RoutePanel.tsx`

- [ ] **Step 1: 编写路线面板组件**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { useAMap } from './AMapContainer';

interface RoutePanelProps {
  from: { lat: number; lng: number } | null;
  to: { lat: number; lng: number; name: string } | null;
  onClose?: () => void;
}

interface RouteInfo {
  distance: number;
  time: number;
}

const RoutePanel: React.FC<RoutePanelProps> = ({ from, to, onClose }) => {
  const { map, AMap } = useAMap();
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const polylineRef = useRef<AMap.Polyline | null>(null);

  useEffect(() => {
    if (!map || !AMap || !from || !to) {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      setRouteInfo(null);
      return;
    }

    const walking = new AMap.Walking({ map });
    const fromLngLat = new AMap.LngLat(from.lng, from.lat);
    const toLngLat = new AMap.LngLat(to.lng, to.lat);

    walking.search(fromLngLat, toLngLat, (status: string, result: any) => {
      if (status === 'complete' && result.routes?.length > 0) {
        const route = result.routes[0];
        setRouteInfo({
          distance: route.distance,
          time: route.time,
        });

        const path = route.steps?.flatMap((step: any) =>
          step.path?.map((p: any) => new AMap.LngLat(p.lng, p.lat)) || []
        ) || [];

        if (polylineRef.current) polylineRef.current.setMap(null);
        polylineRef.current = new AMap.Polyline({
          path,
          strokeColor: '#1890FF',
          strokeWeight: 6,
          strokeOpacity: 0.7,
          lineJoin: 'round',
          map,
        });

        map.setFitView([polylineRef.current], false, [60, 60, 180, 60]);
      }
    });

    return () => {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    };
  }, [map, AMap, from, to]);

  if (!to) return null;

  const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`);
  const formatTime = (s: number) => {
    const min = Math.ceil(s / 60);
    return min < 60 ? `约${min}分钟` : `约${Math.floor(min / 60)}小时${min % 60}分钟`;
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fff',
      borderRadius: '12px 12px 0 0',
      padding: '16px 20px',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.1)',
      zIndex: 20,
      fontFamily: 'var(--font-serif), serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1614' }}>
          → {to.name}
        </span>
        <button
          onClick={() => { polylineRef.current?.setMap(null); onClose?.(); }}
          style={{
            border: 'none', background: 'none', fontSize: 18,
            color: '#999', cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      {routeInfo && (
        <div style={{ display: 'flex', gap: 24, color: '#666', fontSize: 14 }}>
          <span>步行 {formatDistance(routeInfo.distance)}</span>
          <span>{formatTime(routeInfo.time)}</span>
        </div>
      )}
      {!routeInfo && (
        <div style={{ color: '#999', fontSize: 14 }}>正在规划路线...</div>
      )}
    </div>
  );
};

export default RoutePanel;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/map/RoutePanel.tsx
git commit -m "feat: add RoutePanel component with walking route display"
```

---

### Task 11: MapGuidePage 主页面

**Files:**
- Create: `frontend/src/pages/tourist/MapGuidePage.tsx`

- [ ] **Step 1: 编写地图导览页面**

```tsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import AMapContainer from '../../components/map/AMapContainer';
import SpotMarkers from '../../components/map/SpotMarkers';
import UserPosition from '../../components/map/UserPosition';
import RoutePanel from '../../components/map/RoutePanel';
import { useGeolocation } from '../../hooks/useGeolocation';
import { listSpots, type Spot } from '../../api/spots';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const MapGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const geo = useGeolocation();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [navigating, setNavigating] = useState(false);

  React.useEffect(() => {
    listSpots().then(setSpots).catch(() => setSpots([]));
  }, []);

  const handleSpotClick = useCallback((spot: Spot) => {
    setSelectedSpot(spot);
    setNavigating(false);
  }, []);

  const handleNavigate = useCallback(() => {
    setNavigating(true);
  }, []);

  const handleCloseRoute = useCallback(() => {
    setNavigating(false);
  }, []);

  const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const spotDistance =
    selectedSpot && geo.latitude != null && geo.longitude != null &&
    selectedSpot.latitude != null && selectedSpot.longitude != null
      ? calcDistance(geo.latitude, geo.longitude, selectedSpot.latitude, selectedSpot.longitude)
      : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw', position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 顶部栏 */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center',
        padding: '0 16px', background: '#fff',
        borderBottom: '1px solid #f0f0f0', zIndex: 30,
        fontFamily: 'var(--font-serif), serif',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            border: 'none', background: 'none', fontSize: 18,
            cursor: 'pointer', color: '#333', padding: '4px 8px',
          }}
        >
          <ArrowLeftOutlined />
        </button>
        <span style={{
          flex: 1, textAlign: 'center', fontSize: 16,
          fontWeight: 700, color: '#1A1614', letterSpacing: 2,
        }}>
          灵山导览
        </span>
        <div style={{ width: 34 }} />
      </div>

      {/* 地图区域 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <AMapContainer>
          <SpotMarkers spots={spots} onSpotClick={handleSpotClick} />
          <UserPosition location={geo} />

          {/* 景点详情卡片 */}
          {selectedSpot && !navigating && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: '#fff', borderRadius: '12px 12px 0 0',
              padding: '16px 20px',
              boxShadow: '0 -2px 12px rgba(0,0,0,0.1)',
              zIndex: 20,
              fontFamily: 'var(--font-serif), serif',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 6,
              }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1614' }}>
                  {selectedSpot.name}
                </span>
                <button
                  onClick={() => setSelectedSpot(null)}
                  style={{
                    border: 'none', background: 'none', fontSize: 18,
                    color: '#999', cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                {selectedSpot.overview}
                {spotDistance != null && (
                  <span style={{ marginLeft: 12, color: '#C84B31' }}>
                    距你 {spotDistance >= 1000 ? `${(spotDistance / 1000).toFixed(1)}km` : `${Math.round(spotDistance)}m`}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleNavigate}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    border: 'none', background: '#C84B31', color: '#fff',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  导航到这里
                </button>
                <button
                  onClick={() => navigate(`/attractions/${selectedSpot.id}`)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    border: '1px solid #d9d9d9', background: '#fff',
                    color: '#333', fontSize: 14, cursor: 'pointer',
                  }}
                >
                  查看详情
                </button>
              </div>
            </div>
          )}

          {/* 路线面板 */}
          <RoutePanel
            from={geo.latitude != null && geo.longitude != null ? { lat: geo.latitude, lng: geo.longitude } : null}
            to={navigating && selectedSpot?.latitude != null && selectedSpot?.longitude != null
              ? { lat: selectedSpot.latitude, lng: selectedSpot.longitude, name: selectedSpot.name }
              : null}
            onClose={handleCloseRoute}
          />

          {/* 定位失败提示 */}
          {geo.error && (
            <div style={{
              position: 'absolute', top: 12, left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.95)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, color: '#666',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 20,
            }}>
              {geo.error}
            </div>
          )}
        </AMapContainer>
      </div>
    </div>
  );
};

export default MapGuidePage;
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/tourist/MapGuidePage.tsx
git commit -m "feat: add MapGuidePage with map, markers, position, and route panel"
```

---

### Task 12: 路由注册

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 添加 MapGuidePage 路由**

在 `frontend/src/App.tsx` 中，找到 lazy import 区域（约第 26-36 行），添加：

```typescript
const MapGuidePage = React.lazy(() => import('./pages/tourist/MapGuidePage'));
```

在 Routes 中 tourist 路由区域（约第 461-469 行），在 `<Route path="/attractions/*" />` 之后添加：

```tsx
<Route path="/map" element={<MapGuidePage />} />
```

- [ ] **Step 2: 在首页添加入口**

在 `frontend/src/pages/tourist/HomePage.tsx` 的 `FEATURES` 数组中，添加一项：

```typescript
{
  to: '/map',
  label: '景区导览',
  desc: '实时定位与步行导航',
  icon: <CompassOutlined />,
  color: '#1890FF',
  bg: '#E6F4FF',
},
```

- [ ] **Step 3: 验证编译和页面**

```bash
cd frontend
npx tsc --noEmit
npm run dev
```

打开 `http://localhost:5173/map`，确认：
- 页面加载，顶部栏显示"灵山导览"
- 地图区域显示（需要高德 Key 才能渲染地图瓦片）
- 底部卡片逻辑正常（点击景点后弹出）

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/tourist/HomePage.tsx
git commit -m "feat: register /map route and add entry from homepage"
```

---

### Task 13: 集成测试与验证

- [ ] **Step 1: 完整流程测试**

启动前后端：

```bash
cd backend && python run.py
cd frontend && npm run dev
```

测试清单：

1. 访问 `http://localhost:5173`，确认首页出现"景区导览"入口卡片
2. 点击进入 `/map`，确认页面布局正确
3. 确认景点标记在地图上显示（需高德 Key）
4. 手机端测试 GPS 定位蓝点
5. 点击景点标记，确认底部卡片弹出
6. 点击"导航到这里"，确认路线绘制
7. 点击"我的位置"按钮，确认回到当前位置
8. 点击"查看详情"，确认跳转到景点详情页

- [ ] **Step 2: 最终 Commit**

```bash
git add -A
git commit -m "feat: scenic map guide complete with GPS and walking navigation"
```
