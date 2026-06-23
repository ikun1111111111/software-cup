# 移动端「旅行记忆」页优化方案 — 灵山手帐

> **目标页面**: `software/mobile/app/(tabs)/memory.tsx`  
> **版本**: v1.0 | **日期**: 2026-06-17 | **状态**: 方案设计

---

## 一、现状诊断

### 1.1 当前页面结构

```
┌─────────────────────────────────────┐
│  Hero Header                        │  ← 标题 + 3 个统计数字
├─────────────────────────────────────┤
│  Achievement Bar                    │  ← 等级 + 印章 + 成就
├─────────────────────────────────────┤
│  Summary Card                       │  ← 旅程总结 / 空状态
├─────────────────────────────────────┤
│  Action Bar                         │  ← 「写一条记忆」+「从对话生成」
├─────────────────────────────────────┤
│  记忆时光 (Section Header)           │
│  ┌──────────────────────────────┐   │
│  │ MemoryCard                   │   │  ← 白底卡片 + 左侧 3px 色条
│  │ MemoryCard                   │   │
│  │ MemoryCard                   │   │
│  │ ...                          │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│  VRMFloating (右下角)               │
└─────────────────────────────────────┘
```

### 1.2 问题清单

| # | 问题 | 当前表现 | 影响 |
|---|------|----------|------|
| 1 | **列表感太强** | 白色卡片 + 左侧彩色条 = 标准 feed 流 | 没有「记忆册」的仪式感，与「旅行记忆」主题不匹配 |
| 2 | **Hero 区平淡** | 三个数字（条数/景点/∞）静态排列 | 首屏无法制造情绪冲击，用户没有「翻开一本册子」的感觉 |
| 3 | **空间感缺失** | 所有记忆平铺在时间线上 | 用户无法感知「我走过了哪些地方」，记忆缺乏地理锚点 |
| 4 | **AI 润色无惊喜** | 点击按钮 → loading spinner → 文本替换 | 缺少「AI 挥毫落纸」的戏剧性，核心卖点没有视觉表现力 |
| 5 | **成就区割裂** | 印章/成就和记忆内容各自为政 | 游戏化体验没有融入主线，用户不会主动关联 |
| 6 | **分享链路断裂** | 页面内看记忆，但要分享需要另找入口 | 用户不会主动去生成分享卡片，传播率低 |
| 7 | **空状态无引导** | 📝 emoji + 「暂无旅行记忆」+ 两个按钮 | 新用户不知道从何开始，缺少情感化的「开篇」引导 |

### 1.3 现有代码关键文件

| 文件 | 职责 |
|------|------|
| `software/mobile/app/(tabs)/memory.tsx` | 记忆页主组件（~980 行） |
| `software/mobile/api/memory.ts` | API 接口层 |
| `software/mobile/constants/colors.ts` | 颜色系统 |
| `software/mobile/components/vrm/VRMFloating.tsx` | VRM 数字人浮窗 |
| `backend/app/api/memory.py` | 后端 API |
| `backend/app/services/memory_service.py` | 记忆服务（提取/润色/总结） |

---

## 二、核心设计理念

### 2.1 一句话定义

> **「墨卷展开」—— 用户不是在刷列表，而是在展开一幅属于自己的灵山墨卷。**

### 2.2 三个关键词

| 关键词 | 含义 | 落地方式 |
|--------|------|----------|
| **手帐感** | 每一页都是手工记录的、有温度的 | 宣纸纹理、书法标题、印章装饰 |
| **墨韵** | 东方水墨的流动与留白 | 墨迹时间线、晕染动画、水墨路线 |
| **集印** | 旅行 = 集章打卡的旅程 | 印章融入主线、景点节点亮起、成就嵌入时间线 |

### 2.3 设计参考

- **TrailSnap (行影集)**: 自动整理旅行照片、生成回忆视频
- **手帐 App (如 Journey)**: 贴纸、手写、印章装饰
- **微信读书「笔记」**: 时间线 + 卡片式展示
- **我们的差异化**: AI 数字人主动引导记录 + AI 润色古风文案 + 印章收集游戏化

---

## 三、UI/UX 优化方案（6 个改造点）

### 3.1 Hero 区 → 「墨韵山水 · 行程鸟瞰」

**现状：** 静态文字 + 3 个数字统计，无视觉层次

**改造后：**

```
┌─────────────────────────────────────────┐
│  ░░░ 墨晕渐变背景（随记忆数加深）░░░░░░  │
│                                         │
│    ☁️  浮动云层 (微动效)      ☁️         │
│                                         │
│      ╭──── 灵山胜境 · 你的墨卷 ────╮    │
│      │                             │    │
│      │  「拾级而上，梵音入耳」       │    │  ← AI 从最近一条记忆提取的「卷首语」
│      │                             │    │     书法字体渲染
│      ╰─────────────────────────────╯    │
│                                         │
│    🗺️  微型水墨路线图 (横向可滑)         │  ← 景点以墨点标注在路线上
│    ●━━━━●━━━━○━━━━●━━━━○              │     已 visit = 实心墨点
│   大佛   梵宫  九龙  拈花  祥符          │     未 visit = 空心圆
│                                         │
│    ┌──────┐   ┌──────┐   ┌──────┐      │
│    │  12  │   │  5   │   │ 83%  │      │  ← 数据下沉到底部
│    │ 记忆  │   │ 景点  │   │ 印章  │      │     圆形印章样式
│    └──────┘   └──────┘   └──────┘      │
└─────────────────────────────────────────┘
```

**改造要点：**

| 元素 | 实现方案 | 技术细节 |
|------|----------|----------|
| 墨晕渐变背景 | `react-native-linear-gradient` + 噪点纹理 overlay | 背景色随 `memories.length` 从浅墨渐变到深墨 |
| 浮动云层 | `react-native-reanimated` 缓慢水平漂移 | 20s 周期，`withRepeat` + `withTiming` |
| 卷首语 | 后端新增 API 或前端从最近记忆截取 | 5 字以内，书法字体 |
| 水墨路线图 | 自定义 SVG 组件 | `react-native-svg` 绘制简化景区路线 |
| 统计数据 | 圆形印章样式 | 缩小到底部，不再占据 C 位 |

**后端改动：**

```python
# backend/app/api/memory.py 新增端点
@router.get("/api/memory/hero-quote")
async def get_hero_quote(session_id: str):
    """获取卷首语：从最近记忆中提取一句"""
    memories = await memory_service.list_memories(session_id, limit=5)
    if not memories:
        return {"quote": "开始你的灵山之旅"}
    # 取最近一条的标题或内容前 5 字
    return {"quote": memories[0].title[:5]}
```

---

### 3.2 记忆卡片 → 「手帐页」

**现状：** 白底卡片 + 左侧 3px 彩色条，标准 feed 样式

**改造后：**

```
        ┌──────────────────────────────────┐
        │  📍 灵山大佛              6/17   │  ← 景点 + 日期作为「页眉」
        │  ─────────────────────────────── │
        │                                  │
        │   初见大佛                        │  ← 书法体标题
        │                                  │
        │   拾级而上，仰望八十八米           │  ← 正文，楷体/手写感
        │   青铜大佛，梵音入耳，             │
        │   心生敬畏...                     │
        │                                  │
        │                ┌──────────┐      │
        │   🖋 点击查看    │ 原文对照  │      │  ← AI 润色后可翻转查看原文
        │                └──────────┘      │
        │                                  │
        │   ┌──────┐                       │
        │   │ 😊   │  开心                 │  ← 情绪印章（大号、旋转 ±3°）
        │   └──────┘                       │
        │                                  │
        │  ······························  │  ← 墨点虚线分隔
        │  [分享这张]        [AI 再润色]    │  ← 快捷操作
        └──────────────────────────────────┘
```

**改造要点：**

| 元素 | 现状 | 改造 | 技术实现 |
|------|------|------|----------|
| 卡片背景 | 纯白 | 白底 + 宣纸纹理 overlay | 半透明 noise PNG 作为 `Image` 背景 |
| 标题字体 | 系统 bold | 书法体 | 内嵌字体或使用 SVG 文字 |
| 正文字体 | 系统默认 | 楷体/仿宋 | 增强手写感 |
| 情绪标签 | 左侧 3px 色条 | 印章样式（圆形/方形，旋转 ±3°） | `transform: [{ rotate }]` 模拟盖章 |
| AI 润色对比 | 直接替换文本 | 翻转交互：正面润色版，背面原文 | `react-native-reanimated` rotateY 动画 |
| 分享入口 | 无 | 每张卡片底部「分享这张」按钮 | 直接生成单张分享卡片 |
| 分隔线 | 无 | 墨点虚线 | SVG 绘制不规则点线 |

**翻转交互实现：**

```typescript
// 卡片翻转 — 正面 AI 润色版，背面原文
const flipProgress = useSharedValue(0);

const handleFlip = () => {
  flipProgress.value = withSpring(flipProgress.value ? 0 : 1, {
    damping: 15,
    stiffness: 120,
  });
};

const frontStyle = useAnimatedStyle(() => ({
  opacity: interpolate(flipProgress.value, [0.5, 0.51], [1, 0]),
  transform: [{ rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` }],
}));

const backStyle = useAnimatedStyle(() => ({
  opacity: interpolate(flipProgress.value, [0.49, 0.5], [0, 1]),
  transform: [{ rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` }],
}));
```

---

### 3.3 时间线 → 「墨迹路径」

**现状：** 无时间线视觉，卡片直接堆叠

**改造后：**

```
         │
    ●━━━━┤  6/17 · 灵山大佛
         │    「初见大佛」
         │
    ●━━━━╋━━ 6/17 · 梵华宫
         │    「梵音袅袅」
         │
    ○━━━━╋━━ 6/17 · 九龙灌浴  (未访问)
         │
    ●━━━━┤  6/16 · 拈花湾
         │    「禅意小镇」
         │
```

**改造要点：**

| 元素 | 实现方案 |
|------|----------|
| 中轴线 | SVG path 绘制墨迹效果（不规则粗细） |
| 已记录节点 | 实心墨点 + 微光晕（`react-native-svg` circle + radialGradient） |
| 未访问节点 | 空心圆 + 虚线连接 |
| 绘制动画 | `StrokeDasharray` + `StrokeDashoffset` 动画，滚动时墨迹渐次出现 |
| 节点信息 | 左侧日期，右侧嵌入卡片顶部 |

**SVG 墨迹时间线实现：**

```typescript
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, { useAnimatedProps } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

function InkTimeline({ memories, scrollY }) {
  const drawProgress = useDerivedValue(() => {
    return Math.min(1, scrollY.value / 500);
  });

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: [1000, 1000],
    strokeDashoffset: 1000 * (1 - drawProgress.value),
  }));

  return (
    <Svg width={20} height={totalHeight}>
      <AnimatedPath
        d="M10,0 C12,50 8,100 10,150 C12,200 8,250 10,300 ..."
        stroke="#2A2520"
        strokeWidth={2}
        fill="none"
        animatedProps={animatedProps}
      />
      {memories.map((m, i) => (
        <Circle key={m.id} cx={10} cy={nodeY(i)} r={5} fill="#2A2520" />
      ))}
    </Svg>
  );
}
```

---

### 3.4 AI 润色 → 「挥毫时刻」

**现状：** 点击按钮 → loading spinner → 文本替换（无感知）

**改造后（分步动画）：**

```
Step 1: 按钮变化
  ┌──────────────┐
  │  AI 润色      │  →  ✒️ 挥毫中...
  └──────────────┘

Step 2: 墨滴扩散 (0.8s)
  ┌──────────────────────────────┐
  │         ░░░░░░░░░░           │  ← 从中心向外晕染
  │       ░░░░░░░░░░░░░░         │
  │      ░░░░░░░░░░░░░░░░        │
  │       ░░░░░░░░░░░░░░         │
  │         ░░░░░░░░░░           │
  └──────────────────────────────┘

Step 3: 原文逐字淡出 (波浪式，每字 50ms 延迟)
  「今 天 去 了 灵 山 大 佛」
   ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓
  （逐字 opacity → 0）

Step 4: 润色文字逐字「书写」出现
  「拾 级 而 上 ， 仰 望 八 十 八 米...」
   ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑
  （逐字 opacity 0→1 + translateY 动画）

Step 5: 情绪印章盖下
  ┌──────┐
  │ 😊   │  ← 从上方弹下 (withSpring) + 轻微旋转
  └──────┘     + 触觉反馈 (haptic)

Step 6: VRM 数字人同步语音
  「已为你润色，愿这段记忆如墨常新」
```

**技术实现：**

```typescript
// 逐字动画
function AnimatedText({ text, trigger, delay = 50 }) {
  const chars = text.split('');
  
  return (
    <View style={styles.charRow}>
      {chars.map((char, i) => (
        <AnimatedChar key={i} char={char} trigger={trigger} delay={i * delay} />
      ))}
    </View>
  );
}

function AnimatedChar({ char, trigger, delay }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    if (trigger) {
      setTimeout(() => {
        opacity.value = withTiming(1, { duration: 300 });
        translateY.value = withTiming(0, { duration: 300 });
      }, delay);
    }
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.Text style={style}>{char}</Animated.Text>;
}

// 印章盖下动画
function StampDrop({ visible, mood }) {
  const scale = useSharedValue(3);
  const rotate = useSharedValue(Math.random() * 6 - 3); // ±3°

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      );
      // 触觉反馈
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [visible]);

  // ...
}
```

---

### 3.5 成就系统 → 「集印之旅」融入主线

**现状：** 成就和记忆分开展示，关联性弱

**改造方案：**

```
┌─────────────────────────────────────────────┐
│  Hero 区水墨路线图                            │
│                                             │
│  ●━━━━●━━━━○━━━━●━━━━○━━━━🏆              │
│ 大佛   梵宫  九龙  拈花  祥符   印章簿      │
│                                             │
│  ↑ 每收集一枚印章，对应节点亮起               │
│    (空心→实心 + 光晕扩散动画)                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  时间线中嵌入成就徽章                         │
│                                             │
│  ●━━━━ 6/17 · 灵山大佛                      │
│  │     「初见大佛」                          │
│  │     🖋 诗人 — 首条记忆被 AI 润色          │  ← 成就标签
│  │                                          │
│  ●━━━━ 6/17 · 梵华宫                        │
│  │     「梵音袅袅」                          │
│  │     📍 朝圣者 — 连续访问 3 座寺庙         │  ← 成就标签
│  │                                          │
└─────────────────────────────────────────────┘
```

**改造要点：**

- 印章收集进度条嵌入 Hero 区水墨路线图上（路线终点 = 印章簿）
- 每收集新印章，对应景点节点在路线图上亮起（空心→实心 + 光晕扩散）
- 成就解锁时，在记忆时间线对应位置插入成就徽章
- 未解锁印章显示灰色剪影，点击显示解锁条件

---

### 3.6 空状态 → 「开篇」

**现状：** 📝 emoji + 「暂无旅行记忆」+ 两个按钮

**改造后：**

```
┌─────────────────────────────────────────┐
│                                         │
│        （水墨晕染动画渐入 1.5s）          │
│                                         │
│         ┌───────────────────┐           │
│         │                   │           │
│         │   空白的墨卷       │           │  ← 展开的空白卷轴动画
│         │   (卷轴从中间展开)  │           │
│         │                   │           │
│         └───────────────────┘           │
│                                         │
│      「每一段旅程，都值得被铭记」          │  ← 书法体引言
│                                         │
│    让小灵带你开始灵山之旅的第一笔          │
│                                         │
│    ┌───────────────────────────────┐    │
│    │  ✒️  写下第一笔                │    │  ← 主按钮
│    └───────────────────────────────┘    │
│                                         │
│    ┌───────────────────────────────┐    │
│    │  💬  和小灵聊聊开始            │    │  ← 次按钮：跳转对话页
│    └───────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**改造要点：**

- 卷轴展开动画：`react-native-reanimated` scaleX 从 0 到 1
- 水墨晕染：径向渐变 + opacity 动画
- 书法引言：使用书法字体
- 主按钮：毛笔图标 ✒️ + 「写下第一笔」文案
- 次按钮：跳转对话页 `/chat`，让小灵引导用户

---

## 四、功能增强（4 个新功能）

### 4.1 「今日回顾」智能摘要

**功能描述：** 每天首次打开记忆页，顶部浮现一张「今日卡片」

**交互设计：**

```
┌─────────────────────────────────────────┐
│  ╭─────────────────────────────────────╮ │
│  │  📅 6月17日 · 今日回顾              │ │  ← 横向长卡，渐变色背景
│  │                                     │ │     颜色根据今日主要情绪
│  │  今天你拜访了灵山大佛和梵华宫，       │ │
│  │  在大佛脚下留下了最深刻的记忆。       │ │
│  │  一路心怀敬畏，这是一段禅意之旅。     │ │
│  │                                     │ │
│  │  [查看详情]                         │ │
│  ╰─────────────────────────────────────╯ │
│                                         │
│  （可左滑关闭，点击展开详情）              │
└─────────────────────────────────────────┘
```

**后端改动：**

```python
# backend/app/api/memory.py 新增端点
@router.post("/api/memory/today-review")
async def generate_today_review(session_id: str):
    """生成今日回顾"""
    today_memories = await memory_service.get_today_memories(session_id)
    if not today_memories:
        return None
    
    review = await llm_service.generate_review(today_memories)
    return {
        "date": "2026-06-17",
        "summary": review.summary,
        "mood": review.dominant_mood,
        "memory_count": len(today_memories),
        "spot_names": list(set(m.spot_name for m in today_memories if m.spot_name)),
    }
```

---

### 4.2 「记忆地图」视图切换

**功能描述：** 在时间线视图旁增加地图视图 toggle

**交互设计：**

```
┌─────────────────────────────────────────┐
│  [时间线]  [地图]   ← 视图切换           │
├─────────────────────────────────────────┤
│                                         │
│         🗺️ 灵山胜境简化地图              │
│                                         │
│    ┌───────────────────────────────┐    │
│    │                               │    │
│    │   ⑤  ┌───┐                    │    │
│    │   祥符 │ 😊│  (气泡大小=记忆数)  │    │
│    │       └───┘                    │    │
│    │            ③ ┌──────┐          │    │
│    │            九龙│ 🤩  │          │    │
│    │               └──────┘         │    │
│    │     ② ┌───┐                    │    │
│    │     梵宫│ 😌│                   │    │
│    │        └───┘    ① ┌────────┐   │    │
│    │               大佛 │ 🤩🤩🤩│   │    │
│    │                   └────────┘   │    │
│    │                                │    │
│    └───────────────────────────────┘    │
│                                         │
│  点击气泡 → 弹出该景点的所有记忆卡片      │
└─────────────────────────────────────────┘
```

**技术方案：**

- 使用 `react-native-svg` 绘制简化景区地图
- 气泡用 `react-native-reanimated` 做缩放动画
- 点击气泡 → BottomSheet 弹出该景点记忆列表
- 备选方案：`react-native-maps` + 自定义 Marker

---

### 4.3 「一键朋友圈」

**功能描述：** 自动生成 3-5 张适配朋友圈/小红书的方形图片

**交互设计：**

```
点击「生成朋友圈图文」后：

1. AI 将旅程总结拆分为 3-5 段文案
2. 每段配一张景点相关图（从 metadata_json 获取或默认图）
3. 生成 3:4 方形图片（1080×1440px）
4. 图片样式：水墨背景 + 书法文案 + 印章装饰 + 灵山标识
5. 预览页：左右滑动查看每张图
6. 操作：保存到相册 / 分享到微信
```

**技术方案：**

- 使用 `react-native-view-shot` 截图
- 图片模板用 `react-native-svg` 绘制
- 保存到相册：`expo-media-library`
- 分享：`expo-sharing`

---

### 4.4 「记忆胶囊」· 时间锁

**功能描述：** 允许用户写一条「给未来的自己」的记忆，设置开启时间

**交互设计：**

```
┌─────────────────────────────────────────┐
│  记忆时间线                              │
│                                         │
│  ●━━━━ 6/17 · 灵山大佛                  │
│  │     「初见大佛」                      │
│  │                                      │
│  ┌──────┐                               │
│  │ 🔒   │  给一年后的自己               │  ← 带锁胶囊
│  │      │  开启倒计时: 364 天           │
│  │      │  [写一封信]                   │
│  └──────┘                               │
│                                         │
│  ●━━━━ 6/16 · 拈花湾                    │
│  │     「禅意小镇」                      │
└─────────────────────────────────────────┘
```

**数据模型扩展：**

```python
# backend/app/models/memory.py 扩展
class TravelMemory(Base):
    # ... 现有字段 ...
    
    # 记忆胶囊字段
    is_capsule: bool = False                    # 是否为记忆胶囊
    capsule_unlock_at: datetime | None = None   # 解锁时间
    capsule_content: str | None = None          # 胶囊内容（给未来的信）
```

**技术方案：**

- 到期后通过推送通知提醒打开：`expo-notifications`
- 倒计时用 `react-native-reanimated` 数字动画
- 解锁动画：锁图标碎裂 + 胶囊打开

---

## 五、视觉规范升级

### 5.1 色彩系统

| 元素 | 现状 | 升级方案 |
|------|------|----------|
| 页面背景 | 纯色 `#F7F5F0` | 宣纸纹理 overlay（5% 透明度 noise 图） |
| 情绪色调 | 固定色条 | 根据主要情绪动态调整页面色调 |

**动态色调方案：**

```typescript
const MOOD_THEMES: Record<string, { bg: string; accent: string }> = {
  happy:     { bg: '#FDF6E3', accent: '#E8A838' },  // 暖黄
  calm:      { bg: '#E8F2EE', accent: '#6A9C89' },  // 青绿
  excited:   { bg: '#FCECE9', accent: '#C84B31' },  // 朱红
  thoughtful:{ bg: '#E8EEF4', accent: '#2A4D6E' },  // 靛蓝
  peaceful:  { bg: '#E8F2EE', accent: '#6BA292' },  // 茶绿
};
```

### 5.2 字体系统

| 用途 | 现状 | 升级方案 |
|------|------|----------|
| 标题 | 系统 bold | 书法体（需内嵌字体或使用 SVG 文字） |
| 正文 | 系统默认 | 楷体/仿宋（增强手写感） |
| 标注 | 系统默认 | 保持系统字体（保证可读性） |

**字体内嵌方案：**

```
software/mobile/assets/fonts/
├── ZCOOLXiaoWei-Regular.ttf    # 小薇体（标题）
├── LongCang-Regular.ttf         # 龙藏体（正文/手写感）
└── MaShanZheng-Regular.ttf      # 马善政楷书（书法标题）
```

```typescript
// app/_layout.tsx
import { useFonts } from 'expo-font';

function RootLayout() {
  const [fontsLoaded] = useFonts({
    'calligraphy': require('../assets/fonts/MaShanZheng-Regular.ttf'),
    'handwriting': require('../assets/fonts/LongCang-Regular.ttf'),
  });
  
  if (!fontsLoaded) return <SplashScreen />;
  return <Layout />;
}
```

### 5.3 动效规范

| 动效 | 触发时机 | 参数 | 技术 |
|------|----------|------|------|
| 墨滴扩散 | AI 润色开始 | 0.8s, ease-out | `withTiming` + scale |
| 逐字书写 | AI 润色完成 | 每字 50ms 延迟 | `withTiming` + opacity |
| 印章盖下 | 润色完成/情绪标记 | 0.4s, spring | `withSpring` + haptic |
| 卷轴展开 | 空状态进入 | 1.5s, ease-in-out | `withTiming` + scaleX |
| 云层漂移 | 持续 | 20s 周期 | `withRepeat` + translateX |
| 墨迹绘制 | 滚动时 | 跟随滚动进度 | `StrokeDashoffset` |
| 卡片入场 | 列表加载 | 60ms 错峰 | `FadeInUp.delay(index * 60)` |
| 卡片翻转 | 点击查看原文 | 0.5s, spring | `rotateY` + `withSpring` |

---

## 六、优先级排序与实施计划

### 6.1 优先级矩阵

| 优先级 | 改造项 | 工作量 | 冲击力 | 依赖 |
|--------|--------|--------|--------|------|
| 🔴 P0 | 记忆卡片 → 手帐页 | 中 (2-3天) | ⭐⭐⭐⭐⭐ | 字体内嵌 |
| 🔴 P0 | AI 润色 → 挥毫动画 | 中 (2天) | ⭐⭐⭐⭐⭐ | 无 |
| 🟡 P1 | Hero 区 → 水墨山水 + 路线图 | 高 (3-4天) | ⭐⭐⭐⭐ | SVG 路线图 |
| 🟡 P1 | 时间线 → 墨迹路径 | 中 (2天) | ⭐⭐⭐⭐ | 无 |
| 🟡 P1 | 空状态 → 开篇卷轴 | 低 (1天) | ⭐⭐⭐⭐ | 无 |
| 🟢 P2 | 记忆地图视图 | 高 (3-4天) | ⭐⭐⭐⭐ | SVG 地图 |
| 🟢 P2 | 今日回顾智能摘要 | 中 (2天) | ⭐⭐⭐ | 后端 API |
| 🟢 P2 | 一键朋友圈 | 中 (2-3天) | ⭐⭐⭐ | 图片模板 |
| 🔵 P3 | 记忆胶囊 | 中 (2-3天) | ⭐⭐⭐ | 数据模型扩展 |
| 🔵 P3 | 成就融入主线 | 低 (1-2天) | ⭐⭐⭐ | 无 |

### 6.2 实施阶段

```
Phase 1 (P0) — 核心体验升级                    预计 4-5 天
├── 内嵌书法字体 + 楷体
├── 记忆卡片 → 手帐页（宣纸纹理、印章情绪、翻转交互）
├── AI 润色 → 挥毫动画（墨滴扩散、逐字书写、印章盖下）
└── 触觉反馈接入

Phase 2 (P1) — 视觉氛围提升                    预计 6-7 天
├── Hero 区 → 水墨山水 + 浮动云层 + 卷首语
├── 水墨路线图（SVG + 景点节点）
├── 时间线 → 墨迹路径（SVG + 绘制动画）
├── 空状态 → 开篇卷轴动画
└── 后端：卷首语 API

Phase 3 (P2) — 功能增强                        预计 7-9 天
├── 今日回顾智能摘要（后端 + 前端卡片）
├── 记忆地图视图（SVG 地图 + 情绪气泡）
├── 一键朋友圈（图片模板 + 截图 + 分享）
└── 动态色调（根据情绪切换页面背景色）

Phase 4 (P3) — 深度功能                        预计 3-5 天
├── 记忆胶囊（数据模型 + 倒计时 + 推送通知）
├── 成就融入主线（时间线嵌入成就徽章）
└── 无障碍：减少动效检测
```

---

## 七、后端改动清单

### 7.1 新增 API 端点

| 端点 | 方法 | 说明 | 优先级 |
|------|------|------|--------|
| `/api/memory/hero-quote` | GET | 获取卷首语 | P1 |
| `/api/memory/today-review` | POST | 生成今日回顾 | P2 |
| `/api/memory/share-card/{id}` | GET | 获取单张分享卡片数据 | P2 |
| `/api/memory/capsule` | POST | 创建记忆胶囊 | P3 |
| `/api/memory/capsule/{id}/unlock` | POST | 解锁记忆胶囊 | P3 |

### 7.2 数据模型扩展

```python
# backend/app/models/memory.py

class TravelMemory(Base):
    __tablename__ = "travel_memories"
    # ... 现有字段 ...
    
    # 新增字段
    is_capsule: Mapped[bool] = mapped_column(default=False)
    capsule_unlock_at: Mapped[datetime | None] = mapped_column(nullable=True)
    capsule_content: Mapped[str | None] = mapped_column(nullable=True)
```

### 7.3 LLM 服务扩展

```python
# backend/app/services/memory_service.py

async def generate_hero_quote(session_id: str) -> str:
    """从最近记忆中提炼卷首语（5 字以内）"""
    ...

async def generate_today_review(session_id: str) -> dict:
    """生成今日回顾摘要"""
    ...

async def generate_share_cards(session_id: str) -> list[dict]:
    """将旅程总结拆分为 3-5 张分享卡片文案"""
    ...
```

---

## 八、新增依赖

### 8.1 前端

| 包名 | 用途 | 优先级 |
|------|------|--------|
| `react-native-svg` | SVG 墨迹时间线、路线图、地图 | P1 |
| `react-native-haptic-feedback` | 印章盖下触觉反馈 | P0 |
| `expo-media-library` | 保存图片到相册 | P2 |
| `expo-sharing` | 系统分享面板 | P2 |
| `react-native-view-shot` | 截图生成分享卡片 | P2 |
| `expo-font` | 内嵌书法字体 | P0 |

### 8.2 字体文件

| 字体 | 用途 | 来源 |
|------|------|------|
| MaShanZheng-Regular | 书法标题 | Google Fonts（开源） |
| LongCang-Regular | 手写正文 | Google Fonts（开源） |
| ZCOOLXiaoWei-Regular | 小薇体标注 | Google Fonts（开源） |

---

## 九、验收标准

### 9.1 Phase 1 验收

- [ ] 记忆卡片显示宣纸纹理背景
- [ ] 情绪标签显示为印章样式（旋转 ±3°）
- [ ] 点击已润色卡片可翻转查看原文
- [ ] AI 润色触发墨滴扩散 + 逐字书写动画
- [ ] 印章盖下动画 + 触觉反馈
- [ ] 书法字体正确渲染（标题/正文）

### 9.2 Phase 2 验收

- [ ] Hero 区显示水墨渐变背景 + 浮动云层
- [ ] 卷首语正确显示（5 字以内）
- [ ] 水墨路线图显示景点节点（已访问=实心，未访问=空心）
- [ ] 时间线显示墨迹效果 + 绘制动画
- [ ] 空状态显示卷轴展开动画

### 9.3 Phase 3 验收

- [ ] 今日回顾卡片在每天首次打开时显示
- [ ] 地图视图可切换，气泡正确显示
- [ ] 一键朋友圈可生成 3-5 张图片并分享
- [ ] 页面色调根据主要情绪动态变化

### 9.4 Phase 4 验收

- [ ] 记忆胶囊可创建、显示倒计时
- [ ] 到期后可解锁查看
- [ ] 成就徽章嵌入时间线正确位置

---

## 十、风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 字体文件过大 | 安装包体积增加 ~2-5MB | 只内嵌 2 个核心字体，其余用系统字体 |
| SVG 动画性能 | 低端机卡顿 | 减少 SVG 节点数，使用 `collapsible` 优化 |
| 动画过多导致耗电 | 电池消耗 | 接入 `AccessibilityInfo.isReduceMotionEnabled()` |
| 后端 LLM 调用延迟 | AI 润色等待时间长 | 添加 loading 动画，考虑流式输出 |
| 分享卡片截图模糊 | 高分屏适配 | 使用 `pixelRatio` 参数 |

---

## 十一、总结

**一句话概括：** 把「信息列表」变成「可以翻开的手帐」，让每一次滚动都有墨韵在指尖流淌。

**核心抓手是三个「感」：**

1. **仪式感** — 卷轴展开、印章盖下、挥毫落笔
2. **空间感** — 水墨路线图让记忆有「地理位置」
3. **惊喜感** — AI 润色的动画演绎、情绪色调变化、隐藏的记忆胶囊

---

**文档版本**: v1.0  
**创建日期**: 2026-06-17  
**状态**: 方案设计完成，待评审

---

## 2026-06-23 落地记录：首屏性能与可用性修复

- 记忆页主滚动容器改为单一虚拟列表，移除外层 `ScrollView` 包裹禁用滚动 `FlatList` 的结构，避免首屏全量布局记忆卡片。
- 首屏记忆数据改为分页读取，先渲染第一批记忆；摘要、用户档案、成就等次要数据延后加载。
- 本地 SQLite 记忆表增加 `session_id + created_at` 查询索引，批量保存记忆改为事务写入。
- 新增记忆页专用后台刷新，只同步记忆、档案、成就和旅程总结，不再进入页面就刷新路线列表。
- 记忆页接入现有景点缓存 hook，写记忆弹窗和地图视图可以拿到景点数据。
- 补充移动端 Jest 回归测试：记忆分页读取、记忆批量事务写入、记忆页后台刷新范围。
