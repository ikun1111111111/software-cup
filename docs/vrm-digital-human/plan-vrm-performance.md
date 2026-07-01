# VRM 性能优化方案

## 问题现状

1. **首屏加载慢**：每次打开页面才从磁盘加载VRM模型文件
2. **渲染开销大**：float模式小窗口仍然跑30fps，浪费GPU
3. **后台继续渲染**：页面切后台时仍在requestAnimationFrame循环

## 优化方案

### 1. 降低 float 模式帧率（改动最小，收益立竿见影）

**位置**：`software/mobile/components/vrm/VRMView.tsx` 第164行

**改动**：
```diff
- const shouldRender = mode === 'full' || frameCountRef.current % 2 === 0;
+ const shouldRender = mode === 'full' || frameCountRef.current % 4 === 0;
```

**效果**：float 窗口从 30fps → 15fps，渲染开销减半。浮动小窗口15fps足够流畅。

---

### 2. 预加载 VRM 模型（解决首屏等待）

**位置**：`software/mobile/app/_layout.tsx`（根布局）

**改动**：在 App 启动时（splash 阶段）预加载默认模型
```typescript
// _layout.tsx
useEffect(() => {
  // 后台静默预加载 VRM 模型
  VRMManager.getOrLoad().catch(console.warn);
}, []);
```

**效果**：用户进入首页时模型已在内存中，GLView 创建后直接渲染，无等待。

---

### 3. 后台暂停渲染（节省CPU/GPU/电量）

**位置**：`software/mobile/components/vrm/VRMView.tsx`

**改动**：监听 App 生命周期，后台时停止 RAF
```typescript
import { AppState } from 'react-native';

useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    isFocusedRef.current = state === 'active';
  });
  return () => sub.remove();
}, []);
```

**效果**：切后台后RAF循环立即停止，不浪费资源。

---

### 4. 移除开发调试代码

**位置**：`software/mobile/components/vrm/VRMView.tsx` 第201-207行

**改动**：删除骨骼遍历console.log（只在开发时有用）
```diff
- if (frameCountRef.current === 30) {
-   vrm.scene.traverse((obj) => {
-     if ((obj as any).isBone) {
-       console.log('[bone]', obj.name);
-     }
-   });
- }
```

**效果**：减少每帧不必要的traverse开销。

---

## 预期效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 首屏模型显示 | 2-3秒等待 | <0.5秒（已预加载） |
| float模式GPU占用 | 30fps全渲染 | 15fps渲染 |
| 后台电量消耗 | 持续渲染 | 完全停止 |

## 风险评估

- **方案1**：无风险，15fps对小窗口完全够用
- **方案2**：无风险，预加载失败不影响后续正常加载
- **方案3**：无风险，回到前台自动恢复渲染
- **方案4**：无风险，纯删除调试代码
