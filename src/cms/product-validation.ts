import { ValidationError, type CollectionBeforeValidateHook } from 'payload';

/** Draft autosaves may be incomplete; publishing validates the merged document. */
export const validateProduct: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data;
  const document = { ...originalDoc, ...data };
  const publishing = document._status === 'published';
  if (publishing && (!document.productKind || document.productKind === 'single') && !document.sku?.trim()) {
    throw new ValidationError({ collection: 'products', id: originalDoc?.id, errors: [{ path: 'sku', message: 'Укажите артикул товара.' }], req });
  }
  return data;
};
