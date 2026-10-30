export const LEAD_REQUEST_EVENT = 'hk-open-lead';

export function productInquiry(product: { title: string; slug: string; sku?: string }) {
  return [`Прошу подготовить предложение на «${product.title}».`,
    product.sku ? `Артикул: ${product.sku}.` : '',
    `Страница товара: /products/${product.slug}`].filter(Boolean).join('\n');
}

export function leadRequestDetails(detail: unknown): string {
  if (!detail || typeof detail !== 'object' || !('details' in detail) || typeof detail.details !== 'string') return '';
  return detail.details.slice(0, 4000);
}
