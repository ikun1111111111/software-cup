# 数字人GPS定位导览方案

> 文档版本: v1.0 | 创建日期: 2026-06-17 | 状态: 待确认

---

## 1. 背景与目标

### 1.1 问题现状

当前导览系统存在以下问题：
- **无法感知用户位置**：不知道用户在景区的哪个位置
- **推进方式单一**：依赖用户手动跳转到详情页才能推进导览进度
- **卡片占用空间大**：导览进度卡片始终全量展示，遮挡内容
- **数字人被动响应**：数字人没有基于用户位置主动引导的能力

### 1.2 改造目标

| 目标 | 说明 |
|------|------|
| **GPS位置感知** | 实时获取用户GPS坐标，判断用户与景点的距离关系 |
| **GPS打卡推进** | 用户到达景点范围（30m）内即可打卡，自动推进导览进度 |
| **数字人主动引导** | 基于GPS距离，数字人主动语音引导用户前进、打卡 |
| **卡片可折叠** | 导览卡片支持折叠/展开，节省屏幕空间 |
| **禅意之旅导航** | 在地图上显示导航路线、用户位置、目标景点范围 |

---

## 2. 核心流程

### 2.1 完整导览流程

```
[用户进入景区]
    │
    ▼
[GPS定位获取] ←────── 持续轮询(每5s)
    │
    ▼
[距离计算]
    │
    ├── 距离目标 > 200m ──→ 数字人："您距离XX约500米，跟我来"
    │                          状态: navigate → 显示导航路线
    │
    ├── 距离目标 50-200m ─→ 数字人："前方就是XX了"
    │                          状态: navigate → 导航引导
    │
    ├── 距离目标 ≤ 50m ──→ 数字人："即将到达XX，准备好打卡了吗？"
    │                        状态: attraction → 景点介绍
    │
    ├── 进入详情页/手动打卡 ──→ GPS校验(≤30m)
    │                             │
    │                             ├── 校验通过 → ✅ 打卡成功
    │                             │                   progress.completed++
    │                             │                   推进到下一景点
    │                             │
    │                             └── 校验失败 →  "您还未到达景点范围"
    │
    └── 全部完成 ──→ 数字人祝贺 + 推荐生成游记
```

### 2.2 推进机制对比

| 推进方式 | 旧方案 | 新方案 |
|----------|--------|--------|
| **触发条件** | 手动跳转到详情页 | GPS到达 + 详情页打卡按钮 |
| **距离校验** | 无 | 30m半径校验 |
| **数字人引导** | 被动响应 | 主动语音引导 |
| **用户感知** | 不知道自己在哪 | 实时显示位置+距离 |

---

## 3. 技术方案

### 3.1 GPS定位Hook - `useTourGeolocation`

```typescript
// hooks/useTourGeolocation.ts
interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;  // 精度(m)
  timestamp: number;
}

interface DistanceInfo {
  spotId: string;
  spotName: string;
  distance: number;    // 距离(米)
  level: 'far' | 'near' | 'close' | 'arrived';
}

export function useTourGeolocation(
  targetSpot: Spot | null,
  onDistanceChange: (info: DistanceInfo) => void,
) {
  // 使用 expo-location 持续获取GPS
  // 每5秒轮询一次（导览模式下）
  // 计算与目标景点的Haversine距离
  // 根据阈值触发不同level：
  //   far: > 200m
  //   near: 50-200m
  //   close: 15-50m
  //   arrived: ≤ 15m
}
```

**阈值定义**：

| Level | 距离 | 数字人行为 |
|-------|------|------------|
| `far` | > 200m | 每60秒播报一次距离 |
| `near` | 50-200m | 主动引导："前方就是XX了" |
| `close` | 15-50m | "即将到达，准备好打卡了吗？" |
| `arrived` | ≤ 15m | "已到达XX！进入详情页打卡吧" |

### 3.2 打卡Hook - `useTourCheckin`

```typescript
// hooks/useTourCheckin.ts
export function useTourCheckin() {
  // checkIn(spotId): 打卡逻辑
  // 1. 获取当前GPS
  // 2. 获取景点GPS坐标
  // 3. 计算距离，≤30m则校验通过
  // 4. 校验通过 → 调用 tourActions.completeSpot()
  // 5. 校验失败 → 返回错误"您还未到达景点范围"
}
```

### 3.3 数字人引导策略 - `useTourGuide`

```typescript
// hooks/useTourGuide.ts
// 基于GPS距离的数字人主动引导

// 监听 distanceInfo.level 变化，触发数字人语音：
const guideStrategy = {
  far: (spot, distance) => {
    vrmSpeak(`您距离${spot.name}约${Math.round(distance)}米，跟我来，让我为您导航`, 'neutral');
  },
  near: (spot, distance) => {
    vrmSpeak(`前方${Math.round(distance)}米就是${spot.name}了，准备好探索了吗`, 'happy');
  },
  close: (spot, distance) => {
    vrmSpeak(`即将到达${spot.name}！请打开景点详情页打卡`, 'excited');
  },
  arrived: (spot) => {
    vrmSpeak(`欢迎来到${spot.name}！点击打卡记录您的到访`, 'happy');
  },
};
```

**防抖机制**：
- 同一level的语音只播报一次
- level变化时才重新播报
- `far` 级别每60秒重复一次

### 3.4 打卡推进逻辑

```typescript
// useTourOrchestrator 中新增
const completeSpot = useCallback((spotId: string) => {
  // 1. GPS校验
  const distance = haversineDistance(userLocation, spotLocation);
  if (distance > 30) {
    vrmSpeak('您还未到达景点范围，请靠近后再打卡', 'neutral');
    return false;
  }

  // 2. 更新进度
  setState(prev => ({
    ...prev,
    progress: {
      total: prev.progress.total,
      completed: prev.progress.completed + 1,
      current: prev.progress.current + 1,
    },
    currentSpot: prev.currentRoute?.spots[prev.progress.current] || null,
    nextSpot: prev.currentRoute?.spots[prev.progress.current + 1] || null,
  }));

  // 3. 数字人播报下一景点
  const nextSpot = prev.currentRoute?.spots[prev.progress.current + 1];
  if (nextSpot) {
    vrmSpeak(`${spotName}打卡成功！接下来让我们前往下一个景点：${nextSpot.name}`, 'happy');
    setState(prev => ({ ...prev, status: 'navigate' }));
  } else {
    vrmSpeak('恭喜您完成全部景点打卡！您真棒', 'excited');
    setState(prev => ({ ...prev, status: 'free' }));
  }

  return true;
}, [vrmSpeak, userLocation]);
```

### 3.5 可折叠导览卡片

```
┌─────────────────────────────┐  展开态（现有样式）
│ 🧘 禅意之旅      🧭 导航中   │
│ 0/3 景点                     │
│ 当前位置: 菩提大道           │
│  ① ─── ② ─── ③             │
│ 菩提  梵宫  五印坛城         │
│ [继续导览]  [结束导览]        │
└─────────────────────────────┘

┌─────────────────────────────┐  收起态
│  禅意之旅 · 0/3 ▶          │
└─────────────────────────────┘
```

**实现要点**：
- 添加 `collapsed: boolean` 状态
- 点击卡片头部切换折叠状态
- 默认展开，用户点击后保持折叠
- 收起态只显示：路线名 + 进度 + 箭头
- 打卡完成时自动展开一次提示

---

## 4. 文件变更清单

### 4.1 新增文件

| 文件 | 说明 |
|------|------|
| `hooks/useTourGeolocation.ts` | GPS定位+距离计算Hook |
| `hooks/useTourCheckin.ts` | 打卡校验Hook |
| `hooks/useTourGuide.ts` | 数字人引导策略Hook |

### 4.2 修改文件

| 文件 | 改动内容 |
|------|----------|
| `hooks/useTourOrchestrator.ts` | 添加 `userLocation` 状态、`completeSpot()` 方法、GPS相关事件处理 |
| `components/guide/TourProgressIndicator.tsx` | 添加折叠/展开功能、打卡成功动画 |
| `app/attractions/[id].tsx` | 添加" 打卡"按钮，集成GPS校验 |
| `app/map.tsx` | 显示导航路线、用户位置标记、目标景点范围圈 |
| `app/(tabs)/index.tsx` | 集成GPS定位，首页导览状态感知 |
| `api/spots.ts` | 确保景点返回 `latitude` 和 `longitude` |
| `backend/app/api/tour.py` | 添加 `complete_spot` 端点，记录打卡日志 |

### 4.3 依赖安装

```bash
# 移动端新增依赖
npx expo install expo-location
```

---

## 5. 数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Expo App (React Native)                  │
│                                                              │
│  ┌──────────────┐    ┌────────────────    ┌──────────────┐ │
│  │ useTourGeo   │───→│ useTourGuide   │───→│ vrmSpeak()   │ │
│  │ location     │    │ strategy       │    │ VRM浮窗      │ │
│  └──────┬───────┘    └───────────────┘    └──────────────┘ │
│         │                     │                               │
│         ▼                     ▼                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              useTourOrchestrator                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │ userLocation │  │ completeSpot │  │ progress     │  │ │
│  │  │ (GPS坐标)    │  │ (打卡推进)   │  │ (进度管理)   │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │ │
│  └──────────────────────┬──────────────────────────────────┘ │
│                         │                                    │
│         ┌───────────────┼───────────────┐                    │
│         ▼               ▼               ▼                    │
│  ┌─────────────┐ ┌─────────────┐ ─────────────┐            │
│  │景点详情页   │ │地图页       │ │聊天页       │            │
│  │📍打卡按钮   │ │️导航路线  │ │💬主动推荐   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼ SSE
┌─────────────────────────────────────────┐
│         FastAPI Backend                  │
│  ┌──────────────┐  ┌──────────────┐     │
│  │ /tour/checkin│  │ /tour/progress│    │
│  │ (打卡记录)   │  │ (进度查询)   │     │
│  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────┘
```

---

## 6. 关键API设计

### 6.1 后端新增端点

```python
# POST /api/tour/checkin
# 请求: { "session_id": "xxx", "spot_id": "xxx", "lat": 31.424, "lng": 120.355 }
# 响应: { "success": true, "distance": 12.5, "message": "打卡成功" }
#       { "success": false, "distance": 85.3, "message": "距离景点85米，请靠近后再打卡" }

# GET /api/tour/progress/{session_id}
# 响应: { "total": 3, "completed": 1, "current": 2, "current_spot": "菩提大道" }

# POST /api/tour/navigation/{session_id}
# 请求: { "target_spot_id": "xxx" }
# 响应: { "route": [{ "lat": 31.424, "lng": 120.355 }, ...], "distance": 450, "duration": "5分钟" }
```

### 6.2 前端打卡流程

```typescript
// app/attractions/[id].tsx 中
const handleCheckIn = async () => {
  const result = await checkIn(spotId);
  if (result.success) {
    // 打卡成功 → 更新进度 → 推进
    tourActions.completeSpot(spotId);
    vrmSpeak(`${spotName}打卡成功！`, 'excited');
    // 显示庆祝动画
  } else {
    // 距离太远
    vrmSpeak(`您距离${spotName}还有${Math.round(result.distance)}米`, 'neutral');
    Toast.show('请靠近景点后再打卡');
  }
};
```

---

## 7. 地图增强

### 7.1 导航模式地图显示

```
┌─────────────────────────────┐
│ 地图视图                     │
│                             │
│      ○ 用户位置(蓝色脉冲)    │
│      │                      │
│      │ 虚线导航路线          │
│      │                      │
│      ▼                      │
│   ┌─────┐                   │
│   │ ①   │  目标景点(红色圈)  │
│   │菩提 │  30m范围圈         │
│   └─────┘                   │
│                             │
│  [底部] 距离: 120m · 约2分钟 │
└─────────────────────────────┘
```

**地图标记**：
- 用户位置：蓝色脉冲圆点（已有）
- 目标景点：红色高亮 + 30m范围圈
- 导航路线：绿色虚线路径（已有）
- 已完成景点：灰色标记
- 未完成景点：正常标记

### 7.2 地图底部导航信息

```typescript
// 当 status === 'navigate' 时显示
<View style={styles.navigationBar}>
  <Text>📍 目标: {tourState.nextSpot.name}</Text>
  <Text>📏 距离: {distance}m</Text>
  <Text>⏱️ 预计: {duration}</Text>
</View>
```

---

## 8. 实现步骤

### 阶段一：核心逻辑（优先级最高）

1. 安装 `expo-location` 依赖
2. 实现 `useTourGeolocation` Hook
3. 实现 `useTourCheckin` Hook
4. 扩展 `useTourOrchestrator`（添加GPS状态和completeSpot方法）

### 阶段二：数字人引导

5. 实现 `useTourGuide` Hook（距离感知语音引导）
6. 集成到首页、景点详情页

### 阶段三：UI改造

7. 改造 `TourProgressIndicator`（折叠/展开）
8. 景点详情页添加"打卡"按钮
9. 地图页增强（导航路线、范围圈）

### 阶段四：后端支持

10. 添加 `/tour/checkin` 端点
11. 添加打卡记录持久化
12. 添加进度查询端点

### 阶段五：测试与优化

13. GPS精度测试（室内/室外）
14. 打卡流程端到端测试
15. 数字人语音频率优化（防扰）

---

## 9. 边界情况处理

| 场景 | 处理方式 |
|------|----------|
| **GPS信号弱** | 使用最后已知位置，显示"定位中..."提示 |
| **景点无GPS坐标** | 跳过GPS打卡，使用手动打卡模式 |
| **用户偏离路线** | 数字人提示"您似乎偏离了路线，需要重新导航吗？" |
| **打卡后GPS漂移** | 使用5秒平均值，单次校验失败可重试3次 |
| **导览中途退出** | 保存进度到AsyncStorage，下次自动恢复 |
| **多用户同行** | 支持共享导览进度（后续功能） |

---

## 10. 预期效果

完成改造后，用户体验流程：

1. **进入景区** → 数字人："欢迎来到灵山胜境！让我带您游览"
2. **推荐路线** → 数字人："为您推荐禅意之旅，全程约1.5小时"
3. **开始导航** → 地图显示路线，数字人："跟我来，前方200米是菩提大道"
4. **接近景点** → 数字人："前方就是菩提大道了，准备好打卡了吗？"
5. **到达打卡** → 详情页点击打卡 → ✅ "菩提大道打卡成功！"
6. **推进下一站** → 数字人："接下来让我们前往梵宫"
7. **全部完成** → 数字人："恭喜您完成禅意之旅！要生成游记吗？"
