import { describe, expect, it } from 'vitest';
import { productTagline } from '@/content/product-presentation';
import { leadRequestDetails, productInquiry } from '@/lib/lead-request';

describe('product presentation and inquiry context', () => {
  it('uses the author’s slogan and keeps a short fallback grounded in existing copy', () => {
    expect(productTagline({ summary: ' Эластичность при монтаже. ', description: 'Длинное описание.' })).toBe('Эластичность при монтаже.');
    expect(productTagline({ summary: '', description: 'Для систем отопления. Дополнительные сведения.' })).toBe('Для систем отопления.');
    expect(productTagline({ summary: '', description: 'Существующее описание '.repeat(50) }).length).toBeLessThanOrEqual(220);
    expect(productTagline({ summary: '', description: '' })).toBe('');
  });
  it('prefills the selected product without marking any form step complete', () => {
    expect(productInquiry({ title: 'Труба', slug: 'pipe', sku: 'HK-01' })).toBe('Прошу подготовить предложение на «Труба».\nАртикул: HK-01.\nСтраница товара: /products/pipe');
    expect(productInquiry({ title: 'Труба', slug: 'pipe', sku: '' })).not.toContain('Артикул:');
  });
  it('keeps normal lead buttons empty and accepts only bounded text context', () => {
    for (const detail of [undefined, null, { details: 12 }, 'text']) expect(leadRequestDetails(detail)).toBe('');
    expect(leadRequestDetails({ details: 'Товар' })).toBe('Товар');
    expect(leadRequestDetails({ details: 'x'.repeat(5000) })).toHaveLength(4000);
  });
});
