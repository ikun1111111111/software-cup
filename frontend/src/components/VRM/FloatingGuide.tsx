import React, {
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import DigitalHuman from '../DigitalHuman/DigitalHuman';
import VRMManager, {
  PageContext,
  SpeakOptions,
} from './VRMManager';
import { Emotion } from '../DigitalHuman/EmotionController';

export interface FloatingGuideRef {
  /** 触发数字人说话 */
  speak: (text: string, emotion?: Emotion) => void;
  /** 设置表情 */
  setExpression: (emotion: Emotion) => void;
  /** 展开对话面板 */
  expand: () => void;
  /** 收起对话面板 */
  collapse: () => void;
  /** 获取当前页面上下文 */
  getContext: () => { context: PageContext; data: Record<string, any> };
}

interface FloatingGuideProps {
  /** 当前页面标识，用于上下文感知 */
  pageContext: PageContext;
  /** 页面特定数据（如景点ID） */
  contextData?: Record<string, any>;
  /** 浮窗位置 */
  position?: 'bottom-right' | 'bottom-left';
  /** 是否自动播放欢迎语 */
  autoWelcome?: boolean;
  /** 欢迎语延迟（毫秒） */
  welcomeDelay?: number;
}

/**
 * FloatingGuide - 数字人浮窗导览组件
 *
 * 功能：
 * 1. 右下角浮窗显示数字人头像
 * 2. 点击展开半屏对话面板
 * 3. 自动播放欢迎语（根据页面上下文）
 * 4. 显示对话气泡
 * 5. 说话时光环动画
 */
export const FloatingGuide = forwardRef<FloatingGuideRef, FloatingGuideProps>(
  (
    {
      pageContext,
      contextData = {},
      position = 'bottom-right',
      autoWelcome = true,
      welcomeDelay = 800,
    },
    ref
  ) => {
    // 内部状态
    const [isExpanded, setIsExpanded] = useState(false);
    const [subtitle, setSubtitle] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [emotion, setEmotion] = useState<Emotion>('neutral');
    const [showFloat, setShowFloat] = useState(false);

    // 引用
    const floatRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // 初始化
    useEffect(() => {
      // 延迟显示浮窗（入场动画）
      const timer = setTimeout(() => {
        setShowFloat(true);
      }, 300);

      // 设置页面上下文
      VRMManager.setPageContext(pageContext, contextData);

      // 自动播放欢迎语
      if (autoWelcome) {
        const welcomeTimer = setTimeout(() => {
          const welcomeText = VRMManager.getWelcomeText();
          handleSpeak(welcomeText, 'neutral');
        }, welcomeDelay);

        return () => {
          clearTimeout(timer);
          clearTimeout(welcomeTimer);
        };
      }

      return () => clearTimeout(timer);
    }, [pageContext, autoWelcome, welcomeDelay]);

    // 监听VRMManager状态变化
    useEffect(() => {
      const handleStateChange = (state: any) => {
        setIsSpeaking(state.isSpeaking);
        setSubtitle(state.subtitle);
        setEmotion(state.currentEmotion);
      };

      VRMManager.on('stateChange', handleStateChange);

      return () => {
        VRMManager.off('stateChange', handleStateChange);
      };
    }, []);

    // 说话处理
    const handleSpeak = useCallback((text: string, emotion: Emotion = 'neutral') => {
      VRMManager.speak(text, emotion);
    }, []);

    // 展开面板
    const handleExpand = useCallback(() => {
      setIsExpanded(true);
      VRMManager.expand();

      // 添加body样式防止滚动
      document.body.style.overflow = 'hidden';
    }, []);

    // 收起面板
    const handleCollapse = useCallback(() => {
      setIsExpanded(false);
      VRMManager.collapse();

      // 恢复body滚动
      document.body.style.overflow = '';
    }, []);

    // 设置表情
    const handleSetExpression = useCallback((emotion: Emotion) => {
      VRMManager.setEmotion(emotion);
    }, []);

    // 获取上下文
    const handleGetContext = useCallback(() => {
      return VRMManager.getPageContext();
    }, []);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      speak: handleSpeak,
      setExpression: handleSetExpression,
      expand: handleExpand,
      collapse: handleCollapse,
      getContext: handleGetContext,
    }));

    // 获取快捷问题
    const quickQuestions = VRMManager.getQuickQuestions();

    // 处理快捷问题点击
    const handleQuestionClick = (question: string) => {
      handleSpeak(question, 'think');
      // 这里可以添加发送消息到后端的逻辑
    };

    // 处理发送消息
    const handleSendMessage = (text: string) => {
      if (!text.trim()) return;
      handleSpeak(text, 'think');
      // 这里可以添加发送消息到后端的逻辑
    };

    return (
      <>
        {/* 浮层（始终显示） */}
        {!isExpanded && (
          <div
            ref={floatRef}
            className={`floating-guide ${showFloat ? 'visible' : ''} ${position}`}
            style={{
              position: 'fixed',
              bottom: 100, // Tab Bar 上方
              right: position === 'bottom-right' ? 16 : 'auto',
              left: position === 'bottom-left' ? 16 : 'auto',
              zIndex: 1000,
              opacity: showFloat ? 1 : 0,
              transform: showFloat ? 'scale(1)' : 'scale(0)',
              transition: 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* 对话气泡 */}
            {subtitle && (
              <div
                className="guide-bubble"
                style={{
                  position: 'absolute',
                  bottom: 80,
                  right: position === 'bottom-right' ? 0 : 'auto',
                  left: position === 'bottom-left' ? 0 : 'auto',
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderRadius: 16,
                  padding: '12px 16px',
                  maxWidth: 220,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  animation: 'fadeInUp 300ms ease',
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: '#2A2520',
                    lineHeight: 1.5,
                    margin: 0,
                    fontFamily: "'Noto Serif SC', serif",
                  }}
                >
                  {subtitle}
                </p>
                {/* 箭头 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    right: position === 'bottom-right' ? 24 : 'auto',
                    left: position === 'bottom-left' ? 24 : 'auto',
                    width: 12,
                    height: 12,
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    transform: 'rotate(45deg)',
                  }}
                />
              </div>
            )}

            {/* VRM 头像点击区域 */}
            <button
              onClick={handleExpand}
              className="guide-avatar-btn"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                border: '2px solid #6A9C89',
                backgroundColor: '#E8F2EE',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
            >
              {/* 说话光环 */}
              {isSpeaking && (
                <div
                  className="speaking-ring"
                  style={{
                    position: 'absolute',
                    inset: -4,
                    borderRadius: '50%',
                    border: '2px solid rgba(106,156,137,0.4)',
                    animation: 'pulseRing 1.5s ease-in-out infinite',
                  }}
                />
              )}

              {/* 数字人缩略图 */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                }}
              >
                <DigitalHuman
                  width={68}
                  height={68}
                  emotion={emotion}
                  isSpeaking={isSpeaking}
                  speakingText={subtitle}
                />
              </div>

              {/* 名字标签 */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(106,156,137,0.9)',
                  borderRadius: 10,
                  padding: '2px 10px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: '#fff',
                    fontWeight: 600,
                    fontFamily: "'Noto Serif SC', serif",
                  }}
                >
                  小灵
                </span>
              </div>
            </button>
          </div>
        )}

        {/* 半屏对话面板 */}
        {isExpanded && (
          <div
            className="guide-panel-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 2000,
              animation: 'fadeIn 200ms ease',
            }}
            onClick={handleCollapse}
          >
            <div
              ref={panelRef}
              className="guide-panel"
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#F7F5F0',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: '85vh',
                minHeight: '60vh',
                animation: 'slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 面板头部 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#2A2520',
                      margin: 0,
                      fontFamily: "'ZCOOL XiaoWei', 'Noto Serif SC', serif",
                    }}
                  >
                    数字导览员
                  </h3>
                  <p
                    style={{
                      fontSize: 12,
                      color: '#9E988E',
                      margin: '4px 0 0',
                    }}
                  >
                    小灵 · 随时为您解答
                  </p>
                </div>
                <button
                  onClick={handleCollapse}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    color: '#5C554C',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 数字人展示区 */}
              <div
                style={{
                  height: 200,
                  backgroundColor: '#F0EDE7',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                <DigitalHuman
                  width={200}
                  height={200}
                  emotion={emotion}
                  isSpeaking={isSpeaking}
                  speakingText={subtitle}
                />
              </div>

              {/* 快捷问题区 */}
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#fff',
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: '#9E988E',
                    margin: '0 0 12px',
                    fontFamily: "'Noto Serif SC', serif",
                  }}
                >
                  您可以问
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {quickQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuestionClick(question)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#fff',
                        border: '1px solid rgba(106,156,137,0.3)',
                        borderRadius: 20,
                        fontSize: 13,
                        color: '#6A9C89',
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                        fontFamily: "'Noto Serif SC', serif",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(106,156,137,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fff';
                      }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              {/* 输入区域 */}
              <div
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                  backgroundColor: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                  }}
                >
                  <input
                    type="text"
                    placeholder="输入问题..."
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 24,
                      fontSize: 14,
                      outline: 'none',
                      fontFamily: "'Noto Serif SC', serif",
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      handleSendMessage(input.value);
                      input.value = '';
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: '#C84B31',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 动画样式 */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          @keyframes pulseRing {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.6; }
          }
        `}</style>
      </>
    );
  }
);

FloatingGuide.displayName = 'FloatingGuide';

export default FloatingGuide;
