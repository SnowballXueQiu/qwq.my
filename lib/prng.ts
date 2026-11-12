/**
 * Integer-only pseudo-random sequence. Unlike Math.sin-based hashes it gives
 * bit-identical results on the server and in every browser, so values baked
 * into server-rendered markup never cause hydration mismatches.
 */
export function prng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}
