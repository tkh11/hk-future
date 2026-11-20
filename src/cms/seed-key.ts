import { APIError, type Field } from 'payload';
import { isAdmin } from './access';

/** Private, stable identity for initial content; URLs remain freely editable. */
export const seedSourceKey: Field = {
  name: 'sourceKey', type: 'text', unique: true, index: true, maxLength: 300,
  access: {
    read: () => false,
    create: ({ req }) => req.context.trustedMigration === true && isAdmin(req.user),
    update: () => false,
  },
  hooks: { beforeChange: [({ value, originalDoc, req }) => {
    const previous = originalDoc?.sourceKey;
    if (previous) {
      if (value !== undefined && value !== previous) throw new APIError('Системный идентификатор начального наполнения неизменяем.', 400);
      return previous;
    }
    if (value != null && (req.context.trustedMigration !== true || !isAdmin(req.user))) {
      throw new APIError('Системный идентификатор назначается только при начальном наполнении.', 403);
    }
    return value;
  }] },
};
