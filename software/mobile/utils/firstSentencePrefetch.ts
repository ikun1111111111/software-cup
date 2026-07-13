const COMPLETE_SENTENCE = /^([\s\S]*?[。！？!?；;])/;

export function extractFirstCompleteSentence(text: string): string | null {
  const sentence = text.match(COMPLETE_SENTENCE)?.[1]?.trim();
  if (!sentence) return null;

  const content = sentence.slice(0, -1).trim();
  return content ? sentence : null;
}

export function splitPrefetchedAnswer(
  answer: string,
  prefetchedSentence: string | null,
): { first: string; rest: string } | null {
  const cleanAnswer = answer.trim();
  const first = prefetchedSentence?.trim();
  if (!first || !cleanAnswer.startsWith(first)) return null;

  const rest = cleanAnswer.slice(first.length).trim();
  return rest ? { first, rest } : null;
}
