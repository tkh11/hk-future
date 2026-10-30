/** Studio has no editors yet, so records open in the classic administration. */
export const productHref = (id: number) => `/admin/collections/products/${id}`;
export const variantHref = (id: number) => `/admin/collections/product-variants/${id}`;
export const classic = (path = '') => `/admin${path}`;
