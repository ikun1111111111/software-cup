import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { generatePuzzles, submitAnswer, type PuzzleItem } from '@/api/puzzle';
import { Colors } from '@/constants/colors';

interface Props {
  spotName: string;
  sessionId: string;
  onComplete?: (correct: number, total: number) => void;
}

const difficultyColors: Record<string, string> = {
  easy: '#2D8B57',
  medium: '#E8A838',
  hard: '#DC4444',
};

const difficultyLabels: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export function PuzzleGame({ spotName, sessionId, onComplete }: Props) {
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
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>AI 正在生成谜题...</Text>
      </View>
    );
  }

  if (puzzles.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>?</Text>
          <Text style={styles.emptyTitle}>文化解谜</Text>
          <Text style={styles.emptyDesc}>为「{spotName}」生成 AI 文化谜题，测试你的历史知识</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.generateBtn, pressed && { opacity: 0.85 }]}
          onPress={loadPuzzles}
        >
          <Text style={styles.generateBtnText}>生成谜题</Text>
        </Pressable>
      </View>
    );
  }

  if (finished) {
    const correct = results.filter(Boolean).length;
    const ratio = correct / puzzles.length;
    return (
      <View style={styles.card}>
        <View style={styles.resultState}>
          <View style={[styles.resultCircle, {
            borderColor: ratio === 1 ? Colors.success : ratio >= 0.5 ? Colors.warning : Colors.error,
          }]}>
            <Text style={styles.resultScore}>{correct}/{puzzles.length}</Text>
          </View>
          <Text style={styles.resultTitle}>
            {ratio === 1 ? '完美通关' : ratio >= 0.5 ? '表现不错' : '继续加油'}
          </Text>
          <Text style={styles.resultSub}>答对 {correct} 题，共 {puzzles.length} 题</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
          onPress={loadPuzzles}
        >
          <Text style={styles.retryBtnText}>再来一轮</Text>
        </Pressable>
      </View>
    );
  }

  const puzzle = puzzles[currentIdx];
  const isCorrect = selected !== null && selected === puzzle.answer_index;

  return (
    <View style={styles.card}>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {
            width: `${((currentIdx + 1) / puzzles.length) * 100}%`,
          }]} />
        </View>
        <View style={[styles.diffBadge, {
          backgroundColor: (difficultyColors[puzzle.difficulty] || '#999') + '18',
        }]}>
          <Text style={[styles.diffText, {
            color: difficultyColors[puzzle.difficulty] || '#666',
          }]}>
            {difficultyLabels[puzzle.difficulty] || puzzle.difficulty}
          </Text>
        </View>
      </View>

      {/* Question number */}
      <Text style={styles.questionNum}>
        第 {currentIdx + 1} 题 / 共 {puzzles.length} 题
      </Text>

      {/* Question */}
      <Text style={styles.question}>{puzzle.question}</Text>

      {/* Options */}
      <View style={styles.options}>
        {puzzle.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isAnswer = puzzle.answer_index === idx;
          let bg: string = '#fff';
          let border: string = Colors.borderDefault;
          let textColor: string = Colors.ink;

          if (selected !== null) {
            if (isAnswer) {
              bg = '#E6F7ED';
              border = Colors.success;
              textColor = '#1a6b3c';
            } else if (isSelected && !isAnswer) {
              bg = '#FDECEA';
              border = Colors.error;
              textColor = '#991B1B';
            }
          }

          return (
            <Pressable
              key={idx}
              disabled={selected !== null}
              style={({ pressed }) => [
                styles.optionBtn,
                { backgroundColor: bg, borderColor: border },
                pressed && selected === null && { backgroundColor: Colors.gray50 },
              ]}
              onPress={() => handleSelect(idx)}
            >
              <View style={[styles.optionLetter, {
                backgroundColor: selected !== null
                  ? (isAnswer ? Colors.success : isSelected ? Colors.error : Colors.gray200)
                  : Colors.gray100,
              }]}>
                <Text style={[styles.optionLetterText, {
                  color: selected !== null
                    ? (isAnswer ? '#fff' : isSelected ? '#fff' : Colors.gray500)
                    : Colors.gray600,
                }]}>
                  {String.fromCharCode(65 + idx)}
                </Text>
              </View>
              <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Explanation */}
      {showExplanation && (
        <View style={[styles.explanation, {
          backgroundColor: isCorrect ? '#F0FDF4' : '#FEF2F2',
          borderColor: isCorrect ? '#BBF7D0' : '#FECACA',
        }]}>
          <Text style={[styles.explanationLabel, {
            color: isCorrect ? Colors.success : Colors.error,
          }]}>
            {isCorrect ? '回答正确' : '回答错误'}
          </Text>
          <Text style={styles.explanationText}>{puzzle.explanation}</Text>
        </View>
      )}

      {selected !== null && (
        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {currentIdx + 1 >= puzzles.length ? '查看结果' : '下一题'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    padding: 40, justifyContent: 'center', alignItems: 'center',
  },
  loadingText: {
    fontSize: 14, color: Colors.gray400, marginTop: 12, letterSpacing: 2,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20,
    shadowColor: Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },

  emptyState: { alignItems: 'center', marginBottom: 20 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primaryBg,
    color: Colors.primary, fontSize: 28, fontWeight: '700',
    textAlign: 'center', lineHeight: 56, marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.ink, marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13, color: Colors.gray500, textAlign: 'center', lineHeight: 20,
  },
  generateBtn: {
    alignSelf: 'center',
    paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 10, backgroundColor: Colors.primary,
  },
  generateBtnText: {
    fontSize: 14, color: '#fff', fontWeight: '600', letterSpacing: 1,
  },

  resultState: { alignItems: 'center', marginBottom: 20 },
  resultCircle: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  resultScore: {
    fontSize: 20, fontWeight: '800', color: Colors.ink,
  },
  resultTitle: {
    fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 4,
  },
  resultSub: {
    fontSize: 13, color: Colors.gray500,
  },
  retryBtn: {
    alignSelf: 'center',
    paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 10, backgroundColor: Colors.primary,
  },
  retryBtnText: { fontSize: 14, color: '#fff', fontWeight: '600', letterSpacing: 1 },

  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12, gap: 12,
  },
  progressTrack: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: Colors.gray100, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  diffText: { fontSize: 11, fontWeight: '600' },

  questionNum: {
    fontSize: 11, color: Colors.gray400, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  question: {
    fontSize: 16, fontWeight: '600', color: Colors.ink,
    marginBottom: 16, lineHeight: 24,
  },

  options: { gap: 10, marginBottom: 16 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 10,
    borderWidth: 1.5, borderStyle: 'solid',
    minHeight: 52,
  },
  optionLetter: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  optionLetterText: { fontSize: 13, fontWeight: '700' },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },

  explanation: {
    padding: 14, borderRadius: 10,
    borderWidth: 1, borderStyle: 'solid',
    marginBottom: 16,
  },
  explanationLabel: {
    fontSize: 13, fontWeight: '700', marginBottom: 4,
  },
  explanationText: { fontSize: 13, color: Colors.gray600, lineHeight: 20 },

  nextBtn: {
    alignSelf: 'center',
    paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 10, backgroundColor: Colors.primary,
  },
  nextBtnText: { fontSize: 14, color: '#fff', fontWeight: '600', letterSpacing: 1 },
});
