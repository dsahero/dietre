/**
 * Bounds a Gemini call to a hard wall-clock limit. The @google/generative-ai
 * SDK has no built-in timeout or retry, so a slow or quota-throttled request
 * otherwise hangs however long Google's server takes to respond. Every
 * caller of this already has a deterministic fallback (mock parser,
 * rule-based matching), so failing fast into that fallback beats blocking a
 * page render on an unbounded network stall.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer!: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
