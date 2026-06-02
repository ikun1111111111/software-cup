# 模块B · 全部前端 · 项目计划书

## 项目概述
- **项目名称：** 智慧旅游数字人导览系统 - 前端模块
- **技术栈：** React 18 + TypeScript + Vite + Ant Design 5 + ECharts 5 + pixi-live2d-display + Zustand
- **文件总数：** 42
- **负责人：** 队员2
- **开发周期：** Week 2-6

## 文件计划

---

### B-001 游客端对话主界面

---

#### 文件1：frontend/src/api/request.ts

**功能描述：**
HTTP请求封装，基于axios创建统一的请求实例，包含拦截器、错误处理、Token管理。

**功能函数：**
- `createAxiosInstance()`：创建axios实例，配置baseURL、超时时间
- `requestInterceptor(config)`：请求拦截器，添加Token、日志
- `responseInterceptor(response)`：响应拦截器，处理错误码、刷新Token
- `handleError(error)`：统一错误处理，显示错误提示
- `get(url, params)`：GET请求封装
- `post(url, data)`：POST请求封装
- `put(url, data)`：PUT请求封装
- `del(url)`：DELETE请求封装

**调试检测点：**
1. 输入验证：验证请求URL格式正确性
2. 逻辑验证：验证Token是否正确添加到请求头
3. 输出验证：验证响应数据格式是否符合预期
4. 边界检测：验证网络超时、服务器500错误处理
5. 性能检测：验证请求响应时间<200ms

**测试方案：**
- 单元测试：测试请求拦截器、响应拦截器
- 集成测试：测试与后端API交互
- 端到端测试：测试完整请求流程

**预期测试结果：**
- 预期结果1：请求成功时返回正确数据格式
- 预期结果2：请求失败时显示错误提示
- 预期结果3：Token过期时自动刷新

---

#### 文件2：frontend/src/api/chat.ts

**功能描述：**
对话API封装，提供对话相关的接口调用。

**功能函数：**
- `sendMessage(sessionId, content)`：发送文本消息
- `sendAudio(sessionId, audioBlob)`：发送语音消息
- `getHistory(sessionId, page)`：获取对话历史
- `clearHistory(sessionId)`：清空对话历史

**调试检测点：**
1. 输入验证：验证sessionId和content格式
2. 逻辑验证：验证请求参数是否正确传递
3. 输出验证：验证返回数据结构完整
4. 边界检测：验证空消息、超长消息处理
5. 性能检测：验证消息发送延迟<100ms

**测试方案：**
- 单元测试：测试各个API函数
- 集成测试：测试与request模块交互
- 端到端测试：测试完整对话流程

**预期测试结果：**
- 预期结果1：消息发送成功返回消息ID
- 预期结果2：历史记录分页正确
- 预期结果3：清空历史后列表为空

---

#### 文件3：frontend/src/api/recommend.ts

**功能描述：**
推荐API封装，提供路线推荐和游客画像接口。

**功能函数：**
- `getRoutes(interests)`：获取路线推荐
- `getProfile()`：获取游客画像
- `updateProfile(data)`：更新游客画像

**调试检测点：**
1. 输入验证：验证interests参数格式
2. 逻辑验证：验证推荐算法调用正确
3. 输出验证：验证推荐结果包含路线详情
4. 边界检测：验证空兴趣、无效兴趣处理
5. 性能检测：验证推荐响应时间<500ms

**测试方案：**
- 单元测试：测试推荐API函数
- 集成测试：测试与后端推荐服务交互
- 端到端测试：测试完整推荐流程

**预期测试结果：**
- 预期结果1：根据兴趣返回相关路线
- 预期结果2：游客画像读取正确
- 预期结果3：画像更新成功

---

#### 文件4：frontend/src/stores/chatStore.ts

**功能描述：**
对话状态管理，使用Zustand管理对话历史、当前会话、加载状态。

**功能函数：**
- `addMessage(message)`：添加消息到历史
- `setStreaming(isStreaming)`：设置流式接收状态
- `clearMessages()`：清空消息历史
- `setCurrentSession(sessionId)`：设置当前会话ID
- `setError(error)`：设置错误信息

**调试检测点：**
1. 输入验证：验证消息对象格式
2. 逻辑验证：验证状态更新逻辑正确
3. 输出验证：验证状态变化后组件重新渲染
4. 边界检测：验证空消息、重复消息处理
5. 性能检测：验证大量消息时状态更新流畅

**测试方案：**
- 单元测试：测试各个状态更新函数
- 集成测试：测试与组件交互
- 端到端测试：测试完整对话状态流转

**预期测试结果：**
- 预期结果1：消息添加后列表更新
- 预期结果2：流式状态正确切换
- 预期结果3：清空后消息列表为空

---

#### 文件5：frontend/src/stores/userStore.ts

**功能描述：**
用户状态管理，管理用户信息、登录状态、偏好设置。

**功能函数：**
- `setUser(userInfo)`：设置用户信息
- `clearUser()`：清除用户信息
- `setPreferences(prefs)`：设置用户偏好
- `isAuthenticated()`：判断是否已登录

**调试检测点：**
1. 输入验证：验证用户信息格式
2. 逻辑验证：验证登录状态判断逻辑
3. 输出验证：验证状态持久化正确
4. 边界检测：验证Token过期、用户信息缺失
5. 性能检测：验证状态读取速度

**测试方案：**
- 单元测试：测试用户状态函数
- 集成测试：测试与认证模块交互
- 端到端测试：测试完整登录流程

**预期测试结果：**
- 预期结果1：用户信息设置正确
- 预期结果2：登录状态判断准确
- 预期结果3：清除后状态为空

---

#### 文件6：frontend/src/hooks/useSSE.ts

**功能描述：**
SSE（Server-Sent Events）流式接收Hook，处理AI回复的逐字显示。

**功能函数：**
- `useSSE(url, options)`：SSE Hook主函数
- `connect()`：建立SSE连接
- `disconnect()`：断开SSE连接
- `onMessage(callback)`：注册消息回调
- `onError(callback)`：注册错误回调

**调试检测点：**
1. 输入验证：验证SSE URL格式
2. 逻辑验证：验证消息解析逻辑正确
3. 输出验证：验证逐字显示效果
4. 边界检测：验证网络断开、服务端错误
5. 性能检测：验证流式接收延迟<100ms

**测试方案：**
- 单元测试：测试SSE连接管理
- 集成测试：测试与后端SSE服务交互
- 端到端测试：测试完整流式对话

**预期测试结果：**
- 预期结果1：SSE连接成功建立
- 预期结果2：消息逐字接收正确
- 预期结果3：断开连接后资源释放

---

#### 文件7：frontend/src/hooks/useWebSocket.ts

**功能描述：**
WebSocket信令封装Hook，处理音频流双向通信。

**功能函数：**
- `useWebSocket(url)`：WebSocket Hook主函数
- `connect()`：建立WebSocket连接
- `send(data)`：发送数据
- `close()`：关闭连接
- `onMessage(callback)`：注册消息回调

**调试检测点：**
1. 输入验证：验证WebSocket URL格式
2. 逻辑验证：验证消息收发逻辑
3. 输出验证：验证音频数据传输完整
4. 边界检测：验证连接断开重连机制
5. 性能检测：验证音频流传输延迟<200ms

**测试方案：**
- 单元测试：测试WebSocket连接管理
- 集成测试：测试与后端WebSocket服务交互
- 端到端测试：测试完整音频通信

**预期测试结果：**
- 预期结果1：WebSocket连接成功
- 预期结果2：音频数据传输正确
- 预期结果3：断开后自动重连

---

#### 文件8：frontend/src/hooks/useVoiceRecord.ts

**功能描述：**
语音录制Hook，使用MediaRecorder API实现录音功能。

**功能函数：**
- `useVoiceRecord()`：语音录制Hook主函数
- `startRecording()`：开始录音
- `stopRecording()`：停止录音
- `getAudioBlob()`：获取录音文件
- `isRecording()`：判断是否正在录音

**调试检测点：**
1. 输入验证：验证麦克风权限获取
2. 逻辑验证：验证录音启停逻辑
3. 输出验证：验证音频文件格式正确
4. 边界检测：验证无权限、设备不可用
5. 性能检测：验证录音质量、文件大小

**测试方案：**
- 单元测试：测试录音控制函数
- 集成测试：测试与音频处理模块交互
- 端到端测试：测试完整语音输入流程

**预期测试结果：**
- 预期结果1：录音成功开始和停止
- 预期结果2：音频文件格式为webm/wav
- 预期结果3：无权限时给出提示

---

#### 文件9：frontend/src/components/DigitalHuman/ChatBubble.tsx

**功能描述：**
对话气泡组件，展示用户和AI的消息，支持流式显示。

**功能函数：**
- `ChatBubble({ message, isUser })`：对话气泡主组件
- `renderContent(content)`：渲染消息内容
- `renderStreaming(text)`：渲染流式文本
- `formatTime(timestamp)`：格式化时间

**调试检测点：**
1. 输入验证：验证消息对象格式
2. 逻辑验证：验证用户/AI气泡样式区分
3. 输出验证：验证消息内容显示完整
4. 边界检测：验证空消息、超长消息
5. 性能检测：验证大量消息渲染流畅

**测试方案：**
- 单元测试：测试气泡渲染
- 集成测试：测试与对话状态交互
- 端到端测试：测试完整对话显示

**预期测试结果：**
- 预期结果1：用户消息显示在右侧
- 预期结果2：AI消息显示在左侧
- 预期结果3：流式文本逐字显示

---

#### 文件10：frontend/src/components/DigitalHuman/VoiceInput.tsx

**功能描述：**
语音输入按钮组件，支持长按录音、松开发送。

**功能函数：**
- `VoiceInput({ onSend })`：语音输入主组件
- `handleMouseDown()`：按下开始录音
- `handleMouseUp()`：松开停止录音
- `handleTouchStart()`：触摸开始录音
- `handleTouchEnd()`：触摸停止录音

**调试检测点：**
1. 输入验证：验证麦克风权限
2. 逻辑验证：验证长按/短按区分
3. 输出验证：验证录音文件生成
4. 边界检测：验证快速点击、取消操作
5. 性能检测：验证录音响应速度

**测试方案：**
- 单元测试：测试按钮交互
- 集成测试：测试与录音Hook交互
- 端到端测试：测试完整语音输入

**预期测试结果：**
- 预期结果1：长按开始录音
- 预期结果2：松开停止并发送
- 预期结果3：录音中显示动画反馈

---

#### 文件11：frontend/src/pages/tourist/ChatPage.tsx

**功能描述：**
对话主界面，整合对话气泡、输入框、语音按钮、推荐面板。

**功能函数：**
- `ChatPage()`：对话页面主组件
- `handleSendText(text)`：发送文本消息
- `handleSendAudio(blob)`：发送语音消息
- `handleSSEMessage(data)`：处理SSE消息
- `scrollToBottom()`：滚动到底部

**调试检测点：**
1. 输入验证：验证输入框内容
2. 逻辑验证：验证消息发送流程
3. 输出验证：验证对话列表更新
4. 边界检测：验证空消息、网络错误
5. 性能检测：验证页面加载速度<1s

**测试方案：**
- 单元测试：测试页面组件渲染
- 集成测试：测试与对话服务交互
- 端到端测试：测试完整对话流程

**预期测试结果：**
- 预期结果1：页面正常加载显示
- 预期结果2：消息发送成功
- 预期结果3：AI回复流式显示

---

#### 文件12：frontend/src/pages/tourist/RecommendPage.tsx

**功能描述：**
推荐路线页面，展示个性化路线推荐。

**功能函数：**
- `RecommendPage()`：推荐页面主组件
- `handleInterestChange(interests)`：切换兴趣标签
- `handleRouteSelect(route)`：选择路线
- `renderRouteCard(route)`：渲染路线卡片

**调试检测点：**
1. 输入验证：验证兴趣标签数据
2. 逻辑验证：验证推荐算法调用
3. 输出验证：验证路线列表显示
4. 边界检测：验证无推荐结果
5. 性能检测：验证推荐加载速度

**测试方案：**
- 单元测试：测试推荐页面渲染
- 集成测试：测试与推荐API交互
- 端到端测试：测试完整推荐流程

**预期测试结果：**
- 预期结果1：推荐列表正常显示
- 预期结果2：切换兴趣更新推荐
- 预期结果3：路线详情展示正确

---

### B-002 Live2D数字人集成

---

#### 文件13：frontend/src/hooks/useLive2D.ts

**功能描述：**
Live2D Hook，封装模型加载、动画控制、参数设置。

**功能函数：**
- `useLive2D(modelPath)`：Live2D Hook主函数
- `loadModel(path)`：加载模型文件
- `setExpression(name)`：设置表情
- `setMotion(name)`：设置动作
- `setParameter(id, value)`：设置模型参数

**调试检测点：**
1. 输入验证：验证模型文件路径
2. 逻辑验证：验证模型加载逻辑
3. 输出验证：验证模型渲染正确
4. 边界检测：验证模型文件缺失、格式错误
5. 性能检测：验证模型加载时间<3s

**测试方案：**
- 单元测试：测试模型加载函数
- 集成测试：测试与pixi-live2d-display交互
- 端到端测试：测试完整模型渲染

**预期测试结果：**
- 预期结果1：模型加载成功
- 预期结果2：表情切换正常
- 预期结果3：动作播放流畅

---

#### 文件14：frontend/src/components/DigitalHuman/Live2DStage.tsx

**功能描述：**
Live2D画布组件，渲染数字人模型。

**功能函数：**
- `Live2DStage({ modelPath, width, height })`：Live2D舞台主组件
- `initCanvas()`：初始化画布
- `resizeCanvas()`：调整画布大小
- `destroyCanvas()`：销毁画布

**调试检测点：**
1. 输入验证：验证画布尺寸参数
2. 逻辑验证：验证画布初始化逻辑
3. 输出验证：验证模型渲染效果
4. 边界检测：验证窗口缩放、组件卸载
5. 性能检测：验证渲染帧率>30fps

**测试方案：**
- 单元测试：测试画布组件渲染
- 集成测试：测试与Live2D Hook交互
- 端到端测试：测试完整数字人显示

**预期测试结果：**
- 预期结果1：画布正常初始化
- 预期结果2：模型正确渲染
- 预期结果3：窗口缩放自适应

---

#### 文件15：frontend/src/components/DigitalHuman/LipSync.tsx

**功能描述：**
口型同步组件，根据音素映射控制嘴巴开合。

**功能函数：**
- `LipSync({ audioData, visemeMapping })`：口型同步主组件
- `processAudioData(data)`：处理音频数据
- `mapVisemeToParam(viseme)`：音素映射到参数
- `smoothTransition(from, to)`：平滑过渡

**调试检测点：**
1. 输入验证：验证音频数据格式
2. 逻辑验证：验证音素映射逻辑
3. 输出验证：验证口型变化效果
4. 边界检测：验证静音、噪音处理
5. 性能检测：验证口型同步延迟<50ms

**测试方案：**
- 单元测试：测试口型映射函数
- 集成测试：测试与Live2D模型交互
- 端到端测试：测试完整口型同步

**预期测试结果：**
- 预期结果1：音素正确映射到口型
- 预期结果2：口型变化平滑
- 预期结果3：与音频同步

---

#### 文件16：frontend/src/components/DigitalHuman/EmotionController.tsx

**功能描述：**
表情控制器，根据LLM情感分析触发数字人表情。

**功能函数：**
- `EmotionController({ emotion })`：表情控制主组件
- `mapEmotionToExpression(emotion)`：情感映射到表情
- `triggerExpression(name)`：触发表情
- `resetExpression()`：重置表情

**调试检测点：**
1. 输入验证：验证情感数据格式
2. 逻辑验证：验证情感映射逻辑
3. 输出验证：验证表情变化效果
4. 边界检测：验证未知情感处理
5. 性能检测：验证表情切换响应速度

**测试方案：**
- 单元测试：测试情感映射函数
- 集成测试：测试与Live2D模型交互
- 端到端测试：测试完整表情控制

**预期测试结果：**
- 预期结果1：positive情感触发微笑
- 预期结果2：negative情感触发担忧
- 预期结果3：表情切换自然

---

#### 文件17：frontend/src/components/DigitalHuman/AudioSync.tsx

**功能描述：**
音频同步组件，协调TTS音频播放和数字人动画。

**功能函数：**
- `AudioSync({ audioUrl, onTimeUpdate })`：音频同步主组件
- `playAudio(url)`：播放音频
- `pauseAudio()`：暂停音频
- `syncAnimation(time)`：同步动画

**调试检测点：**
1. 输入验证：验证音频URL格式
2. 逻辑验证：验证音频动画同步逻辑
3. 输出验证：验证播放效果
4. 边界检测：验证音频加载失败
5. 性能检测：验证同步延迟<100ms

**测试方案：**
- 单元测试：测试音频播放控制
- 集成测试：测试与口型同步交互
- 端到端测试：测试完整音频播放

**预期测试结果：**
- 预期结果1：音频正常播放
- 预期结果2：动画与音频同步
- 预期结果3：播放结束触发回调

---

### B-003 管理后台知识库管理页

---

#### 文件18：frontend/src/api/knowledge.ts

**功能描述：**
知识库API封装，提供文档和FAQ的CRUD接口。

**功能函数：**
- `getDocs(params)`：获取文档列表
- `getDocById(id)`：获取文档详情
- `uploadDoc(file)`：上传文档
- `deleteDoc(id)`：删除文档
- `reindexDoc(id)`：重新索引文档
- `getChunks(docId)`：获取分块列表
- `getFAQs(params)`：获取FAQ列表
- `createFAQ(data)`：创建FAQ
- `updateFAQ(id, data)`：更新FAQ
- `deleteFAQ(id)`：删除FAQ

**调试检测点：**
1. 输入验证：验证文件格式、参数格式
2. 逻辑验证：验证CRUD操作逻辑
3. 输出验证：验证返回数据结构
4. 边界检测：验证大文件上传、并发操作
5. 性能检测：验证上传速度、列表加载速度

**测试方案：**
- 单元测试：测试各个API函数
- 集成测试：测试与后端知识库服务交互
- 端到端测试：测试完整知识库管理流程

**预期测试结果：**
- 预期结果1：文档上传成功
- 预期结果2：文档列表分页正确
- 预期结果3：FAQ操作成功

---

#### 文件19：frontend/src/components/admin/DocumentUpload.tsx

**功能描述：**
文档上传组件，支持拖拽上传、进度显示。

**功能函数：**
- `DocumentUpload({ onSuccess })`：文档上传主组件
- `handleDrop(event)`：处理拖拽上传
- `handleFileSelect(event)`：处理文件选择
- `uploadFile(file)`：上传文件
- `renderProgress(percent)`：渲染进度条

**调试检测点：**
1. 输入验证：验证文件类型、大小
2. 逻辑验证：验证上传流程
3. 输出验证：验证上传成功回调
4. 边界检测：验证大文件、重复文件
5. 性能检测：验证上传速度、UI响应

**测试方案：**
- 单元测试：测试上传组件渲染
- 集成测试：测试与知识库API交互
- 端到端测试：测试完整上传流程

**预期测试结果：**
- 预期结果1：拖拽上传成功
- 预期结果2：进度条正确显示
- 预期结果3：上传完成触发回调

---

#### 文件20：frontend/src/components/admin/ChunkPreview.tsx

**功能描述：**
分块预览组件，展示文档被切分的chunk列表。

**功能函数：**
- `ChunkPreview({ docId })`：分块预览主组件
- `loadChunks(docId)`：加载分块数据
- `renderChunk(chunk)`：渲染单个分块
- `highlightText(text, keywords)`：高亮关键词

**调试检测点：**
1. 输入验证：验证文档ID格式
2. 逻辑验证：验证分块加载逻辑
3. 输出验证：验证分块显示完整
4. 边界检测：验证空文档、大量分块
5. 性能检测：验证分块列表渲染速度

**测试方案：**
- 单元测试：测试分块预览渲染
- 集成测试：测试与知识库API交互
- 端到端测试：测试完整分块预览

**预期测试结果：**
- 预期结果1：分块列表正常显示
- 预期结果2：分块内容完整展示
- 预期结果3：关键词高亮正确

---

#### 文件21：frontend/src/components/admin/FAQEditor.tsx

**功能描述：**
FAQ编辑器组件，支持FAQ的增删改查。

**功能函数：**
- `FAQEditor({ faq, onSave })`：FAQ编辑器主组件
- `handleSave()`：保存FAQ
- `handleDelete()`：删除FAQ
- `addKeyword(keyword)`：添加关键词
- `removeKeyword(keyword)`：移除关键词

**调试检测点：**
1. 输入验证：验证FAQ数据格式
2. 逻辑验证：验证保存逻辑
3. 输出验证：验证保存成功回调
4. 边界检测：验证空问题、重复关键词
5. 性能检测：验证编辑器响应速度

**测试方案：**
- 单元测试：测试编辑器组件渲染
- 集成测试：测试与知识库API交互
- 端到端测试：测试完整FAQ编辑流程

**预期测试结果：**
- 预期结果1：FAQ创建成功
- 预期结果2：FAQ编辑保存成功
- 预期结果3：FAQ删除成功

---

#### 文件22：frontend/src/pages/admin/KnowledgePage.tsx

**功能描述：**
知识库管理页面，整合文档上传、列表、分块预览、FAQ管理。

**功能函数：**
- `KnowledgePage()`：知识库页面主组件
- `handleUploadSuccess()`：上传成功回调
- `handleDocSelect(doc)`：选择文档
- `handleTabChange(key)`：切换标签页

**调试检测点：**
1. 输入验证：验证页面参数
2. 逻辑验证：验证页面交互逻辑
3. 输出验证：验证页面显示完整
4. 边界检测：验证空数据、加载状态
5. 性能检测：验证页面加载速度<1s

**测试方案：**
- 单元测试：测试页面组件渲染
- 集成测试：测试与子组件交互
- 端到端测试：测试完整知识库管理

**预期测试结果：**
- 预期结果1：页面正常加载
- 预期结果2：文档上传成功
- 预期结果3：FAQ管理正常

---

### B-004 管理后台数字人配置页

---

#### 文件23：frontend/src/api/avatar.ts

**功能描述：**
数字人配置API封装，提供配置读写接口。

**功能函数：**
- `getConfig()`：获取数字人配置
- `updateConfig(data)`：更新配置
- `getVoices()`：获取可用声音列表
- `previewVoice(voiceId)`：预览声音

**调试检测点：**
1. 输入验证：验证配置数据格式
2. 逻辑验证：验证配置保存逻辑
3. 输出验证：验证配置读取正确
4. 边界检测：验证无效配置、并发修改
5. 性能检测：验证配置加载速度

**测试方案：**
- 单元测试：测试配置API函数
- 集成测试：测试与后端配置服务交互
- 端到端测试：测试完整配置流程

**预期测试结果：**
- 预期结果1：配置读取正确
- 预期结果2：配置保存成功
- 预期结果3：声音预览正常

---

#### 文件24：frontend/src/components/admin/AvatarAppearance.tsx

**功能描述：**
数字人外观切换组件，支持服装、发型、配饰选择。

**功能函数：**
- `AvatarAppearance({ config, onChange })`：外观切换主组件
- `handleCostumeChange(id)`：切换服装
- `handleHairChange(id)`：切换发型
- `handleAccessoryChange(id)`：切换配饰

**调试检测点：**
1. 输入验证：验证外观配置数据
2. 逻辑验证：验证切换逻辑
3. 输出验证：验证预览更新
4. 边界检测：验证无效外观ID
5. 性能检测：验证切换响应速度

**测试方案：**
- 单元测试：测试外观切换组件
- 集成测试：测试与Live2D预览交互
- 端到端测试：测试完整外观配置

**预期测试结果：**
- 预期结果1：外观切换成功
- 预期结果2：预览即时更新
- 预期结果3：配置保存正确

---

#### 文件25：frontend/src/components/admin/VoiceSelector.tsx

**功能描述：**
声音选择组件，支持TTS音色试听和选择。

**功能函数：**
- `VoiceSelector({ voices, selected, onChange })`：声音选择主组件
- `handleVoiceSelect(voiceId)`：选择声音
- `handlePreview(voiceId)`：预览声音
- `renderVoiceItem(voice)`：渲染声音项

**调试检测点：**
1. 输入验证：验证声音数据格式
2. 逻辑验证：验证选择逻辑
3. 输出验证：验证预览播放
4. 边界检测：验证声音加载失败
5. 性能检测：验证预览响应速度

**测试方案：**
- 单元测试：测试声音选择组件
- 集成测试：测试与音频播放交互
- 端到端测试：测试完整声音选择

**预期测试结果：**
- 预期结果1：声音列表显示正确
- 预期结果2：声音预览正常播放
- 预期结果3：选择后配置更新

---

#### 文件26：frontend/src/components/admin/WelcomeEditor.tsx

**功能描述：**
欢迎语编辑组件，支持编辑数字人欢迎语。

**功能函数：**
- `WelcomeEditor({ welcome, onChange })`：欢迎语编辑主组件
- `handleChange(text)`：修改欢迎语
- `handlePreview()`：预览欢迎语
- `handleSave()`：保存欢迎语

**调试检测点：**
1. 输入验证：验证欢迎语文本
2. 逻辑验证：验证保存逻辑
3. 输出验证：验证保存成功
4. 边界检测：验证空欢迎语、超长文本
5. 性能检测：验证编辑器响应速度

**测试方案：**
- 单元测试：测试编辑器组件
- 集成测试：测试与配置API交互
- 端到端测试：测试完整欢迎语编辑

**预期测试结果：**
- 预期结果1：欢迎语编辑正常
- 预期结果2：预览功能正常
- 预期结果3：保存成功

---

#### 文件27：frontend/src/pages/admin/AvatarPage.tsx

**功能描述：**
数字人配置页面，整合外观、声音、欢迎语配置和Live2D预览。

**功能函数：**
- `AvatarPage()`：数字人配置页面主组件
- `handleConfigChange(config)`：配置变更处理
- `handleSave()`：保存配置
- `renderPreview()`：渲染预览

**调试检测点：**
1. 输入验证：验证配置数据完整性
2. 逻辑验证：验证配置保存流程
3. 输出验证：验证预览效果
4. 边界检测：验证配置冲突、保存失败
5. 性能检测：验证页面加载速度<1s

**测试方案：**
- 单元测试：测试页面组件渲染
- 集成测试：测试与子组件交互
- 端到端测试：测试完整配置流程

**预期测试结果：**
- 预期结果1：页面正常加载
- 预期结果2：配置修改即时预览
- 预期结果3：保存成功

---

### B-005 感受度报告+数据大屏

---

#### 文件28：frontend/src/api/analytics.ts

**功能描述：**
分析API封装，提供情感分析、报告、大屏数据接口。

**功能函数：**
- `getSentimentData(params)`：获取情感趋势数据
- `getReport()`：获取感受度报告
- `getDashboardMetrics()`：获取大屏指标
- `getHotQuestions()`：获取热门问答
- `subscribeRealtime(callback)`：订阅实时数据

**调试检测点：**
1. 输入验证：验证查询参数格式
2. 逻辑验证：验证数据获取逻辑
3. 输出验证：验证数据结构完整
4. 边界检测：验证空数据、大数据量
5. 性能检测：验证数据加载速度

**测试方案：**
- 单元测试：测试分析API函数
- 集成测试：测试与后端分析服务交互
- 端到端测试：测试完整数据展示

**预期测试结果：**
- 预期结果1：情感数据获取正确
- 预期结果2：报告内容完整
- 预期结果3：大屏数据实时更新

---

#### 文件29：frontend/src/components/admin/SentimentChart.tsx

**功能描述：**
情感趋势折线图组件，使用ECharts展示positive/neutral/negative趋势。

**功能函数：**
- `SentimentChart({ data, dateRange })`：情感图表主组件
- `initChart()`：初始化图表
- `updateChart(data)`：更新图表数据
- `handleDateChange(range)`：日期范围变更

**调试检测点：**
1. 输入验证：验证图表数据格式
2. 逻辑验证：验证图表渲染逻辑
3. 输出验证：验证图表显示正确
4. 边界检测：验证空数据、大量数据
5. 性能检测：验证图表渲染速度

**测试方案：**
- 单元测试：测试图表组件渲染
- 集成测试：测试与ECharts交互
- 端到端测试：测试完整图表展示

**预期测试结果：**
- 预期结果1：折线图正常显示
- 预期结果2：数据点准确
- 预期结果3：日期筛选生效

---

#### 文件30：frontend/src/components/admin/WordCloud.tsx

**功能描述：**
关注点词云组件，展示用户高频提问关键词。

**功能函数：**
- `WordCloud({ data })`：词云主组件
- `initChart()`：初始化词云
- `updateChart(data)`：更新词云数据
- `handleWordClick(word)`：点击词语

**调试检测点：**
1. 输入验证：验证词云数据格式
2. 逻辑验证：验证词云渲染逻辑
3. 输出验证：验证词云显示正确
4. 边界检测：验证空数据、重复词
5. 性能检测：验证词云渲染速度

**测试方案：**
- 单元测试：测试词云组件渲染
- 集成测试：测试与ECharts交互
- 端到端测试：测试完整词云展示

**预期测试结果：**
- 预期结果1：词云正常显示
- 预期结果2：词频大小正确
- 预期结果3：点击事件触发

---

#### 文件31：frontend/src/components/admin/MetricsCard.tsx

**功能描述：**
指标卡片组件，展示今日/本周服务人次等关键指标。

**功能函数：**
- `MetricsCard({ title, value, trend })`：指标卡片主组件
- `formatValue(value)`：格式化数值
- `renderTrend(trend)`：渲染趋势箭头

**调试检测点：**
1. 输入验证：验证指标数据格式
2. 逻辑验证：验证数值格式化逻辑
3. 输出验证：验证卡片显示正确
4. 边界检测：验证负数、零值
5. 性能检测：验证渲染速度

**测试方案：**
- 单元测试：测试卡片组件渲染
- 集成测试：测试与数据源交互
- 端到端测试：测试完整指标展示

**预期测试结果：**
- 预期结果1：指标数值正确显示
- 预期结果2：趋势箭头正确
- 预期结果3：样式美观

---

#### 文件32：frontend/src/components/admin/HotQuestions.tsx

**功能描述：**
热门问答排行榜组件，展示Top10热门问题。

**功能函数：**
- `HotQuestions({ data })`：热门问答主组件
- `renderList(questions)`：渲染问题列表
- `renderRank(index)`：渲染排名

**调试检测点：**
1. 输入验证：验证问答数据格式
2. 逻辑验证：验证排序逻辑
3. 输出验证：验证列表显示正确
4. 边界检测：验证空列表、少于10条
5. 性能检测：验证列表渲染速度

**测试方案：**
- 单元测试：测试排行榜组件渲染
- 集成测试：测试与分析API交互
- 端到端测试：测试完整排行榜展示

**预期测试结果：**
- 预期结果1：排行榜正常显示
- 预期结果2：排名顺序正确
- 预期结果3：点击可查看详情

---

#### 文件33：frontend/src/components/admin/RealtimeMonitor.tsx

**功能描述：**
实时监控组件，通过WebSocket接收实时交互数据。

**功能函数：**
- `RealtimeMonitor()`：实时监控主组件
- `connectWebSocket()`：建立WebSocket连接
- `handleMessage(data)`：处理实时消息
- `renderInteraction(data)`：渲染交互记录

**调试检测点：**
1. 输入验证：验证WebSocket消息格式
2. 逻辑验证：验证消息处理逻辑
3. 输出验证：验证实时数据更新
4. 边界检测：验证连接断开、消息丢失
5. 性能检测：验证实时更新流畅度

**测试方案：**
- 单元测试：测试监控组件渲染
- 集成测试：测试与WebSocket服务交互
- 端到端测试：测试完整实时监控

**预期测试结果：**
- 预期结果1：WebSocket连接成功
- 预期结果2：实时数据更新正确
- 预期结果3：断开后自动重连

---

#### 文件34：frontend/src/pages/admin/ReportPage.tsx

**功能描述：**
感受度报告页面，整合情感趋势、词云、盲区发现、服务建议。

**功能函数：**
- `ReportPage()`：报告页面主组件
- `loadReportData()`：加载报告数据
- `handleDateChange(range)`：日期范围变更
- `exportReport()`：导出报告

**调试检测点：**
1. 输入验证：验证查询参数
2. 逻辑验证：验证数据加载逻辑
3. 输出验证：验证报告内容完整
4. 边界检测：验证空数据、加载失败
5. 性能检测：验证页面加载速度<1s

**测试方案：**
- 单元测试：测试页面组件渲染
- 集成测试：测试与子组件交互
- 端到端测试：测试完整报告展示

**预期测试结果：**
- 预期结果1：报告页面正常加载
- 预期结果2：图表数据正确
- 预期结果3：导出功能正常

---

#### 文件35：frontend/src/pages/admin/DashboardPage.tsx

**功能描述：**
数据大屏页面，展示实时运营数据。

**功能函数：**
- `DashboardPage()`：大屏页面主组件
- `loadMetrics()`：加载指标数据
- `connectRealtime()`：连接实时数据
- `handleFullscreen()`：全屏切换

**调试检测点：**
1. 输入验证：验证数据源配置
2. 逻辑验证：验证数据刷新逻辑
3. 输出验证：验证大屏显示完整
4. 边界检测：验证数据延迟、连接断开
5. 性能检测：验证大屏渲染流畅度

**测试方案：**
- 单元测试：测试大屏组件渲染
- 集成测试：测试与数据源交互
- 端到端测试：测试完整大屏展示

**预期测试结果：**
- 预期结果1：大屏正常显示
- 预期结果2：数据实时更新
- 预期结果3：全屏功能正常

---

### B-006 GPS弱信号降级方案

---

#### 文件36：frontend/src/pages/tourist/QRScan.tsx

**功能描述：**
二维码扫码定位页面，扫描景区二维码确定位置。

**功能函数：**
- `QRScan()`：扫码页面主组件
- `initScanner()`：初始化扫码器
- `handleScan(result)`：处理扫码结果
- `handleError(error)`：处理扫码错误

**调试检测点：**
1. 输入验证：验证摄像头权限
2. 逻辑验证：验证扫码识别逻辑
3. 输出验证：验证位置解析正确
4. 边界检测：验证无效二维码、无权限
5. 性能检测：验证扫码响应速度

**测试方案：**
- 单元测试：测试扫码组件渲染
- 集成测试：测试与位置服务交互
- 端到端测试：测试完整扫码定位

**预期测试结果：**
- 预期结果1：扫码器正常启动
- 预期结果2：二维码识别正确
- 预期结果3：位置解析准确

---

#### 文件37：frontend/src/components/common/MapSelector.tsx

**功能描述：**
手动地图选点组件，用户在地图上点选当前位置。

**功能函数：**
- `MapSelector({ onSelect })`：地图选点主组件
- `initMap()`：初始化地图
- `handleClick(event)`：处理点击事件
- `getCoordinates(event)`：获取坐标

**调试检测点：**
1. 输入验证：验证地图配置
2. 逻辑验证：验证点击选点逻辑
3. 输出验证：验证坐标获取正确
4. 边界检测：验证地图加载失败
5. 性能检测：验证地图交互流畅度

**测试方案：**
- 单元测试：测试地图组件渲染
- 集成测试：测试与位置服务交互
- 端到端测试：测试完整地图选点

**预期测试结果：**
- 预期结果1：地图正常加载
- 预期结果2：点击获取坐标正确
- 预期结果3：选点后触发回调

---

### B-007 模块B单元测试

---

#### 文件38：frontend/src/__tests__/ChatPage.test.tsx

**功能描述：**
对话页面单元测试。

**功能函数：**
- `test renders correctly`：测试页面正常渲染
- `test sends text message`：测试发送文本消息
- `test receives SSE response`：测试接收SSE响应
- `test voice input`：测试语音输入

**调试检测点：**
1. 输入验证：验证测试数据格式
2. 逻辑验证：验证测试断言逻辑
3. 输出验证：验证测试结果
4. 边界检测：验证边界条件测试
5. 性能检测：验证测试执行时间

**测试方案：**
- 单元测试：测试页面渲染和交互
- 集成测试：测试与服务层交互
- 端到端测试：测试完整对话流程

**预期测试结果：**
- 预期结果1：页面渲染测试通过
- 预期结果2：消息发送测试通过
- 预期结果3：SSE接收测试通过

---

#### 文件39：frontend/src/__tests__/VoiceInput.test.tsx

**功能描述：**
语音输入组件单元测试。

**功能函数：**
- `test renders correctly`：测试组件正常渲染
- `test start recording`：测试开始录音
- `test stop recording`：测试停止录音
- `test send audio`：测试发送音频

**调试检测点：**
1. 输入验证：验证Mock数据
2. 逻辑验证：验证录音逻辑
3. 输出验证：验证音频文件生成
4. 边界检测：验证权限拒绝
5. 性能检测：验证测试执行时间

**测试方案：**
- 单元测试：测试组件渲染和交互
- 集成测试：测试与录音服务交互
- 端到端测试：测试完整语音输入

**预期测试结果：**
- 预期结果1：组件渲染测试通过
- 预期结果2：录音控制测试通过
- 预期结果3：音频发送测试通过

---

#### 文件40：frontend/src/__tests__/Live2DStage.test.tsx

**功能描述：**
Live2D舞台组件单元测试。

**功能函数：**
- `test renders correctly`：测试组件正常渲染
- `test loads model`：测试模型加载
- `test handles resize`：测试窗口缩放

**调试检测点：**
1. 输入验证：验证Mock模型数据
2. 逻辑验证：验证渲染逻辑
3. 输出验证：验证画布创建
4. 边界检测：验证模型加载失败
5. 性能检测：验证测试执行时间

**测试方案：**
- 单元测试：测试组件渲染
- 集成测试：测试与Live2D库交互
- 端到端测试：测试完整模型渲染

**预期测试结果：**
- 预期结果1：组件渲染测试通过
- 预期结果2：模型加载测试通过
- 预期结果3：缩放处理测试通过

---

#### 文件41：frontend/src/__tests__/KnowledgePage.test.tsx

**功能描述：**
知识库管理页面单元测试。

**功能函数：**
- `test renders correctly`：测试页面正常渲染
- `test document upload`：测试文档上传
- `test FAQ management`：测试FAQ管理

**调试检测点：**
1. 输入验证：验证Mock数据
2. 逻辑验证：验证CRUD逻辑
3. 输出验证：验证操作结果
4. 边界检测：验证错误处理
5. 性能检测：验证测试执行时间

**测试方案：**
- 单元测试：测试页面渲染和交互
- 集成测试：测试与API服务交互
- 端到端测试：测试完整知识库管理

**预期测试结果：**
- 预期结果1：页面渲染测试通过
- 预期结果2：文档上传测试通过
- 预期结果3：FAQ管理测试通过

---

#### 文件42：frontend/src/__tests__/DashboardPage.test.tsx

**功能描述：**
数据大屏页面单元测试。

**功能函数：**
- `test renders correctly`：测试页面正常渲染
- `test loads metrics`：测试指标加载
- `test realtime updates`：测试实时更新

**调试检测点：**
1. 输入验证：验证Mock数据
2. 逻辑验证：验证数据刷新逻辑
3. 输出验证：验证图表渲染
4. 边界检测：验证数据延迟
5. 性能检测：验证测试执行时间

**测试方案：**
- 单元测试：测试页面渲染
- 集成测试：测试与数据源交互
- 端到端测试：测试完整大屏展示

**预期测试结果：**
- 预期结果1：页面渲染测试通过
- 预期结果2：指标加载测试通过
- 预期结果3：实时更新测试通过

---

## 总文件目录

```
frontend/src/
├── api/
│   ├── request.ts              # HTTP请求封装
│   ├── chat.ts                 # 对话API
│   ├── recommend.ts            # 推荐API
│   ├── knowledge.ts            # 知识库API
│   ├── avatar.ts               # 数字人配置API
│   └── analytics.ts            # 分析API
├── stores/
│   ├── chatStore.ts            # 对话状态
│   └── userStore.ts            # 用户状态
├── hooks/
│   ├── useSSE.ts               # SSE流式接收
│   ├── useWebSocket.ts         # WebSocket信令
│   ├── useVoiceRecord.ts       # 语音录制
│   └── useLive2D.ts            # Live2D Hook
├── components/
│   ├── DigitalHuman/
│   │   ├── ChatBubble.tsx      # 对话气泡
│   │   ├── VoiceInput.tsx      # 语音输入
│   │   ├── Live2DStage.tsx     # Live2D画布
│   │   ├── LipSync.tsx         # 口型同步
│   │   ├── EmotionController.tsx # 表情控制
│   │   └── AudioSync.tsx       # 音频同步
│   ├── admin/
│   │   ├── DocumentUpload.tsx  # 文档上传
│   │   ├── ChunkPreview.tsx    # 分块预览
│   │   ├── FAQEditor.tsx       # FAQ编辑器
│   │   ├── AvatarAppearance.tsx # 外观切换
│   │   ├── VoiceSelector.tsx   # 声音选择
│   │   ├── WelcomeEditor.tsx   # 欢迎语编辑
│   │   ├── SentimentChart.tsx  # 情感趋势图
│   │   ├── WordCloud.tsx       # 词云
│   │   ├── MetricsCard.tsx     # 指标卡片
│   │   ├── HotQuestions.tsx    # 热门问答
│   │   └── RealtimeMonitor.tsx # 实时监控
│   └── common/
│       └── MapSelector.tsx     # 地图选点
├── pages/
│   ├── tourist/
│   │   ├── ChatPage.tsx        # 对话主界面
│   │   ├── RecommendPage.tsx   # 推荐路线页
│   │   └── QRScan.tsx          # 二维码扫码
│   └── admin/
│       ├── KnowledgePage.tsx   # 知识库管理页
│       ├── AvatarPage.tsx      # 数字人配置页
│       ├── ReportPage.tsx      # 感受度报告页
│       └── DashboardPage.tsx   # 数据大屏页
├── __tests__/
│   ├── ChatPage.test.tsx       # 对话页面测试
│   ├── VoiceInput.test.tsx     # 语音输入测试
│   ├── Live2DStage.test.tsx    # Live2D测试
│   ├── KnowledgePage.test.tsx  # 知识库页面测试
│   └── DashboardPage.test.tsx  # 大屏页面测试
├── App.tsx                     # 应用入口
├── main.tsx                    # 主入口
├── index.css                   # 全局样式
└── vite-env.d.ts               # Vite类型声明
```

## 开发顺序

### 阶段1：基础模块（Week 2）
1. request.ts - HTTP请求封装
2. chatStore.ts - 对话状态管理
3. userStore.ts - 用户状态管理

### 阶段2：对话功能（Week 2-3）
4. useSSE.ts - SSE流式接收
5. useWebSocket.ts - WebSocket信令
6. useVoiceRecord.ts - 语音录制
7. ChatBubble.tsx - 对话气泡
8. VoiceInput.tsx - 语音输入
9. ChatPage.tsx - 对话主界面

### 阶段3：Live2D集成（Week 3-4）
10. useLive2D.ts - Live2D Hook
11. Live2DStage.tsx - Live2D画布
12. LipSync.tsx - 口型同步
13. EmotionController.tsx - 表情控制
14. AudioSync.tsx - 音频同步

### 阶段4：推荐功能（Week 3）
15. recommend.ts - 推荐API
16. RecommendPage.tsx - 推荐路线页

### 阶段5：管理后台（Week 2-3）
17. knowledge.ts - 知识库API
18. DocumentUpload.tsx - 文档上传
19. ChunkPreview.tsx - 分块预览
20. FAQEditor.tsx - FAQ编辑器
21. KnowledgePage.tsx - 知识库管理页

### 阶段6：数字人配置（Week 4）
22. avatar.ts - 数字人配置API
23. AvatarAppearance.tsx - 外观切换
24. VoiceSelector.tsx - 声音选择
25. WelcomeEditor.tsx - 欢迎语编辑
26. AvatarPage.tsx - 数字人配置页

### 阶段7：数据大屏（Week 4-5）
27. analytics.ts - 分析API
28. SentimentChart.tsx - 情感趋势图
29. WordCloud.tsx - 词云
30. MetricsCard.tsx - 指标卡片
31. HotQuestions.tsx - 热门问答
32. RealtimeMonitor.tsx - 实时监控
33. ReportPage.tsx - 感受度报告页
34. DashboardPage.tsx - 数据大屏页

### 阶段8：GPS降级（Week 3）
35. QRScan.tsx - 二维码扫码
36. MapSelector.tsx - 地图选点

### 阶段9：单元测试（Week 5-6）
37. ChatPage.test.tsx
38. VoiceInput.test.tsx
39. Live2DStage.test.tsx
40. KnowledgePage.test.tsx
41. DashboardPage.test.tsx

---

## 依赖关系

### 外部依赖
- react: ^18.3.1
- react-dom: ^18.3.1
- react-router-dom: ^6.28.0
- antd: ^5.22.0
- @ant-design/icons: ^5.5.0
- axios: ^1.7.9
- zustand: ^5.0.0
- echarts: ^5.5.1
- echarts-for-react: ^3.0.2
- echarts-wordcloud: ^2.1.0
- pixi.js: ^7.4.2
- pixi-live2d-display: ^0.5.0
- dayjs: ^1.11.13

### 内部依赖
- api/* → request.ts
- pages/* → components/* → hooks/* → stores/*
- Live2D组件 → useLive2D → pixi-live2d-display
- 图表组件 → ECharts

---

## 风险评估

### 技术风险
- Live2D集成复杂度高，需要处理模型加载、动画同步
- SSE/WebSocket实时通信需要处理网络异常
- ECharts图表需要处理大数据量渲染

### 进度风险
- Live2D可能需要额外调试时间
- 实时通信功能需要后端配合
- 响应式适配工作量较大

---

## 验收标准

### 功能验收
- 对话功能完整，支持文本和语音输入
- Live2D数字人口型同步、表情正常
- 管理后台功能完整
- 数据大屏实时更新

### 性能验收
- 首屏加载时间<2s
- 对话响应延迟<5s
- 图表渲染流畅

### 质量验收
- 单元测试覆盖率>80%
- 无明显bug
- 代码规范
