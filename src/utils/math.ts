export function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function normalizeVector(a: number[]): number[] {
  const norm = Math.sqrt(dotProduct(a, a));
  if (norm === 0) return a;
  return a.map(x => x / norm);
}
