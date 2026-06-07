import React, { useCallback, useMemo } from 'react';
import { FireOutlined } from '@ant-design/icons';
import InscriptionList from './InscriptionList';

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

  const inscriptionItems = useMemo(() => {
    return questions.map((question, index) => ({
      id: question.id,
      number: index + 1,
      text: question.question,
      note: `${question.count} 次交互`,
      highlight: index < 3,
    }));
  }, [questions]);

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
        <FireOutlined style={{ color: 'var(--vermilion)' }} />
        热门问答 Top10
      </h3>
      <div data-testid="questions-list">
        <InscriptionList
          items={inscriptionItems}
          onItemClick={(item) => {
            const question = questions.find((q) => q.id === item.id);
            if (question) handleQuestionClick(question);
          }}
        />
      </div>
    </div>
  );
};

export default HotQuestions;
