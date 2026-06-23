# 灵山胜境移动端 UI/UX 优化方案

> **目标项目**: `software/mobile/` (React Native 0.76.9 + Expo 52)  
> **版本**: v2.0 | **日期**: 2026-06-10 | **状态**: 阶段 1-3 已完成

---

## 一、数字人浮窗导览系统

### 1.1 设计理念

将数字人从**独立的"对话页"**转变为**贯穿全 App 的"导览助手"**，提供上下文感知的智能讲解服务。

### 1.2 核心架构

```
┌──────────────────────────────────────────────────────┐
│          VRMFloating (组件级实例)                      │
│  ┌──────────┐  ┌──────────────────────────────────┐  │
│  │ VRM 渲染  │  │ API: speak(text, emotion)        │  │
│  │ (WebGL)  │  │      setExpression(emotion)       │  │
│  └──────────┘  └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                        │  (ref 调用)
        ┌───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ 首页    │    │ 景点列表 │    │ 景点详情 │    │ 历史页  │
   │ 欢迎语  │    │ 推荐讲解 │    │ 景点讲解 │    │ 朝代讲解│
   └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### 1.3 VRMFloating 组件

```typescript
// 组件位置: components/vrm/VRMFloating.tsx

interface VRMFloatingRef {
  speak: (text: string, emotion?: string) => void;
  setExpression: (emotion: string) => void;
}

interface VRMFloatingProps {
  position?: 'bottom-right' | 'bottom-left';
  onPress?: () => void;
}
```

### 1.4 页面上下文配置

| 页面 | 文件 | 自动欢迎语 | 触发时机 |
|------|------|-----------|----------|
| 首页 | `(tabs)/index.tsx` | "欢迎来到灵山胜境，让我为您导览吧" | 进入页面 1.5s 后 |
| 景点列表 | `attractions/index.tsx` | "为您推荐灵山大佛，来灵山不可错过" | 进入页面 1.2s 后 |
| 景点详情 | `attractions/[id].tsx` | "{景点名}，{概述}。有什么想了解的吗？" | 进入页面 0.8s 后 |
| 时空穿越 | `history/index.tsx` | "让我们一起穿越千年时光，感受灵山的历史变迁" | 进入页面 1s 后 |
| 旅行记忆 | `memory/index.tsx` | "您已打卡{N}个景点，还有{M}个等待探索" | 进入页面 1s 后 |
| 对话页 | `(tabs)/chat.tsx` | "欢迎来到灵山胜境！我是小灵..." | 进入页面 0.6s 后 |

### 1.5 交互流程

```
用户进入页面
    │
    ▼
┌─────────────────┐
│ VRMFloating 渲染 │ ← 右下角浮窗，常驻
│ (3D VRM 头像)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
自动播放     用户点击
欢迎语       浮窗
    │         │
    ▼         ▼
┌─────────┐ ┌─────────────────┐
│ 语音播报 │ │ 跳转对话页       │
│ (TTS)   │ │ /chat           │
└─────────┘ └─────────────────┘
```

---

## 二、触摸目标优化

### 2.1 规范标准

| 元素类型 | 最小尺寸 | 推荐尺寸 |
|----------|----------|----------|
| 按钮 | 44×44pt | 48×48pt |
| 图标按钮 | 44×44pt | 48×48pt |
| 列表项 | 44pt 高度 | 56pt 高度 |
| 输入框 | 44pt 高度 | 48pt 高度 |

### 2.2 已修复项

| 文件 | 元素 | 修改前 | 修改后 |
|------|------|--------|--------|
| `attractions/index.tsx` | 返回按钮 | 36×36 | **44×44** |
| `attractions/index.tsx` | 分类按钮 | paddingVertical: 7 | **minHeight: 44** |
| `attractions/[id].tsx` | 返回按钮 | 36×36 | **44×44** |
| `history/index.tsx` | 返回按钮 | 36×36 | **44×44** |
| `history/index.tsx` | 朝代节点 | 36×36 | **44×44** |
| `(tabs)/index.tsx` | 主按钮 | paddingVertical: 12 | **minHeight: 48** |
| `(tabs)/index.tsx` | 次按钮 | paddingVertical: 12 | **minHeight: 48** |
| `(tabs)/index.tsx` | "全部"按钮 | paddingVertical: 6 | **minHeight: 44** |
| `(tabs)/chat.tsx` | 快捷问题 | paddingVertical: 8 | **minHeight: 44** |
| `(tabs)/chat.tsx` | 发送按钮 | paddingVertical: 10 | **minHeight: 44** |
| `(tabs)/chat.tsx` | 语音按钮 | 42×42 | **44×44** |

---

## 三、安全区域适配

### 3.1 问题

在刘海屏/灵动岛设备上，内容可能被系统 UI 遮挡。

### 3.2 解决方案

使用 `useSafeAreaInsets()` 获取安全区域边距。

### 3.3 已适配页面

| 页面 | 顶部安全区 | 底部安全区 |
|------|-----------|-----------|
| `(tabs)/index.tsx` | Tab 栏处理 | ✅ |
| `(tabs)/chat.tsx` | ✅ | ✅ (输入栏) |
| `attractions/index.tsx` | ✅ (Header) | ✅ |
| `attractions/[id].tsx` | ✅ (Hero + 返回按钮) | ✅ |
| `history/index.tsx` | ✅ (Header) | ✅ |
| `memory/index.tsx` | ✅ (导航栏) | ✅ (列表底部) |

### 3.4 代码示例

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function AttractionListPage() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* 返回按钮、标题 */}
      </View>
      {/* ... */}
    </View>
  );
}
```

---

## 四、景点列表优化

### 4.1 分类 Tab 横向滚动

**问题**: 分类过多时溢出屏幕。  
**解决**: 改为横向 `ScrollView`。

```typescript
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.categoryRow}
>
  {CATEGORIES.map((cat) => (
    <Pressable
      key={cat.key}
      style={[styles.categoryBtn, active && styles.categoryBtnActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text>{cat.label}</Text>
    </Pressable>
  ))}
</ScrollView>
```

### 4.2 列表虚拟化

景点列表使用 `FlatList`，自动虚拟化渲染：

```typescript
<FlatList
  data={filtered}
  keyExtractor={(item) => item.id}
  renderItem={({ item, index }) => (
    <Animated.View entering={FadeInUp.delay(index * 60).duration(350)}>
      <SpotCard spot={item} onPress={() => handleSpotPress(item)} />
    </Animated.View>
  )}
/>
```

---

## 五、无障碍优化

### 5.1 已实现

| 特性 | 实现方式 |
|------|----------|
| 屏幕阅读器标签 | `accessibilityLabel` 用于印章、返回按钮 |
| 按钮角色 | `accessibilityRole="button"` |
| 选中状态 | `accessibilityState={{ selected: active }}` |
| 按压反馈 | `({ pressed }) => [..., pressed && { opacity: 0.85, scale: 0.97 }]` |
| 色彩对比度 | 正文 #5C554C on #F7F5F0 ≈ 6.3:1 ✅ |

### 5.2 待实现

| 特性 | 说明 |
|------|------|
| 减少动效 | `AccessibilityInfo.isReduceMotionEnabled()` |
| 屏幕阅读器完整支持 | 更多元素添加 `accessibilityLabel` |
| 动态字体 | 使用 `allowFontScaling` |

---

## 六、性能优化

### 6.1 已实现

| 优化 | 实现 |
|------|------|
| 列表虚拟化 | `FlatList` 自动回收屏幕外元素 |
| 动画性能 | `react-native-reanimated` UI 线程动画 |
| 入场动画延迟 | `FadeInUp.delay(index * 60)` 错峰渲染 |
| 图片懒加载 | React Native `Image` 默认懒加载 |

### 6.2 待实现

| 优化 | 说明 |
|------|------|
| VRM 帧率限制 | 浮窗模式降至 30fps |
| VRM 分辨率 | 浮窗模式降低 pixelRatio |
| 图片缓存 | 使用 `expo-image` 替代 `Image` |

---

## 七、实施进度

### 阶段 1：数字人浮窗系统 ✅ 已完成
- [x] VRMFloating 组件实现
- [x] 首页接入（自动欢迎语）
- [x] 景点列表接入（推荐讲解）
- [x] 景点详情接入（景点讲解）
- [x] 历史页接入（朝代讲解）
- [x] 记忆页接入（打卡统计）
- [x] 对话页保留（完整对话功能）

### 阶段 2：触摸目标优化 ✅ 已完成
- [x] 所有返回按钮 44×44
- [x] 所有功能按钮 minHeight ≥ 44
- [x] 主页主按钮 minHeight 48
- [x] 对话页快捷问题按钮 minHeight 44

### 阶段 3：安全区域适配 ✅ 已完成
- [x] 景点列表页顶部安全区
- [x] 景点详情页顶部安全区
- [x] 历史页顶部安全区
- [x] 记忆页导航栏安全区
- [x] 对话页输入栏底部安全区

### 阶段 4：列表与滚动优化 ✅ 已完成
- [x] 景点列表分类 Tab 横向滚动
- [x] FlatList 虚拟化（已有）
- [x] 精选景点横向滚动 + snapToInterval

### 阶段 5：无障碍增强 🔄 进行中
- [x] 基础 accessibilityLabel
- [x] accessibilityRole
- [x] accessibilityState
- [ ] 减少动效检测
- [ ] 完整屏幕阅读器支持

### 阶段 6：性能优化 🔄 待实施
- [ ] VRM 浮窗模式限帧
- [ ] expo-image 缓存
- [ ] 减少动效支持

---

## 八、技术架构

### 8.1 项目结构

```
software/mobile/
├── app/                        # expo-router 文件系统路由
│   ├── _layout.tsx             # 根布局 (Stack + 手机框架)
│   ├── (tabs)/                 # Tab 导航组
│   │   ├── _layout.tsx         # Tab 栏配置 (4 个 Tab)
│   │   ├── index.tsx           # 首页
│   │   ├── chat.tsx            # 对话页
│   │   ├── explore.tsx         # 探索页
│   │   └── leaderboard.tsx     # 排行榜
│   ├── attractions/
│   │   ├── index.tsx           # 景点列表
│   │   └── [id].tsx            # 景点详情
│   ├── history/index.tsx       # 历史探索
│   ├── memory/index.tsx        # 旅行记忆
│   └── ...
├── components/
│   └── vrm/
│       ├── VRMFloating.tsx     # 浮窗数字人
│       ├── VRMViewer.tsx       # VRM 渲染
│       └── VRMWebRenderer.tsx  # Web 端渲染器
├── constants/
│   ├── colors.ts               # 颜色系统
│   ├── typography.ts           # 字体系统
│   └── screen.ts               # 屏幕尺寸
└── api/
    ├── config.ts               # API 配置
    └── spots.ts                # 景点数据
```

### 8.2 关键依赖

| 库 | 用途 |
|----|------|
| `expo` ~52.0.0 | 应用框架 |
| `expo-router` ~4.0.0 | 文件系统路由 |
| `react-native` 0.76.9 | UI 框架 |
| `react-native-reanimated` ~3.16.0 | 高性能动画 |
| `react-native-safe-area-context` | 安全区域 |
| `@pixiv/three-vrm` | VRM 模型加载 |
| `three` | 3D 渲染 |

### 8.3 设计特点

- **固定手机框架**: Web 端渲染为 390×844 手机模型
- **东方美学**: 书法字体、水墨配色、印章装饰
- **上下文感知**: 每个页面触发不同的 VRM 讲解
- **按压反馈**: 所有可点击元素有 scale/opacity 反馈

---

## 九、设计原则

1. **数字人即导览** — 每个页面都有 VRMFloating 提供上下文讲解
2. **触摸优先** — 所有可交互元素 ≥ 44pt
3. **安全区域** — 适配刘海屏、底部手势条
4. **性能优先** — Reanimated UI 线程动画、FlatList 虚拟化
5. **无障碍基础** — 标签、角色、状态、按压反馈
6. **东方美学** — 书法体、朱红点缀、印章装饰

---

**文档版本**: v2.0  
**创建日期**: 2026-06-10  
**最后更新**: 2026-06-10  
**状态**: 阶段 1-4 完成，阶段 5-6 进行中
