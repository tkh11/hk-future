import { APIError, type Access, type FieldAccess, type CollectionBeforeChangeHook, type CollectionBeforeOperationHook } from 'payload';

export const roles = ['admin', 'editor', 'publisher', 'analyst'] as const;
export type Role = typeof roles[number];
type Principal = { role?: unknown } | null | undefined;
export const isAdmin = (user: Principal) => user?.role === 'admin';
export const canPublish = (user: Principal) => isAdmin(user) || user?.role === 'publisher';
export const canEdit = (user: Principal) => canPublish(user) || user?.role === 'editor';
export const adminOnly: Access = ({ req }) => isAdmin(req.user);
export const editors: Access = ({ req }) => canEdit(req.user);
export const publishers: Access = ({ req }) => canPublish(req.user);
export const publishedOrEditor: Access = ({ req }) => canEdit(req.user) || { _status: { equals: 'published' } };
export const adminField: FieldAccess = ({ req }) => isAdmin(req.user);
export const publicationField: FieldAccess = ({ req }) => canPublish(req.user);

// Validate Payload's actual operation argument before it chooses base-row/version
// writes. Request/context objects can be replaced by nested Local API calls, so
// a later hook must not depend on state keyed by either object's identity.
export const captureDraftOperation: CollectionBeforeOperationHook = ({ args, req, operation }) => {
  if (req.context.trustedMigration === true || canPublish(req.user) || !canEdit(req.user)) return;
  if (['update', 'restoreVersion'].includes(operation) && !('draft' in args && args.draft === true)) {
    throw new APIError('Сохраните изменения как черновик.', 403);
  }
};

// Field access alone is insufficient: an update to a previously published document
// must not allow an editor to modify the public copy through REST or Local API.
export const guardPublication: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.context.trustedMigration === true || canPublish(req.user)) return data;
  if (!canEdit(req.user)) throw new APIError('Редактирование недоступно.', 403);
  if (data._status === 'published') throw new APIError('Публикация доступна только публикующему редактору.', 403);
  return { ...data, _status: 'draft' };
};
