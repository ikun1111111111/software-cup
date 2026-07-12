# Mobile Auth Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复登录 401 被误判为会话失效的问题，并将登录注册页升级为统一、精致、可访问的“宣纸雅致”灵山文旅体验。

**Architecture:** 将表单规则提取为纯函数、将重复视觉结构提取为鉴权 UI 组件；页面保留流程编排职责。请求层根据请求是否携带 Bearer Token 决定 401 是否触发全局退出，公开登录失败只返回表单错误。

**Tech Stack:** Expo Router、React Native 0.76、TypeScript、Axios、AsyncStorage、Jest/ts-jest。

---

## 文件结构

- Create: `software/mobile/features/auth/validation.ts` — 登录注册校验与密码强度纯函数。
- Create: `software/mobile/components/auth/AuthScreenShell.tsx` — 背景、键盘避让、滚动和品牌装饰。
- Create: `software/mobile/components/auth/AuthField.tsx` — 标签、输入、错误、密码显示切换。
- Create: `software/mobile/components/auth/AuthSubmitButton.tsx` — 主按钮加载、按压、禁用状态。
- Create: `software/mobile/__tests__/authValidation.test.ts` — 表单规则回归测试。
- Create: `software/mobile/__tests__/requestUnauthorized.test.ts` — 401 分类回归测试。
- Modify: `software/mobile/api/request.ts` — 仅带认证 Token 的请求触发全局未授权。
- Modify: `software/mobile/app/auth/login.tsx` — 使用共用组件和纯校验函数。
- Modify: `software/mobile/app/auth/register.tsx` — 使用共用组件和纯校验函数。
- Modify: `software/mobile/constants/colors.ts` — 仅补充鉴权页所需的语义色 Token。

### Task 1: 锁定表单校验行为

**Files:**
- Create: `software/mobile/__tests__/authValidation.test.ts`
- Create: `software/mobile/features/auth/validation.ts`

- [ ] **Step 1: 写失败测试**

测试应覆盖：空登录字段；用户名 3–20 位且只能包含字母、数字和下划线；昵称不超过 16 字符；密码 6–32 位；确认密码一致；密码强度返回 0–4。

```ts
import { getPasswordScore, validateLogin, validateRegister } from '../features/auth/validation';

test('rejects empty login fields', () => {
  expect(validateLogin('', '')).toEqual({ username: '请输入用户名', password: '请输入密码' });
});

test('validates the registration contract', () => {
  expect(validateRegister('ab', '', '123', '456')).toEqual({
    username: '用户名需为 3-20 位',
    password: '密码需为 6-32 位',
    confirmPassword: '两次输入的密码不一致',
  });
});

test('scores stronger passwords higher', () => {
  expect(getPasswordScore('123456')).toBeLessThan(getPasswordScore('Travel_2026!'));
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --runInBand __tests__/authValidation.test.ts`

Expected: FAIL，提示 `features/auth/validation` 不存在。

- [ ] **Step 3: 实现最小纯函数**

导出 `LoginErrors`、`RegisterErrors`、`validateLogin`、`validateRegister`、`getPasswordScore`。所有中文错误文案使用 UTF-8 正常文本，校验函数不依赖 React 状态。

- [ ] **Step 4: 运行测试确认 GREEN**

Run: `npm test -- --runInBand __tests__/authValidation.test.ts`

Expected: PASS，3 个测试全部通过。

- [ ] **Step 5: 提交**

```bash
git add software/mobile/features/auth/validation.ts software/mobile/__tests__/authValidation.test.ts
git commit -m "test(mobile): define auth form validation"
```

### Task 2: 修复公开登录 401 的全局跳转

**Files:**
- Create: `software/mobile/__tests__/requestUnauthorized.test.ts`
- Modify: `software/mobile/api/request.ts`

- [ ] **Step 1: 写失败测试**

通过 mock Axios instance 和 AsyncStorage，分别模拟：`/auth/login` 无 Authorization 返回 401；`/auth/me` 携带 `Bearer expired` 返回 401。断言前者不删除 Token、不 emit，后者删除 Token 并 emit。

```ts
test('does not emit global unauthorized for a public login failure', async () => {
  await expect(runRejectedResponse({ url: '/auth/login', headers: {}, status: 401 }))
    .rejects.toThrow('用户名或密码错误');
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  expect(onUnauthorized).not.toHaveBeenCalled();
});

test('clears the session for an authenticated request returning 401', async () => {
  await expect(runRejectedResponse({
    url: '/auth/me', headers: { Authorization: 'Bearer expired' }, status: 401,
  })).rejects.toThrow('Token 无效或已过期');
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --runInBand __tests__/requestUnauthorized.test.ts`

Expected: 第一条测试 FAIL，因为现有实现会对所有 401 清 Token 并 emit。

- [ ] **Step 3: 实现最小分类逻辑**

在 `request.ts` 增加可测试辅助函数 `hasBearerAuthorization(config)`；仅当失败请求的 headers 中存在非空 Bearer Token 时执行：

```ts
await AsyncStorage.removeItem('token');
invalidateTokenCache();
authEvents.emit();
```

无 Bearer Token 的 401 直接 `Promise.reject(new Error(getResponseMessage(error)))`。

- [ ] **Step 4: 运行相关测试确认 GREEN**

Run: `npm test -- --runInBand __tests__/requestUnauthorized.test.ts __tests__/authApi.test.ts`

Expected: PASS，且 API 相对路径测试保持通过。

- [ ] **Step 5: 提交**

```bash
git add software/mobile/api/request.ts software/mobile/__tests__/requestUnauthorized.test.ts
git commit -m "fix(mobile): distinguish login failure from expired session"
```

### Task 3: 构建共用鉴权视觉组件

**Files:**
- Create: `software/mobile/components/auth/AuthScreenShell.tsx`
- Create: `software/mobile/components/auth/AuthField.tsx`
- Create: `software/mobile/components/auth/AuthSubmitButton.tsx`
- Modify: `software/mobile/constants/colors.ts`

- [ ] **Step 1: 写组件契约测试或类型夹具**

在 `software/mobile/__tests__/authComponents.test.tsx` 中用 `react-test-renderer`（若现有依赖不可用则采用 TypeScript 编译夹具）验证：字段错误文本存在、密码切换有 `accessibilityLabel`、加载按钮为 disabled。

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --runInBand __tests__/authComponents.test.tsx`

Expected: FAIL，组件模块尚不存在。

- [ ] **Step 3: 实现组件**

`AuthScreenShell` 负责 `KeyboardAvoidingView + ScrollView`、宣纸背景、顶部淡山水装饰和最大内容宽度；`AuthField` 使用明确 label、最小 52px 输入高度、错误边框和眼睛图标/文本按钮；`AuthSubmitButton` 处理 `pressed/loading/disabled`，并保留 44px 以上触控面积。

- [ ] **Step 4: 运行测试与类型检查**

Run: `npm test -- --runInBand __tests__/authComponents.test.tsx`

Run: `npx tsc --noEmit`

Expected: 两条命令退出码均为 0。

- [ ] **Step 5: 提交**

```bash
git add software/mobile/components/auth software/mobile/constants/colors.ts software/mobile/__tests__/authComponents.test.tsx
git commit -m "feat(mobile): add polished auth form components"
```

### Task 4: 重构登录页并锁定错误交互

**Files:**
- Modify: `software/mobile/app/auth/login.tsx`
- Test: `software/mobile/__tests__/authValidation.test.ts`

- [ ] **Step 1: 增加失败测试**

补充用户名 trim 后为空的校验测试，并确认接口错误文案不会覆盖字段级错误。

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --runInBand __tests__/authValidation.test.ts`

Expected: 新增边界测试 FAIL。

- [ ] **Step 3: 最小修复并重构页面**

登录页改用共用组件；提交前调用 `validateLogin(username, password)`；请求期间禁止重复提交；失败时保留页面并展示服务端 detail；成功后 `router.replace('/(tabs)')`。保留游客入口和注册入口，所有乱码文案替换为正常 UTF-8 中文。

- [ ] **Step 4: 验证**

Run: `npm test -- --runInBand __tests__/authValidation.test.ts __tests__/requestUnauthorized.test.ts`

Run: `npx tsc --noEmit`

Expected: 全部通过。

- [ ] **Step 5: 提交**

```bash
git add software/mobile/app/auth/login.tsx software/mobile/__tests__/authValidation.test.ts
git commit -m "feat(mobile): polish login experience"
```

### Task 5: 重构注册页并统一成功流程

**Files:**
- Modify: `software/mobile/app/auth/register.tsx`
- Test: `software/mobile/__tests__/authValidation.test.ts`

- [ ] **Step 1: 增加失败测试**

补充非法字符用户名、17 字符昵称和密码边界测试。

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- --runInBand __tests__/authValidation.test.ts`

Expected: 新边界测试至少一项 FAIL。

- [ ] **Step 3: 最小修复并重构页面**

注册页使用共用组件和 `validateRegister`；密码强度只在有输入时显示；提交期间禁用按钮；服务端“用户名已存在”错误就地展示；注册成功继续使用现有 `useAuth.register` 自动保存 Token 并进入首页。替换全部乱码文案。

- [ ] **Step 4: 验证**

Run: `npm test -- --runInBand __tests__/authValidation.test.ts __tests__/authApi.test.ts`

Run: `npx tsc --noEmit`

Expected: 全部通过。

- [ ] **Step 5: 提交**

```bash
git add software/mobile/app/auth/register.tsx software/mobile/__tests__/authValidation.test.ts
git commit -m "feat(mobile): polish registration experience"
```

### Task 6: 完整验证与视觉检查

**Files:**
- Modify only if verification reveals an auth-scoped defect.

- [ ] **Step 1: 运行完整测试**

Run: `npm test -- --runInBand`

Expected: 0 failed tests。

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`

Expected: exit code 0。

- [ ] **Step 3: 启动 Web 预览**

Run: `npm run start -- --web --port 8081`

检查 320px、390px 和桌面窄栏：无横向滚动；输入、按钮和错误提示不重叠；键盘提交可用；加载状态稳定；登录错误不跳页。

- [ ] **Step 4: 用真实接口复测 401**

使用错误密码请求 `POST http://localhost:8000/api/auth/login`，确认响应仍为 401，但前端停留在登录页并展示“用户名或密码错误”。再使用失效 Token 请求受保护接口，确认全局退出仍生效。

- [ ] **Step 5: 清理并提交验证修复**

确认没有调试日志、临时文件或任务外改动；仅在验证产生必要修复时创建最终提交。
