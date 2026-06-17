# 移动端页面设计：景区导览地图

> 灵山景区实时地图导览 + GPS定位 + 步行导航  
> **版本**: v1.0 | **日期**: 2026-06-10

---

## 一、功能概述

### 1.1 需求背景

游客在灵山景区内需要：
- 查看所有景点在地图上的分布
- 实时了解自己的位置
- 获取从当前位置到目标景点的步行导航

### 1.2 核心功能

| 功能 | 说明 |
|------|------|
| 景点标记 | 在地图上显示所有景点的位置（Marker） |
| 实时定位 | 获取用户GPS位置，显示在地图上 |
| 景点详情 | 点击景点显示名称、简介、距离 |
| 步行导航 | 绘制从当前位置到目标景点的路线 |
| 距离计算 | 使用 Haversine 公式计算直线距离 |
| 一键定位 | 快速将地图中心移动到用户位置 |

---

## 二、页面结构

```
┌──────────────────────────────────┐
│  ← 灵山导览              ◎      │  ← Header (返回 + 标题 + 定位按钮)
├──────────────────────────────────┤
│                                  │
│                                  │
│          MapView                 │
│       (react-native-maps)        │
│                                  │
│     📍 景点1    📍 景点2         │
│                                  │
│         📍 景点3                 │
│                                  │
│    👤 (用户位置)                  │
│                                  │
│         - - - - → 景点4          │  ← 导航路线 (Polyline)
│                                  │
├──────────────────────────────────┤
│  → 梵宫                     ✕   │  ← 底部卡片 (导航面板)
│  步行 1.2km    约15分钟          │
│  [        结束导航        ]      │
└──────────────────────────────────┘
```

### 2.1 两种底部卡片状态

**状态A：景点详情卡片**（选中景点，未开始导航）
```
┌──────────────────────────────────┐
│  梵宫                       ✕   │
│  佛教文化艺术殿堂，集雕刻、绘... │
│  距你 320m                       │
│  [  导航到这里  ] [  查看详情  ]  │
└──────────────────────────────────┘
```

**状态B：导航面板**（正在导航）
```
┌──────────────────────────────────┐
│  → 梵宫                     ✕   │
│  步行 1.2km      约15分钟        │
│  [        结束导航        ]      │
└──────────────────────────────────┘
```

---

## 三、技术实现

### 3.1 依赖库

| 库 | 用途 |
|----|------|
| `react-native-maps` | 地图渲染、Marker、Polyline |
| `expo-location` | GPS定位、权限管理 |

### 3.2 核心代码结构

```typescript
// app/map.tsx

// 1. 状态管理
const [spots, setSpots] = useState<Spot[]>([]);           // 景点列表
const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);  // 选中的景点
const [navigating, setNavigating] = useState(false);      // 是否在导航
const [userLocation, setUserLocation] = useState(...);    // 用户位置
const [routeInfo, setRouteInfo] = useState<RouteStep | null>(null);   // 路线信息

// 2. 数据加载
useEffect(() => {
  listSpots().then(data => {
    const withCoords = data.filter(s => s.latitude != null && s.longitude != null);
    setSpots(withCoords);
  });
}, []);

// 3. GPS定位
useEffect(() => {
  Location.requestForegroundPermissionsAsync().then(({ status }) => {
    if (status === 'granted') {
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
      );
    }
  });
}, []);

// 4. 导航逻辑
const handleNavigate = () => {
  const dist = haversine(userLocation.lat, userLocation.lng, spot.lat, spot.lng);
  const time = Math.ceil(dist / 80 * 60);  // 假设步行速度 80m/min
  setRouteInfo({ distance: dist, duration: time });
  mapRef.current.fitToCoordinates([userLocation, spot], { edgePadding: {...}, animated: true });
};

// 5. 距离计算 (Haversine公式)
function haversine(lat1, lng1, lat2, lng2): number {
  const R = 6371000;  // 地球半径(米)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

### 3.3 地图配置

```typescript
// 灵山景区中心坐标 (GCJ-02)
const LINGSHAN_CENTER = {
  latitude: 31.424,
  longitude: 120.355,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

<MapView
  ref={mapRef}
  provider={PROVIDER_DEFAULT}
  initialRegion={LINGSHAN_CENTER}
  showsUserLocation={true}
  showsMyLocationButton={false}
  showsCompass={true}
  mapType="standard"
>
  {spots.map(spot => (
    <Marker
      key={spot.id}
      coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
      title={spot.name}
      description={spot.overview}
      pinColor={selectedSpot?.id === spot.id ? Colors.accent : Colors.primary}
      onSelect={() => handleSpotTap(spot)}
    />
  ))}
  
  {navigating && (
    <Polyline
      coordinates={[userLocation, selectedSpot]}
      strokeColor={Colors.auxiliary}
      strokeWidth={4}
      lineDashPattern={[8, 4]}
    />
  )}
</MapView>
```

---

## 四、文件清单

| 文件 | 说明 |
|------|------|
| `app/map.tsx` | 地图导览页面主组件 |
| `app/_layout.tsx` | 注册 `/map` 路由 |
| `app/(tabs)/index.tsx` | 首页添加"景区导览"入口 |
| `app.json` | 配置 expo-location 和 react-native-maps 插件 |
| `api/spots.ts` | Spot 接口已包含 latitude/longitude 字段 |
| `backend/app/models/tourist.py` | ScenicSpot 模型新增 latitude/longitude 字段 |
| `backend/data/ling_sheng_jing_spots.json` | 12个景点的 GCJ-02 坐标数据 |

---

## 五、景点坐标数据

所有坐标使用 **GCJ-02** 坐标系（中国国家标准）：

| 景点ID | 名称 | 纬度 | 经度 |
|--------|------|------|------|
| LS-011 | 灵山大佛 | 31.4250 | 120.3550 |
| LS-013 | 梵宫 | 31.4280 | 120.3580 |
| LS-006 | 九龙灌浴 | 31.4220 | 120.3520 |
| LS-014 | 五印坛城 | 31.4200 | 120.3500 |
| LS-015 | 曼飞龙塔 | 31.4260 | 120.3600 |
| LS-009 | 祥符禅寺 | 31.4240 | 120.3560 |
| LS-005 | 佛手广场 | 31.4230 | 120.3530 |
| LS-007 | 百子戏弥勒 | 31.4235 | 120.3540 |
| LS-010 | 灵山精舍 | 31.4255 | 120.3570 |
| LS-003 | 灵山大照壁 | 31.4215 | 120.3495 |
| LS-004 | 菩提大道 | 31.4245 | 120.3555 |
| LS-008 | 三圣殿 | 31.4210 | 120.3510 |

---

## 六、权限配置

### 6.1 app.json 插件配置

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-asset",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location to show your position on the scenic area map.",
          "locationWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location to show your position on the scenic area map.",
          "isAndroidForegroundLocationEnabled": true
        }
      ],
      [
        "react-native-maps",
        {
          "iosMapsApiKey": "YOUR_IOS_MAPS_API_KEY"
        }
      ]
    ]
  }
}
```

### 6.2 运行时权限请求

```typescript
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  setLocationError('已拒绝定位授权');
  return;
}
```

---

## 七、交互流程

```
用户打开"景区导览"
        │
        ▼
请求定位权限 ──拒绝──→ 显示错误提示
        │
      同意
        │
        ▼
加载景点数据 + 开始GPS定位
        │
        ▼
显示地图 + 景点标记 + 用户位置
        │
        ├─── 点击景点 ──→ 显示景点详情卡片
        │                      │
        │                      ├── 点击"导航到这里" ──→ 进入导航模式
        │                      │                            │
        │                      │                            ├── 绘制路线
        │                      │                            ├── 显示距离/时间
        │                      │                            └── 调整地图视野
        │                      │
        │                      └── 点击"查看详情" ──→ 跳转景点详情页
        │
        ├─── 点击定位按钮 ──→ 地图移动到用户位置
        │
        └─── 点击返回 ──→ 返回上一页
```

---

## 八、样式设计

### 8.1 配色方案

| 元素 | 颜色 | 说明 |
|------|------|------|
| 普通景点标记 | `Colors.primary` (#6A9C89) | 茶绿色 |
| 选中景点标记 | `Colors.accent` (#C84B31) | 朱红色 |
| 导航路线 | `Colors.auxiliary` (#2A4D6E) | 靛蓝色虚线 |
| 底部卡片背景 | `#FFFFFF` | 白色 |
| 距离文字 | `Colors.accent` | 朱红色高亮 |

### 8.2 关键样式

```typescript
// 底部卡片
bottomCard: {
  position: 'absolute', bottom: 0, left: 0, right: 0,
  backgroundColor: '#fff',
  borderTopLeftRadius: 14, borderTopRightRadius: 14,
  paddingHorizontal: 20, paddingTop: 16,
  shadowColor: Colors.ink, shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
}

// 导航按钮
navBtn: {
  flex: 1, paddingVertical: 12, borderRadius: 8,
  backgroundColor: Colors.accent, alignItems: 'center',
}
```

---

## 九、测试方式

### 9.1 开发环境启动

```bash
cd software/mobile

# 安装依赖（如果还没装）
npx expo install react-native-maps expo-location

# 启动开发服务器
npx expo start
```

### 9.2 原生层重建

由于 `app.json` 的 plugins 有变更，需要重建原生层：

```bash
# 清除缓存并重建
npx expo prebuild --clean

# 或者分别构建
npx expo prebuild --platform ios
npx expo prebuild --platform android
```

### 9.3 测试要点

| 测试项 | 预期结果 |
|--------|----------|
| 首次打开 | 弹出定位权限请求 |
| 拒绝权限 | 顶部显示"已拒绝定位授权"提示 |
| 同意权限 | 地图显示蓝色用户位置点 |
| 点击景点 | 底部弹出景点详情卡片 |
| 点击"导航到这里" | 显示虚线路线 + 距离时间 |
| 点击定位按钮 | 地图平滑移动到用户位置 |
| 移动位置 | 蓝色定位点实时更新 |

---

## 十、已知限制与后续优化

### 10.1 当前限制

1. **路线为直线**：导航路线是两点之间的直线，不是实际道路
2. **距离为直线距离**：使用 Haversine 公式计算，非实际步行距离
3. **无离线地图**：需要网络连接才能加载地图瓦片
4. **无语音导航**：只有视觉提示，没有转向语音播报

### 10.2 后续优化方向

| 优化项 | 说明 |
|--------|------|
| 接入路径规划API | 使用高德/百度路径规划API获取真实步行路线 |
| 室内地图 | 灵山景区室内区域（如梵宫）的精细地图 |
| AR导航 | 结合摄像头实现AR实景导航 |
| 离线缓存 | 预下载景区地图瓦片，支持离线使用 |
| 语音播报 | 接近景点时自动播放语音讲解 |
| 热力图 | 显示各景点拥挤程度 |

---

## 十一、相关文件

- 设计文档：`docs/mobile-migration/page-design-home-explore-attractions.md`
- 后端景点模型：`backend/app/models/tourist.py`
- 景点种子数据：`backend/data/ling_sheng_jing_spots.json`
- API接口：`backend/app/api/spots.py`
