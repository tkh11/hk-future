export type Access = 'edit' | 'publish' | 'admin';

export const productHref = (id: number) => `/studio/assortment/${id}`;
export const variantHref = (id: number) => `/studio/assortment/variants/${id}`;
export const pumpSelectionHref = '/studio/pump-selection';
export const pumpSelectionTitle = 'Программа подбора насосов';

/** Only same-site studio paths survive the round trip through the login form. */
export const safeNext = (value: unknown) =>
  typeof value === 'string' && /^\/studio(?:[/?#]|$)/.test(value) && !value.startsWith('/studio/login') && !/[\\\r\n]/.test(value) ? value : '/studio';
