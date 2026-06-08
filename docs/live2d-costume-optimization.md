# Live2D 数字人服装多样性优化方案

## 现状分析

| 组件 | 当前状态 |
|------|----------|
| `Live2DStage.tsx` | pixi-live2d-display + Cubism4，只有一个 haru 模型 |
| `avatarModels.ts` | 3 个 model ID 全部指向同一个 `haru_greeter_t03.model3.json` |
| `AvatarAppearance.tsx` | 有 skin/hair/outfit UI，但只映射到 expression 切换（无实际换装） |
| `AvatarConfig` 后端 | `appearance_json` 字段已支持存储 outfit 配置 |
| `RoleSelector.tsx` | 5 个角色切换（导游/佛祖/禅师/游客/徐霞客） |

**核心问题：** 当前 Live2D 只有 1 个模型文件，所谓的"换装"实际上只是切换表情（f00-f07），没有真正的服装变化。

---

## 技术路线：Live2D 多 Texture 切换

Live2D Cubism 4 支持在运行时动态替换纹理。方案是为同一模型准备多套纹理 PNG，通过 `model.internalModel.coreModel` 的纹理替换 API 实现换装，不需要多个完整模型文件。

---

## 服装体系设计

### 日常服装（3 套）

| ID | 名称 | 风格 | 适用场景 |
|----|------|------|----------|
| `daily-classic` | 素雅禅衣 | 米白/浅灰汉服，简约禅意 | 默认日常 |
| `daily-modern` | 新中式便装 | 改良旗袍元素，现代感 | 城市/商业场景 |
| `daily-artistic` | 水墨雅服 | 水墨风印花，飘逸感 | 文化/艺术场景 |

### 节日特定服装（6 套）

| ID | 名称 | 节日 | 时间 | 特征 |
|----|------|------|------|------|
| `festival-spring` | 锦绣红袍 | 春节 | 1月-2月 | 红色旗袍/汉服，金线刺绣 |
| `festival-lantern` | 灯彩华裳 | 元宵节 | 正月十五 | 彩灯元素，暖色调 |
| `festival-qingming` | 踏青轻衣 | 清明节 | 4月初 | 青绿色，春意盎然 |
| `festival-dragon` | 龙舟竞渡 | 端午节 | 五月初五 | 蓝白配色，龙纹点缀 |
| `festival-midautumn` | 月华裳 | 中秋节 | 八月十五 | 桂花金+月白，桂花元素 |
| `festival-national` | 锦绣华章 | 国庆节 | 10月1日 | 中国红+金，庄重大气 |

---

## 自动节日检测逻辑

```typescript
// useCostume.ts 核心逻辑
const FESTIVAL_MAP = [
  { id: 'festival-spring',     month: 1,  dayRange: [20, 2, 10] },  // 春节前后
  { id: 'festival-lantern',    month: 2,  dayRange: [14, 16] },     // 元宵
  { id: 'festival-qingming',   month: 4,  dayRange: [3, 6] },       // 清明
  { id: 'festival-dragon',     month: 6,  dayRange: [1, 10] },      // 端午(农历需转换)
  { id: 'festival-midautumn',  month: 9,  dayRange: [10, 20] },     // 中秋(农历需转换)
  { id: 'festival-national',   month: 10, dayRange: [1, 7] },       // 国庆
];

// 默认回退到日常3套轮换（按星期/用户偏好）
function getDailyCostume(): string {
  const day = new Date().getDay();
  return ['daily-classic', 'daily-modern', 'daily-artistic'][day % 3];
}
```

---

## 需要改动的文件

```
frontend/src/config/avatarModels.ts           -- 扩展服装配置 + 节日映射
frontend/src/config/costumeMap.ts             -- 新建：服装ID → 纹理路径映射
frontend/src/hooks/useCostume.ts              -- 新建：自动节日检测 + 服装切换逻辑
frontend/src/components/DigitalHuman/Live2DStage.tsx  -- 添加纹理替换能力
frontend/src/components/admin/AvatarAppearance.tsx    -- 更新服装选项
backend/app/models/avatar.py                  -- appearance_json 扩展字段
```

---

## 实现步骤

1. **准备纹理素材** — 为 haru 模型制作 9 套服装纹理 PNG（需美术支持） — 待美术
2. **`costumeMap.ts`** — 服装 ID 到纹理文件的映射表 — 已完成
3. **`useCostume.ts`** — 节日自动检测 + 日常轮换 + 用户手动覆盖 — 已完成
4. **`Live2DStage.tsx`** — 添加 `switchTexture(costumeId)` 方法 — 已完成
5. **`AvatarAppearance.tsx`** — 更新服装选项为新的 9 套 — 已完成
6. **后端** — `appearance_json` 增加 `costumeId` 和 `costumeMode`（auto/manual）字段 — 已完成

---

## 已完成改动

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/config/costumeMap.ts` | 新建 | 9 套服装定义 + 纹理路径 + 节日日期映射 |
| `frontend/src/hooks/useCostume.ts` | 新建 | 自动节日检测 + 日常轮换 + localStorage 手动覆盖 |
| `frontend/src/components/DigitalHuman/Live2DStage.tsx` | 修改 | 添加 `switchTexture` 方法 + `texturePath` prop + 纹理切换 useEffect |
| `frontend/src/components/DigitalHuman/DigitalHuman.tsx` | 修改 | 透传 `texturePath` 到 Live2DStage |
| `frontend/src/components/admin/AvatarAppearance.tsx` | 重写 | 9 套服装 UI + 自动/手动切换 + 日常/节日分组 |
| `frontend/src/config/avatarModels.ts` | 修改 | 添加 `getCostumeTexturePath()` |
| `backend/app/api/avatar.py` | 修改 | `appearance_json` 字段文档更新 |
| `frontend/public/models/haru/textures/` | 新建 | 纹理素材目录 + README |

### 待完成

- [ ] 美术制作 9 套服装纹理 PNG（规格：2048x2048，匹配 haru 模型 UV 布局）
- [ ] 将纹理文件放入 `frontend/public/models/haru/textures/`
- [ ] 联动 ChatPage，将 useCostume 的 texturePath 传入 DigitalHuman 组件

---

## 优先级建议

| 优先级 | 内容 | 理由 |
|--------|------|------|
| **P0** | 日常 3 套 | 直接提升日常多样性 |
| **P1** | 春节 + 国庆 | 最大旅游高峰期 |
| **P2** | 其余 4 个节日 | 锦上添花 |
