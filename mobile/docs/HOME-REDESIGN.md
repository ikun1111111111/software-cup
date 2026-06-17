# 主页优化方案：卷轴叙事 + 细节打磨

> 目标：让主页各区块有"卷轴展开"的节奏感和水墨氛围，细节处提升品质。
> 范围：`app/(tabs)/index.tsx` 主页 + `VRMFloating.tsx`，Hero 不动。
> 约束：数字人仅文字触发，不随机动作。

---

## 一、改动概览

```
┌─────────────────────────────────┐
│  Hero (不改)                    │
├─────────────────────────────────┤
│  ～～水墨笔触分隔线～～ ← 新增  │
├─────────────────────────────────┤
│  探索灵山                       │
│  - 卡片 stagger 入场 ← 新增    │
│  - 悬浮上浮+发光 ← 新增        │
├─────────────────────────────────┤
│  ～～水墨笔触分隔线～～ ← 新增  │
├─────────────────────────────────┤
│  关于灵山                       │
│  - 水墨晕染背景 ← 新增         │
│  - 文字卷轴展开 ← 新增         │
│  - 四角呼吸光效 ← 新增         │
├─────────────────────────────────┤
│  ～～水墨笔触分隔线～～ ← 新增  │
├─────────────────────────────────┤
│  精选景点                       │
│  - 滑动引导提示 ← 新增         │
│  - 当前卡片上浮 ← 新增         │
├─────────────────────────────────┤
│  页脚                           │
└─────────────────────────────────┘
│  数字人 ← 浮现入场              │
```

---

## 二、功能卡片：卷轴展开 + 悬浮效果

### 2.1 滚动触发 + Stagger 入场

**现状**：7 个卡片同时出现，无节奏。

**改为**：滚动到视口时，卡片依次从下方浮现，间隔 80ms。

```tsx
function FeatureSection() {
  const inView = useSharedValue(false);
  const sectionRef = useRef<View>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      sectionRef.current?.measureInWindow((x, y, w, h) => {
        if (y < SCREEN_H * 0.8 && !inView.value) inView.value = true;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <View ref={sectionRef} style={styles.feat}>
      <View style={styles.featGrid}>
        {FEATURES.map((f, index) => (
          <FeatureCard key={f.to} feature={f} index={index} inView={inView} />
        ))}
      </View>
    </View>
  );
}

function FeatureCard({ feature, index, inView }: { ... }) {
  const hovered = useSharedValue(false);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: inView.value ? withTiming(1, { delay: index * 80, duration: 400 }) : 0,
    transform: [
      { translateY: inView.value ? withTiming(0, { delay: index * 80 }) : 30 },
      { scale: hovered.value ? withTiming(1.05) : 1 },
    ],
    shadowOpacity: hovered.value ? withTiming(0.15) : 0.04,
    shadowRadius: hovered.value ? withTiming(16) : 4,
  }));

  return (
    <Animated.View style={[styles.featCard, cardStyle]}>
      <Pressable
        onHoverIn={() => { hovered.value = true; }}
        onHoverOut={() => { hovered.value = false; }}
        onPress={() => InkTransition.trigger(() => router.push(feature.to))}
      >
        {/* ... */}
      </Pressable>
    </Animated.View>
  );
}
```

### 2.2 卡片悬浮：上浮 + 阴影 + 边框发光

```tsx
// 悬浮时整卡上浮 4px，底部出现天青色光晕
const cardStyle = useAnimatedStyle(() => ({
  transform: [
    { translateY: hovered.value ? withTiming(-4) : withTiming(0) },
  ],
  shadowColor: hovered.value ? Colors.primary : Colors.ink,
  shadowOpacity: hovered.value ? 0.2 : 0.04,
  shadowRadius: hovered.value ? 16 : 4,
}));
```

### 2.3 图标微动（悬浮时）

```tsx
// 悬浮时图标轻微上浮 2px
const iconStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: hovered.value ? withTiming(-2) : withTiming(0) }],
}));
```

---

## 三、"关于灵山"：水墨氛围 + 卷轴展开

### 3.1 背景：水墨晕染

用纯 RN View 模拟水墨晕染（不引入 SVG 依赖）：

```tsx
// 多层径向渐变模拟水墨
<View style={styles.introWrap}>
  {/* 左上角墨晕 */}
  <View style={styles.inkBlot1} />
  {/* 右下角墨晕 */}
  <View style={styles.inkBlot2} />
  {/* 内容 */}
  <Text style={styles.introTxt}>灵山胜境，坐落于太湖之滨...</Text>
</View>
```

```tsx
// styles
inkBlot1: {
  position: 'absolute', top: -30, left: -20,
  width: 200, height: 200, borderRadius: 100,
  backgroundColor: 'rgba(107,162,146,0.06)',
},
inkBlot2: {
  position: 'absolute', bottom: -20, right: -30,
  width: 250, height: 180, borderRadius: 90,
  backgroundColor: 'rgba(42,77,110,0.04)',
},
```

### 3.2 文字卷轴展开

滚动到视口时，两段文字依次从透明到可见 + 上移：

```tsx
const text1Style = useAnimatedStyle(() => ({
  opacity: inView.value ? withTiming(1, { duration: 600 }) : 0,
  transform: [{ translateY: inView.value ? withTiming(0, { duration: 600 }) : 20 }],
}));

const text2Style = useAnimatedStyle(() => ({
  opacity: inView.value ? withTiming(1, { duration: 600, delay: 200 }) : 0,
  transform: [{ translateY: inView.value ? withTiming(0, { duration: 600, delay: 200 }) : 20 }],
}));
```

### 3.3 四角装饰：呼吸光效

```tsx
// 四角 L 形装饰线，3秒循环呼吸
const breath = useSharedValue(0.3);
useEffect(() => {
  breath.value = withRepeat(
    withSequence(
      withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
    ),
    -1, true,
  );
}, []);

const cornerStyle = useAnimatedStyle(() => ({
  opacity: breath.value,
  borderColor: Colors.primary,
}));
```

---

## 四、景点轮播：手势引导 + 卡片悬浮

### 4.1 首次进入显示滑动引导

```tsx
const [showHint, setShowHint] = useState(true);

useEffect(() => {
  const t = setTimeout(() => setShowHint(false), 2500);
  return () => clearTimeout(t);
}, []);

// 在轮播上方显示提示，2.5秒后淡出
{showHint && (
  <Animated.View style={[styles.swipeHint, { opacity: showHint ? 1 : 0 }]}>
    <Text style={styles.swipeHintText}>← 左右滑动探索更多 →</Text>
  </Animated.View>
)}
```

```tsx
swipeHint: {
  alignItems: 'center', paddingVertical: 8,
},
swipeHintText: {
  fontSize: 11, color: Colors.gray400, letterSpacing: 2,
},
```

### 4.2 当前卡片上浮 + 阴影加深

```tsx
// 根据 activeIdx 判断当前卡片
const cardAnimStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: isActive ? withTiming(-4) : withTiming(0) }],
  shadowOpacity: isActive ? withTiming(0.12) : 0.06,
  shadowRadius: isActive ? withTiming(12) : 8,
}));
```

---

## 五、区块间：水墨笔触分隔线

### 新增 `BrushDivider` 组件

用纯 RN View 实现水墨笔触效果（无需 SVG 依赖）：

```tsx
// components/ui/BrushDivider.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export function BrushDivider() {
  return (
    <View style={styles.wrap}>
      {/* 主笔触 */}
      <View style={styles.stroke} />
      {/* 墨点装饰 */}
      <View style={styles.dot1} />
      <View style={styles.dot2} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'transparent',
  },
  stroke: {
    width: 120,
    height: 1.5,
    backgroundColor: Colors.ink,
    opacity: 0.12,
    borderRadius: 1,
  },
  dot1: {
    position: 'absolute',
    left: '38%',
    top: '50%',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.ink,
    opacity: 0.08,
  },
  dot2: {
    position: 'absolute',
    right: '35%',
    top: '55%',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.ink,
    opacity: 0.06,
  },
});
```

### 使用

```tsx
<HeroSection />
<FeatureSection />
<BrushDivider />
<IntroSection />
<BrushDivider />
<FeaturedSpots />
<FooterSection />
```

---

## 六、数字人入场：浮现效果

### 改动 `VRMFloating.tsx`

```tsx
// 新增浮现动画
const enterY = useSharedValue(80);
const enterOpacity = useSharedValue(0);

useEffect(() => {
  const t = setTimeout(() => {
    enterY.value = withSpring(0, { damping: 14, stiffness: 120 });
    enterOpacity.value = withTiming(1, { duration: 500 });
  }, 800);
  return () => clearTimeout(t);
}, []);

// 合并到现有 containerStyle
const containerStyle = useAnimatedStyle(() => ({
  transform: [
    { translateX: offsetX.value },
    { translateY: offsetY.value + enterY.value },
    { scale: expandScale.value },
  ],
  opacity: enterOpacity.value,
}));
```

---

## 七、实施清单

### Phase 2：卷轴叙事感（2天）

- [x] 1. 功能卡片 stagger 入场（间隔 80ms，从下方 30px 浮现）
- [x] 2. 卡片悬浮效果（上浮 4px + 阴影加深 + 天青色光晕）
- [x] 3. 图标悬浮微动（上浮 2px）
- [x] 4. "关于灵山"水墨晕染背景（2 个圆形色块）
- [x] 5. "关于灵山"文字依次浮现（间隔 200ms）
- [x] 6. 四角装饰呼吸光效（3秒循环）

### Phase 3：细节打磨（1天）

- [x] 7. 景点轮播滑动引导提示（2.5秒后淡出）
- [x] 8. 景点卡片当前项上浮 + 阴影加深
- [x] 9. 新增 `BrushDivider` 组件
- [x] 10. 区块间插入水墨分隔线
- [x] 11. 数字人浮现入场（从底部 80px 上移 + 淡入，延迟 800ms）

---

## 八、文件改动清单

| 文件 | 改动 | 说明 |
|------|------|------|
| `app/(tabs)/index.tsx` | 中改 | 卡片入场、水墨背景、轮播引导、分隔线 |
| `components/vrm/VRMFloating.tsx` | 小改 | 入场动画改为浮现 |
| `components/ui/BrushDivider.tsx` | 新增 | 水墨分隔线组件（纯 RN View） |

---

## 九、验收标准

- [x] 功能卡片依次入场，间隔 80ms，从下方 30px 浮现
- [x] 卡片悬浮时上浮 4px + 阴影加深 + 天青色光晕
- [x] "关于灵山"有水墨晕染背景（2 个圆形色块）
- [x] "关于灵山"两段文字依次浮现，间隔 200ms
- [x] 四角装饰线呼吸光效（opacity 0.3 ↔ 0.6）
- [x] 景点轮播首次进入显示"← 左右滑动探索更多 →"提示
- [x] 当前激活卡片上浮 4px + 阴影加深
- [x] 区块间有水墨笔触分隔线
- [x] 数字人从底部 80px 浮现，延迟 800ms
- [x] 所有动画在 60fps 下流畅运行

---

**预计工时**：3天
**优先级**：Phase 2 → Phase 3
