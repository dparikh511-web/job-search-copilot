export interface StackMatchResult {
  score: number; // 0 to 1
  matchedKeywords: string[];
}

export function scoreStackMatch(jobText: string, targetStack: string[]): StackMatchResult {
  const lowerJobText = jobText.toLowerCase();

  const matchedKeywords = targetStack.filter((keyword) =>
    lowerJobText.includes(keyword.toLowerCase())
  );

  const score = targetStack.length === 0 ? 0 : matchedKeywords.length / targetStack.length;

  return { score, matchedKeywords };
}