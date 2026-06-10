# 景区导览地图设计文档

## 概述

为"云游胜境"模块新增景区导览地图功能，支持游客在灵山景区内实时定位、浏览景点分布、获取景点间步行导航路线。

## 目标用户

在灵山胜境景区内游览的游客，使用手机 H5 页面（微信浏览器 + 独立浏览器）。

## 功能范围（MVP）

| 功能 | 说明 |
|------|------|
| 地图渲染 | 高德地图 JS API 2.0，显示灵山景区卫星/标准底图 |
| 景点标记 | 所有景点在地图上显示自定义标记点（图标+名称） |
| 实时定位 | 浏览器 Geolocation API 获取用户 GPS 坐标，蓝点显示 |
| 景点详情 | 点击标记弹出底部卡片，显示名称、概述、距离 |
| 步行导航 | 两点间步行路线绘制 + 距离/时间估算 |
| 一键定位 | "我的位置"按钮，地图回到当前 GPS 位置 |

## 不包含（后续迭代）

- 室内定位
- 语音导航提示
- 已游览打卡
- 景点拥挤度热力图
- 离线地图

## 技术选型

| 组件 | 方案 | 版本 |
|------|------|------|
| 地图 SDK | `@amap/amap-jsapi-loader` | latest |
| 地图 JS API | 高德 JS API 2.0 | 2.0 |
| 步行导航 | AMap Walking 插件 | 内置 |
| 坐标系 | GCJ-02 | - |
| 定位 | 浏览器 Geolocation API | - |
| 后端模型 | SQLAlchemy Float 字段 | - |

## 架构

### 前端

```
src/
├── pages/tourist/MapGuidePage.tsx      # /map 路由页面
├── components/map/
│   ├── AMapContainer.tsx               # 地图初始化、销毁、底图切换
│   ├── SpotMarkers.tsx                 # 景点标记点渲染
│   ├── UserPosition.tsx                # GPS 蓝点 + 定位按钮
│   └── RoutePanel.tsx                  # 路线面板（距离/时间/导航按钮）
└── hooks/useGeolocation.ts             # Geolocation API 封装
```

### 后端

```
backend/
├── app/models/tourist.py               # ScenicSpot 新增 latitude/longitude
├── alembic/versions/xxx_add_spot_coords.py  # 数据库迁移
└── app/api/spots.py                    # GET /spots 返回坐标
```

## 数据模型

### ScenicSpot 扩展

```python
latitude: Mapped[float | None] = mapped_column(Float, comment="纬度 GCJ-02")
longitude: Mapped[float | None] = mapped_column(Float, comment="经度 GCJ-02")
```

### 灵山景区坐标数据（GCJ-02）

| 景点 | 纬度 | 经度 |
|------|------|------|
| 灵山大佛 | 31.4250 | 120.3550 |
| 灵山梵宫 | 31.4280 | 120.3580 |
| 九龙灌浴 | 31.4220 | 120.3520 |
| 五印坛城 | 31.4200 | 120.3500 |
| 曼飞龙塔 | 31.4260 | 120.3600 |
| 祥符禅寺 | 31.4240 | 120.3560 |
| 佛手广场 | 31.4230 | 120.3530 |
| 百子戏弥勒 | 31.4235 | 120.3540 |
| 三圣殿 | 31.4210 | 120.3510 |
| 灵山精舍 | 31.4255 | 120.3570 |
| 菩提大道 | 31.4245 | 120.3555 |

> 注：坐标为示意值，需根据高德地图实际标注校准。

## API 变更

### GET /spots

响应新增字段：

```json
{
  "id": "LS-011",
  "name": "灵山大佛",
  "latitude": 31.425,
  "longitude": 120.355,
  ...
}
```

## 页面交互流程

### 1. 页面加载

```
用户访问 /map
  → 加载高德 JS API（安全密钥模式）
  → 地图容器挂载，中心点设为灵山景区 (31.424, 120.355)
  → 缩放级别 16（景区级）
  → 请求 GET /spots
  → 遍历景点，创建 Marker（自定义图标 + 名称标签）
  → 启动 Geolocation.watchPosition 监听用户位置
```

### 2. 用户定位

```
Geolocation 返回坐标
  → 更新地图蓝点位置
  → 计算每个景点到用户的距离
  → 更新底部卡片中的距离显示
```

### 3. 点击景点

```
用户点击 Marker
  → 底部弹出景点详情卡片
  → 卡片显示：景点名、概述、距用户距离
  → 显示"导航到这里"按钮
```

### 4. 步行导航

```
用户点击"导航到这里"
  → 调用 AMap.Walking.search(起点, 终点)
  → 返回步行路线
  → 地图上绘制 Polyline（蓝色半透明）
  → 面板显示：步行距离、预计时间
  → 自动调整地图视野包含完整路线
```

### 5. 一键定位

```
用户点击"我的位置"
  → 地图.flyTo(用户坐标, zoom=17)
  → 蓝点居中
```

## UI 设计

### 页面布局

```
┌─────────────────────────────────┐
│  ← 返回    灵山导览    [📍定位] │  顶部栏 48px
├─────────────────────────────────┤
│                                 │
│         高德地图容器             │
│         (全屏高度减去顶部+底部)  │
│                                 │
│   ┌─┐                          │
│   │标│  🔵 用户蓝点              │
│   │记│     ～～～ 步行路线        │
│   └─┘                          │
│                                 │
├─────────────────────────────────┤
│  景点名    ★4.8    距你 320m   │  底部卡片 120px
│  景点概述文字...                 │
│  [导航到这里]   [查看详情]        │
└─────────────────────────────────┘
```

### 标记点样式

- 默认状态：景点图标（16x16）+ 名称标签
- 选中状态：图标放大 + 高亮边框 + 名称加粗
- 使用 AMap.Marker 自定义 HTML 模板

### 底部卡片

- 从底部滑入，高度 120px
- 圆角 12px，带阴影
- 景点名 + 评分 + 距离一行
- 概述文字一行（截断）
- 两个操作按钮

### 路线面板

- 覆盖底部卡片位置
- 显示：步行距离、预计时间、"开始导航"/"结束导航"按钮
- 路线 Polyline：蓝色 #1890FF，宽度 6px，半透明

## 高德 Key 安全

使用 JS API 2.0 安全密钥机制：

```ts
// vite.config.ts 代理配置
server: {
  proxy: {
    '/_amap服务': {
      target: 'https://restapi.amap.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/_amap服务/, '')
    }
  }
}
```

```ts
// 加载地图
import AMapLoader from '@amap/amap-jsapi-loader';

AMapLoader.load({
  key: import.meta.env.VITE_AMAP_KEY,
  securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE,
  plugins: ['AMap.Walking', 'AMap.Scale', 'AMap.ToolBar'],
});
```

## 环境变量

```env
VITE_AMAP_KEY=高德JS API Key
VITE_AMAP_SECURITY_CODE=高德安全密钥
```

## 边界情况处理

| 场景 | 处理方式 |
|------|----------|
| 浏览器不支持 Geolocation | 显示提示"请在手机上使用"，地图仍可浏览 |
| 用户拒绝定位授权 | 显示提示，地图可浏览但无蓝点和距离计算 |
| GPS 信号弱 | 保持最后已知位置，蓝点闪烁提示 |
| 景点无坐标数据 | 该景点不显示在地图上 |
| 网络加载慢 | 地图容器显示骨架屏 |

## 测试要点

1. 地图加载并显示灵山景区范围
2. 所有景点标记正确显示在地图上
3. 手机端获取 GPS 坐标并显示蓝点
4. 点击景点标记弹出详情卡片
5. 距离计算正确（Haversine 公式）
6. 步行路线正确绘制
7. "我的位置"按钮回到蓝点
8. 微信浏览器内正常工作

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/pages/tourist/MapGuidePage.tsx` | 新建 | 地图导览主页面 |
| `frontend/src/components/map/AMapContainer.tsx` | 新建 | 地图容器组件 |
| `frontend/src/components/map/SpotMarkers.tsx` | 新建 | 景点标记组件 |
| `frontend/src/components/map/UserPosition.tsx` | 新建 | 用户定位组件 |
| `frontend/src/components/map/RoutePanel.tsx` | 新建 | 路线面板组件 |
| `frontend/src/hooks/useGeolocation.ts` | 新建 | GPS 定位 hook |
| `frontend/src/App.tsx` | 修改 | 添加 /map 路由 |
| `frontend/vite.config.ts` | 修改 | 添加高德代理配置 |
| `frontend/package.json` | 修改 | 添加 @amap/amap-jsapi-loader |
| `backend/app/models/tourist.py` | 修改 | ScenicSpot 加 lat/lng |
| `backend/alembic/versions/xxx_add_spot_coords.py` | 新建 | 数据库迁移 |
| `backend/data/ling_sheng_jing_spots.json` | 修改 | 补充坐标数据 |
