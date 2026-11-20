export type PumpSelectionGroupNode = {
  id: number;
  title: string;
  slug: string;
  parent: number | null;
};

export function pumpGroupPath<T extends PumpSelectionGroupNode>(groups: readonly T[], groupId: number): T[] | null {
  const path: T[] = [];
  let id: number | null = groupId;
  while (id !== null) {
    const group = groups.find(item => item.id === id);
    if (!group || path.length === 3 || path.some(item => item.id === id)) return null;
    path.unshift(group);
    id = group.parent;
  }
  return path;
}

export function pumpGroupSlug(title: string) {
  const slug = title.normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  return (/^\d+$/.test(slug) ? `group-${slug}` : slug).slice(0, 100).replace(/-$/, '');
}

export function pumpModelKey(name: string, execution: string) {
  const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase();
  const model = normalize(name);
  const suffix = ` ${normalize(execution)}`;
  return model.endsWith(suffix) ? model.slice(0, -suffix.length) : model;
}
