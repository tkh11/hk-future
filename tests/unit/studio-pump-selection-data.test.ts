// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { getPumpSelectionGroups, getPumpSelectionRoute, getPumpSelectionRows } from '@/studio/pump-selection-data';
import type { StudioSession } from '@/studio/session';

vi.mock('server-only', () => ({}));
vi.mock('@/studio/locks', () => ({ lockHolder: vi.fn() }));
vi.mock('@/studio/media-data', () => ({ getMediaOptions: vi.fn() }));

const nodes = [
  { id: 1, title: 'HIP', slug: 'hip', parent: null },
  { id: 2, title: 'HIP 32', slug: 'hip-32', parent: 1 },
  { id: 3, title: 'SSVF', slug: 'ssvf', parent: 2 },
  { id: 4, title: 'Новая серия', slug: 'new', parent: null },
  { id: 5, title: 'Новый ряд', slug: 'new-row', parent: 4 },
  { id: 6, title: 'Новое исполнение', slug: 'new-version', parent: 5 },
];
function session(find: ReturnType<typeof vi.fn>) { return { payload: { find }, user: { id: 9 } } as unknown as StudioSession; }

describe('Studio pump folders', () => {
  it('builds both the existing URL and arbitrary new folders from CMS records', async () => {
    const find = vi.fn().mockResolvedValue({ docs: nodes });
    const groups = await getPumpSelectionGroups(session(find));
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'pump-selection-groups', overrideAccess: false, user: { id: 9 } }));
    expect(getPumpSelectionRoute(groups, ['hip', 'hip-32', 'ssvf', '7'])?.id).toBe(7);
    expect(getPumpSelectionRoute(groups, ['new'])?.children.map(group => group.title)).toEqual(['Новый ряд']);
    expect(getPumpSelectionRoute(groups, ['new', 'new-row', 'new-version'])?.groups.map(group => group.id)).toEqual([6]);
    expect(getPumpSelectionRoute(groups, ['missing'])).toBeNull();
  });

  it('allows an empty hierarchy to be opened and created in Studio', () => {
    expect(getPumpSelectionRoute([], [])).toMatchObject({ depth: 0, children: [], groups: [] });
  });

  it('opens Unicode folder and pump URLs with encoded or decoded Next parameters', async () => {
    const unicodeNodes = [
      { id: 10, title: 'Проверка UI', slug: 'проверка-ui', parent: null },
      { id: 11, title: 'Ряд', slug: 'ряд', parent: 10 },
      { id: 12, title: 'Исполнение', slug: 'исполнение', parent: 11 },
    ];
    const groups = await getPumpSelectionGroups(session(vi.fn().mockResolvedValue({ docs: unicodeNodes })));
    const slugs = unicodeNodes.map(group => group.slug);
    for (let depth = 1; depth <= 3; depth++) {
      const decoded = slugs.slice(0, depth);
      const encoded = decoded.map(encodeURIComponent);
      const route = getPumpSelectionRoute(groups, encoded);
      expect(route).toEqual(getPumpSelectionRoute(groups, decoded));
      expect(route?.href).toBe(`/studio/pump-selection/${encoded.join('/')}`);
    }
    const encodedPump = getPumpSelectionRoute(groups, [...slugs.map(encodeURIComponent), '42']);
    const decodedPump = getPumpSelectionRoute(groups, [...slugs, '42']);
    expect(encodedPump).toEqual(decodedPump);
    expect(encodedPump?.href).toBe(`${groups.find(group => group.id === 12)?.href}/42`);
    expect(getPumpSelectionRoute(groups, ['%broken'])).toBeNull();
  });

  it('finds arbitrary SKUs by name within the selected hierarchy only', async () => {
    const find = vi.fn().mockResolvedValueOnce({ docs: nodes }).mockResolvedValueOnce({ docs: [
      { id: 50, sku: 'NEW-001', title: 'Новый насос', group: 6, pumpSelection: { modelName: 'Новый насос' } },
    ] });
    const s = session(find);
    const groups = await getPumpSelectionGroups(s);
    const route = getPumpSelectionRoute(groups, ['new'])!;
    const rows = await getPumpSelectionRows(s, route.groups, 'насос');
    expect(find).toHaveBeenLastCalledWith(expect.objectContaining({
      collection: 'pump-selection-records', draft: true, where: { group: { in: [6] } }, overrideAccess: false,
    }));
    expect(rows).toEqual([{ id: 50, sku: 'NEW-001', title: 'Новый насос',
      groupName: 'Новая серия / Новый ряд / Новое исполнение', href: '/studio/pump-selection/new/new-row/new-version/50' }]);
  });
});
