import React, { useCallback } from 'react';
import { FireOutlined } from '@ant-design/icons';

export interface HotQuestion {
  id: string;
  question: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface HotQuestionsProps {
  questions?: HotQuestion[];
  onQuestionClick?: (question: HotQuestion) => void;
}

const MOCK_QUESTIONS: HotQuestion[] = [
  { id: '1', question: '灵山大佛有多高？', count: 156, trend: 'up' },
  { id: '2', question: '景区开放时间是什么？', count: 132, trend: 'stable' },
  { id: '3', question: '怎么去梵宫？', count: 98, trend: 'up' },
  { id: '4', question: '门票多少钱？', count: 87, trend: 'down' },
  { id: '5', question: '附近有什么好吃的？', count: 76, trend: 'up' },
  { id: '6', question: '九龙灌浴几点表演？', count: 65, trend: 'stable' },
  { id: '7', question: '停车场在哪里？', count: 54, trend: 'down' },
  { id: '8', question: '有导游服务吗？', count: 43, trend: 'up' },
  { id: '9', question: '可以带宠物吗？', count: 32, trend: 'stable' },
  { id: '10', question: '有无障碍设施吗？', count: 21, trend: 'up' },
];

const HotQuestions: React.FC<HotQuestionsProps> = ({
  questions: propQuestions,
  onQuestionClick,
}) => {
  const questions = propQuestions || MOCK_QUESTIONS;

  const handleQuestionClick = useCallback((question: HotQuestion) => {
    onQuestionClick?.(question);
  }, [onQuestionClick]);

  return (
    <div data-testid="hot-questions" style={{ padding: '20px' }}>
      <h3 style={{
        margin: '0 0 18px 0',
        fontSize: '15px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <FireOutlined style={{ color: 'var(--color-accent)' }} />
        热门问答 Top10
      </h3>
      <div data-testid="questions-list">
        {questions.map((question, index) => (
          <div
            key={question.id}
            data-testid={`question-${question.id}`}
            onClick={() => handleQuestionClick(question)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 8px',
              borderBottom: index < questions.length - 1 ? '1px solid var(--gray-100)' : 'none',
              cursor: onQuestionClick ? 'pointer' : 'default',
              borderRadius: 'var(--radius-sm)',
              transition: 'background-color 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{
              width: 24,
              height: 24,
              backgroundColor: index < 3 ? 'var(--color-accent)' : 'var(--gray-100)',
              color: index < 3 ? '#fff' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              marginRight: '12px',
              flexShrink: 0,
            }}>
              {index + 1}
            </span>
            <span style={{
              flex: 1,
              fontSize: '13px',
              color: 'var(--text-primary)',
            }}>
              {question.question}
            </span>
            <span className="font-mono" style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              marginRight: '10px',
              flexShrink: 0,
            }}>
              {question.count}次
            </span>
            <span style={{
              fontSize: '12px',
              color: question.trend === 'up'
                ? 'var(--color-success)'
                : question.trend === 'down'
                  ? 'var(--color-error)'
                  : 'var(--text-tertiary)',
              flexShrink: 0,
              fontWeight: 500,
            }}>
              {question.trend === 'up' ? '↑' : question.trend === 'down' ? '↓' : '→'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotQuestions;
