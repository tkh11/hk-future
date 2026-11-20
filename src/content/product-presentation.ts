/** Use existing CMS copy; never infer technical claims from a product name. */
export function productTagline(product: { summary: string; description: string }) {
  if (product.summary.trim()) return product.summary.trim();
  const sentence = product.description.trim().split(/\n|(?<=[.!?])\s+/)[0] || '';
  if (sentence.length <= 220) return sentence;
  return `${sentence.slice(0, 217).replace(/\s+\S*$/, '')}…`;
}
