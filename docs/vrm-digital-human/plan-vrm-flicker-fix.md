# VRM 模型闪烁/大小变化问题分析与修复方案

> 日期: 2026-06-17  
> 问题: VRM 模型一会大一会小，一会有一会消失

---

## 一、问题现象

| 现象 | 描述 |
|------|------|
| 模型一会大一会小 | 模型在页面上突然变大或变小 |
| 模型一会有一会消失 | 模型时而可见时而不可见 |
| 闪烁 | 模型在可见和不可见之间快速切换 |

---

## 二、根本原因分析

### 2.1 核心问题：VRM 模型被重复添加到 Scene

**文件**: `VRMManager.ts` → `dispose()` 方法

```typescript
dispose(): void {
  if (this.vrm) {
    this.vrm.scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) { ... }
    });
    this.vrm = null;  // ❌ 只置空引用，没有从父场景移除！
  }
  this.loadingPromise = null;
}
```

**问题链路**：

```
1. 页面A加载 → VRMView挂载 → onContextCreate → 创建Scene A → VRMManager.getOrLoad() → 加载VRM → sceneA.add(vrm.scene)
2. 导航到页面B → VRMView卸载 → dispose() → vrm = null（但vrm.scene仍在Scene A中！）
3. 页面B加载 → VRMView挂载 → onContextCreate → 创建Scene B → VRMManager.getOrLoad() → 返回同一个VRM实例
4. sceneB.add(vrm.scene) → ❌ 同一个vrm.scene同时存在于Scene A和Scene B中！
5. 两个Scene同时渲染同一个模型 → 冲突 → 闪烁/大小异常
```

### 2.2 次要问题：入场动画每次挂载都重播

**文件**: `VRMFloating.tsx`

```typescript
// 问题1: expandScale 每次挂载都从 0 动画到 1
useEffect(() => {
  expandScale.value = withSpring(1, { damping: 12 });
}, []);  // 组件每次挂载都会执行

// 问题2: enterY/enterOpacity 每次挂载都重播
useEffect(() => {
  const t = setTimeout(() => {
    enterY.value = withSpring(0, { damping: 14, stiffness: 120 });
    enterOpacity.value = withTiming(1, { duration: 500 });
  }, 800);
  return () => clearTimeout(t);
}, []);  // 组件每次挂载都会执行
```

**效果**：每次页面切换，模型都会从 scale=0 放大到 1，从下方滑入，透明度从 0 到 1。这就是"一会大一会小"的直接原因。

### 2.3 第三问题：GLView 重新创建导致闪烁

**文件**: `VRMView.tsx` → `onContextCreate`

每次组件挂载都会创建新的 GLView 和 WebGL 上下文。VRM 模型需要重新加载和添加到新场景。这个过程中：
- 模型加载期间：不可见
- 模型加载完成：突然出现
- 如果加载失败：显示空白

---

## 三、修复方案

### 方案 A：修复 VRMManager.dispose()（推荐）

**修改**: `VRMManager.ts` → `dispose()` 方法

```typescript
dispose(): void {
  if (this.vrm) {
    // ✅ 先从父场景移除，避免重复添加
    if (this.vrm.scene.parent) {
      this.vrm.scene.parent.remove(this.vrm.scene);
    }
    this.vrm.scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: any) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.vrm = null;
  }
  this.loadingPromise = null;
}
```

**优点**：最小改动，解决根本问题  
**缺点**：每次导航仍需重新加载模型（但不会冲突）

### 方案 B：不销毁 VRM 模型，只销毁渲染器（最优）

**修改**: `VRMView.tsx` → cleanup useEffect

```typescript
useEffect(() => {
  return () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // ✅ 只销毁渲染器，不销毁 VRM 模型
    rendererRef.current?.dispose();
    rendererRef.current = null;
    // 不调用 VRMManager.dispose()，保留模型实例
  };
}, []);
```

**修改**: `VRMView.tsx` → `onContextCreate`

```typescript
// 在添加模型到场景前，先从旧场景移除
try {
  const costume = costumeIdRef.current ? getCostume(costumeIdRef.current) : null;
  const modelFile = costume?.modelFile || 'avatar.vrm';
  const vrm = await VRMManager.getOrLoad(modelFile);
  
  // ✅ 确保模型不在其他场景中
  if (vrm.scene.parent) {
    vrm.scene.parent.remove(vrm.scene);
  }
  
  scene.add(vrm.scene);
  // ... 后续缩放和定位代码
} catch (e) {
  console.warn('[VRMView] Failed to load VRM:', e);
}
```

**优点**：模型只加载一次，导航时复用，性能最优  
**缺点**：需要确保模型在添加前从旧场景移除

### 方案 C：禁用入场动画（解决"一会大一会小"）

**修改**: `VRMFloating.tsx`

```typescript
// 方案1: 完全移除入场动画
const expandScale = useSharedValue(1);  // 直接设为 1，不动画
const enterY = useSharedValue(0);       // 直接设为 0，不动画
const enterOpacity = useSharedValue(1); // 直接设为 1，不动画

// 删除相关的 useEffect

// 方案2: 只在首次挂载时播放动画
const hasAnimatedRef = useRef(false);

useEffect(() => {
  if (hasAnimatedRef.current) return;  // 已播放过，跳过
  hasAnimatedRef.current = true;
  
  expandScale.value = withSpring(1, { damping: 12 });
  const t = setTimeout(() => {
    enterY.value = withSpring(0, { damping: 14, stiffness: 120 });
    enterOpacity.value = withTiming(1, { duration: 500 });
  }, 800);
  return () => clearTimeout(t);
}, []);
```

---

## 四、推荐实施顺序

| 步骤 | 修改文件 | 修改内容 | 优先级 |
|------|---------|---------|--------|
| 1 | `VRMView.tsx` | `onContextCreate` 中添加 `if (vrm.scene.parent) vrm.scene.parent.remove(vrm.scene)` | 高 |
| 2 | `VRMView.tsx` | cleanup 中移除 `VRMManager.dispose()` 调用（如果有） | 高 |
| 3 | `VRMFloating.tsx` | 将 `expandScale`、`enterY`、`enterOpacity` 初始值改为最终值 | 中 |
| 4 | `VRMManager.ts` | `dispose()` 中添加 `vrm.scene.parent?.remove(vrm.scene)` | 低（防御性） |

---

## 五、验证方法

1. **导航测试**：在首页和景点详情页之间快速切换 10 次，观察模型是否稳定
2. **大小一致性**：模型在不同页面上应该保持相同大小
3. **无闪烁**：模型应该始终可见，不会出现闪烁或消失
4. **性能监控**：使用 React DevTools Profiler 检查 VRMView 的渲染次数

---

## 六、技术细节

### VRM 模型生命周期

```
加载 → 添加到Scene → 渲染 → 从Scene移除 → (可选)销毁
  ↑                                              ↓
  └────────────── 复用时回到这里 ──────────────────┘
```

### Three.js Scene 添加规则

- 一个 Object3D 只能有一个 parent
- 添加到新场景前，必须先从旧场景移除
- `scene.add(obj)` 不会自动移除 obj 的旧 parent

### React Native 导航与组件生命周期

```
页面A → 导航到页面B
  ↓
VRMView(A) 卸载 → cleanup 执行
  ↓
VRMView(B) 挂载 → onContextCreate 执行
  ↓
如果 VRM 模型未从 Scene(A) 移除 → 冲突！
```

---

## 七、总结

**根本原因**：VRM 模型在页面切换时没有从旧场景移除，导致同一模型被添加到多个场景，产生渲染冲突。

**直接原因**：入场动画每次挂载都重播，导致模型从 scale=0 放大到 1。

**修复核心**：
1. 在添加模型到新场景前，先从旧场景移除
2. 禁用或优化入场动画，避免每次导航都重播
