/**
 * VRMManager - 全局单例管理
 *
 * 功能：
 * 1. 全局单例管理VRM模型，所有页面共享同一个实例
 * 2. 提供表情控制、口型同步、服装切换API
 * 3. 管理数字人状态（说话/idle）
 * 4. 触发全局事件供其他组件监听
 */

import type { Emotion } from '../DigitalHuman/EmotionController';

export type PageContext =
  | 'home'
  | 'attractions'
  | 'attraction-detail'
  | 'history'
  | 'memory'
  | 'explore'
  | 'chat';

export interface SpeakOptions {
  text: string;
  emotion?: Emotion;
  duration?: number; // 自定义显示时长（毫秒）
}

export interface VRMState {
  isSpeaking: boolean;
  currentEmotion: Emotion;
  mouthOpen: number;
  subtitle: string;
  pageContext: PageContext;
  contextData: Record<string, any>;
}

class VRMManagerClass {
  private static instance: VRMManagerClass;

  // 状态
  private state: VRMState = {
    isSpeaking: false,
    currentEmotion: 'neutral',
    mouthOpen: 0,
    subtitle: '',
    pageContext: 'home',
    contextData: {},
  };

  // 事件监听器
  private listeners: Map<string, Set<Function>> = new Map();

  // 说话定时器
  private speakTimer: ReturnType<typeof setTimeout> | null = null;

  // 口型动画ID
  private mouthAnimationId: number | null = null;

  private constructor() {
    // 初始化事件类型
    ['speak', 'emotionChange', 'mouthChange', 'stateChange', 'expand', 'collapse'].forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  /** 获取单例实例 */
  public static getInstance(): VRMManagerClass {
    if (!VRMManagerClass.instance) {
      VRMManagerClass.instance = new VRMManagerClass();
    }
    return VRMManagerClass.instance;
  }

  /** 获取当前状态 */
  public getState(): VRMState {
    return { ...this.state };
  }

  /** 触发数字人说话 */
  public speak(text: string, emotion: Emotion = 'neutral', duration?: number): void {
    // 清除之前的说话定时器
    if (this.speakTimer) {
      clearTimeout(this.speakTimer);
    }

    // 更新状态
    this.state.subtitle = text;
    this.state.isSpeaking = true;
    this.state.currentEmotion = emotion;

    // 触发说话事件
    this.emit('speak', { text, emotion });
    this.emit('stateChange', this.getState());

    // 触发自定义全局事件（供非React组件监听）
    window.dispatchEvent(new CustomEvent('vrm_speak', {
      detail: { text, emotion, context: this.state.pageContext }
    }));

    // 启动口型动画
    this.startMouthAnimation();

    // 自动关闭（根据文字长度计算默认时长）
    const autoDuration = duration || Math.max(2000, text.length * 150);
    this.speakTimer = setTimeout(() => {
      this.stopSpeaking();
    }, autoDuration);
  }

  /** 停止说话 */
  public stopSpeaking(): void {
    if (this.speakTimer) {
      clearTimeout(this.speakTimer);
      this.speakTimer = null;
    }

    this.state.isSpeaking = false;
    this.state.subtitle = '';
    this.state.mouthOpen = 0;
    this.state.currentEmotion = 'neutral';

    this.stopMouthAnimation();
    this.emit('stateChange', this.getState());
  }

  /** 设置表情 */
  public setEmotion(emotion: Emotion): void {
    this.state.currentEmotion = emotion;
    this.emit('emotionChange', emotion);
    this.emit('stateChange', this.getState());
  }

  /** 设置口型开合度 (0-1) */
  public setMouthOpen(value: number): void {
    this.state.mouthOpen = Math.max(0, Math.min(1, value));
    this.emit('mouthChange', this.state.mouthOpen);
  }

  /** 启动口型动画（模拟说话） */
  private startMouthAnimation(): void {
    this.stopMouthAnimation();

    const animate = () => {
      // 使用正弦波模拟口型开合
      const time = Date.now() / 200;
      const value = (Math.sin(time) + 1) / 2 * 0.6 + 0.1; // 0.1 - 0.7
      this.setMouthOpen(value);

      this.mouthAnimationId = window.requestAnimationFrame(animate);
    };

    this.mouthAnimationId = window.requestAnimationFrame(animate);
  }

  /** 停止口型动画 */
  private stopMouthAnimation(): void {
    if (this.mouthAnimationId !== null) {
      window.cancelAnimationFrame(this.mouthAnimationId);
      this.mouthAnimationId = null;
    }
    this.setMouthOpen(0);
  }

  /** 设置页面上下文 */
  public setPageContext(context: PageContext, data?: Record<string, any>): void {
    this.state.pageContext = context;
    if (data) {
      this.state.contextData = { ...this.state.contextData, ...data };
    }
    this.emit('stateChange', this.getState());
  }

  /** 获取页面上下文 */
  public getPageContext(): { context: PageContext; data: Record<string, any> } {
    return {
      context: this.state.pageContext,
      data: this.state.contextData,
    };
  }

  /** 根据页面获取欢迎语 */
  public getWelcomeText(): string {
    const { context, data } = this.getPageContext();

    const welcomeMap: Record<PageContext, string> = {
      home: '欢迎来到灵山胜境，我是您的数字导览员小灵',
      attractions: '为您推荐灵山大佛，来灵山不可错过',
      'attraction-detail': data?.spotName ? `这是${data.spotName}，让我为您详细讲解` : '这个景点很有意思',
      history: '穿越千年，让我带您了解灵山的历史',
      memory: '看看您的旅行记忆，记录美好时光',
      explore: '试试拍照识景，或扫描景区二维码',
      chat: '有什么可以帮您的吗？',
    };

    return welcomeMap[context] || '有什么可以帮您？';
  }

  /** 根据页面获取快捷问题 */
  public getQuickQuestions(): string[] {
    const { context, data } = this.getPageContext();

    const questionMap: Record<PageContext, string[]> = {
      home: ['推荐一条游玩路线', '灵山大佛有多高？', '景区开放时间'],
      attractions: ['推荐一条游玩路线', '灵山大佛有多高？', '哪个景点最适合拍照？'],
      'attraction-detail': [
        `讲一个${data?.spotName || '这里'}的故事`,
        '这里有什么传说？',
        '最佳游览时间是什么时候？',
      ],
      history: ['灵山是什么时候建立的？', '讲讲唐朝的灵山', '现代灵山的发展'],
      memory: ['帮我润色这条记忆', '生成分享卡片', '查看旅程总结'],
      explore: ['拍照识景怎么用？', '附近有什么景点？', '怎么创建协同房间？'],
      chat: ['推荐一条游玩路线', '景区开放时间', '门票多少钱？'],
    };

    return questionMap[context] || ['有什么可以帮您？'];
  }

  /** 展开对话面板 */
  public expand(): void {
    this.emit('expand', null);
    window.dispatchEvent(new CustomEvent('vrm_expand'));
  }

  /** 收起对话面板 */
  public collapse(): void {
    this.emit('collapse', null);
    window.dispatchEvent(new CustomEvent('vrm_collapse'));
  }

  /** 添加事件监听 */
  public on(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.add(callback);
    }
  }

  /** 移除事件监听 */
  public off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /** 触发事件 */
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`VRMManager event error (${event}):`, error);
        }
      });
    }
  }

  /** 重置状态 */
  public reset(): void {
    this.stopSpeaking();
    this.state.currentEmotion = 'neutral';
    this.state.contextData = {};
    this.emit('stateChange', this.getState());
  }
}

// 导出单例实例
export const VRMManager = VRMManagerClass.getInstance();

// 导出钩子函数，用于React组件
export function useVRMManager() {
  return VRMManager;
}

export default VRMManager;
