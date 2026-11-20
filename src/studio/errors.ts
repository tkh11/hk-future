export type FieldError = { path: string; message: string };
export type ActionError = { error: string; fields?: FieldError[]; locked?: boolean };

const russian = (text?: string) => !!text && /[а-яё]/i.test(text);

/** Payload errors arrive as ValidationError (field list), APIError (message) or Locked; staff should only see Russian text. */
export function describeError(error: unknown): ActionError {
  const e = error as { name?: string; status?: number; message?: string; data?: { errors?: { path?: string; field?: string; message?: string }[] } };
  if (e.name === 'Locked' || e.status === 423) return { error: 'Карточку сейчас редактирует коллега.', locked: true };
  const fields = (e.data?.errors ?? []).flatMap(item => {
    const path = item.path ?? item.field;
    if (!path) return [];
    return [{ path, message: russian(item.message) ? item.message! : /unique/i.test(item.message ?? '') ? 'Это значение уже используется.' : 'Проверьте значение.' }];
  });
  if (fields.length) return { error: fields.length === 1 ? fields[0].message : `Исправьте поля: ${fields.length}.`, fields };
  if (e.name === 'Forbidden' || e.status === 403) return { error: russian(e.message) ? e.message! : 'Недостаточно прав.' };
  if (e.name === 'NotFound' || e.status === 404) return { error: 'Запись не найдена.' };
  if (russian(e.message)) return { error: e.message! };
  return { error: 'Не удалось сохранить.' };
}
