import React, { useState } from 'react';
import { generatePuzzles, submitAnswer, type PuzzleItem } from '../../api/puzzle';

interface Props {
  spotName: string;
  sessionId: string;
  onComplete?: (correct: number, total: number) => void;
}

const difficultyColors: Record<string, string> = {
  easy: '#22C55E',
  medium: '#EAB308',
  hard: '#EF4444',
};

const difficultyLabels: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const PuzzleGame: React.FC<Props> = ({ spotName, sessionId, onComplete }) => {
  const [puzzles, setPuzzles] = useState<PuzzleItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [finished, setFinished] = useState(false);

  const loadPuzzles = async () => {
    setLoading(true);
    try {
      const res = await generatePuzzles(spotName);
      const data = (res as any).data ?? res;
      setPuzzles(data.puzzles || []);
      setCurrentIdx(0);
      setResults([]);
      setFinished(false);
    } catch {
      setPuzzles([]);
    }
    setLoading(false);
  };

  const handleSelect = async (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);

    const puzzle = puzzles[currentIdx];
    const correct = idx === puzzle.answer_index;

    try {
      await submitAnswer(sessionId, puzzle.id, idx, puzzle.answer_index);
    } catch {}

    setResults((prev) => [...prev, correct]);
  };

  const handleNext = () => {
    if (currentIdx + 1 >= puzzles.length) {
      setFinished(true);
      const correctCount = results.filter(Boolean).length;
      onComplete?.(correctCount, puzzles.length);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>AI 正在生成谜题...</div>;
  }

  if (puzzles.length === 0) {
    return (
      <div className="section-card" style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', marginBottom: 16 }}>
          点击按钮为「{spotName}」生成文化解谜题
        </p>
        <button onClick={loadPuzzles} style={{
          padding: '10px 28px', borderRadius: 20,
          background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
          color: '#fff', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>
          🧩 生成谜题
        </button>
      </div>
    );
  }

  if (finished) {
    const correct = results.filter(Boolean).length;
    return (
      <div className="section-card" style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>
          {correct === puzzles.length ? '🏆' : correct >= puzzles.length / 2 ? '🎉' : '💪'}
        </div>
        <h3 style={{ margin: '0 0 8px' }}>
          {correct === puzzles.length ? '完美通关！' : correct >= puzzles.length / 2 ? '表现不错！' : '继续加油！'}
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          答对 {correct}/{puzzles.length} 题
        </p>
        <button onClick={loadPuzzles} style={{
          marginTop: 16, padding: '10px 24px', borderRadius: 20,
          background: 'var(--color-primary)', color: '#fff', border: 'none',
          fontSize: 14, cursor: 'pointer',
        }}>
          🔄 再来一轮
        </button>
      </div>
    );
  }

  const puzzle = puzzles[currentIdx];
  const isCorrect = selected !== null && selected === puzzle.answer_index;

  return (
    <div className="section-card" style={{ padding: '24px' }}>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          第 {currentIdx + 1}/{puzzles.length} 题
        </span>
        <span style={{
          fontSize: 12, padding: '2px 10px', borderRadius: 8,
          background: `${difficultyColors[puzzle.difficulty] || '#999'}18`,
          color: difficultyColors[puzzle.difficulty] || '#666',
        }}>
          {difficultyLabels[puzzle.difficulty] || puzzle.difficulty}
        </span>
      </div>

      {/* Question */}
      <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 600 }}>{puzzle.question}</h3>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {puzzle.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isAnswer = puzzle.answer_index === idx;
          let bg = 'rgba(255,255,255,0.6)';
          let border = '1px solid var(--border-light)';
          let color = 'var(--text-primary)';

          if (selected !== null) {
            if (isAnswer) {
              bg = '#22C55E15';
              border = '1px solid #22C55E';
              color = '#166534';
            } else if (isSelected && !isAnswer) {
              bg = '#EF444415';
              border = '1px solid #EF4444';
              color = '#991B1B';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
              style={{
                padding: '12px 18px', borderRadius: 10, textAlign: 'left',
                background: bg, border, color, fontSize: 15,
                cursor: selected !== null ? 'default' : 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              <span style={{ fontWeight: 600, marginRight: 10 }}>
                {String.fromCharCode(65 + idx)}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div style={{
          padding: '12px 18px', borderRadius: 10,
          background: isCorrect ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${isCorrect ? '#BBF7D0' : '#FECACA'}`,
          marginBottom: 16, fontSize: 14, lineHeight: 1.6,
        }}>
          {isCorrect ? '✅ 回答正确！' : '❌ 回答错误'} — {puzzle.explanation}
        </div>
      )}

      {selected !== null && (
        <button onClick={handleNext} style={{
          padding: '10px 24px', borderRadius: 20,
          background: 'var(--color-primary)', color: '#fff', border: 'none',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          {currentIdx + 1 >= puzzles.length ? '查看结果' : '下一题 →'}
        </button>
      )}
    </div>
  );
};

export default PuzzleGame;
