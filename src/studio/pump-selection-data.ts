import 'server-only';
import type { PayloadRequest } from 'payload';
import { fromPumpSelection } from '@/cms/pump-selection-data';
import { pumpSharedOverrideKeysSchema } from '@/cms/pump-shared-characteristics';
import { pumpGroupPath, type PumpSelectionGroupNode } from '@/cms/pump-selection-groups';
import { lockHolder } from './locks';
import { getMediaOptions } from './media-data';
import { pumpSelectionHref } from './routes';
import type { StudioSession } from './session';
import { type PumpSelectionValues } from '@/cms/pump-selection-values';

const scoped = (s: StudioSession) => ({ overrideAccess: false, user: s.user }) as const;
const folderHref = (folders: PumpSelectionGroupNode[]) => [pumpSelectionHref, ...folders.map(({ slug }) => encodeURIComponent(slug))].join('/');
type Group = PumpSelectionGroupNode & { updatedAt: string; sharedCharacteristics?: unknown; sharedCharacteristicsDraft?: unknown };
type Folder = Group & { folders: Group[]; href: string };

export async function getPumpSelectionGroups(s: StudioSession, req?: PayloadRequest): Promise<Folder[]> {
  const { docs } = await s.payload.find({
    collection: 'pump-selection-groups', pagination: false, depth: 0, sort: 'title', req, ...scoped(s),
  });
  const groups = docs.map(({ id, title, slug, parent, updatedAt, sharedCharacteristics, sharedCharacteristicsDraft }) => ({
    id, title, slug, updatedAt, sharedCharacteristics, sharedCharacteristicsDraft,
    parent: typeof parent === 'number' ? parent : parent?.id ?? null,
  }));
  return groups.flatMap(group => {
    const folders = pumpGroupPath(groups, group.id);
    return folders ? [{ ...group, folders, href: folderHref(folders) }] : [];
  });
}

export function getPumpSelectionRoute(groups: Folder[], path: string[]) {
  try { path = path.map(segment => decodeURIComponent(segment)); } catch { return null; }
  const last = path.at(-1);
  const id = path.length === 4 && last && /^\d{1,9}$/.test(last) ? Number(last) : null;
  const slugs = id === null ? path : path.slice(0, -1);
  if (slugs.length > 3) return null;
  const current = slugs.length ? groups.find(group => group.folders.length === slugs.length
    && group.folders.every((folder, index) => folder.slug === slugs[index])) : null;
  if (slugs.length && !current) return null;
  const matching = groups.filter(group => group.folders.length === 3
    && slugs.every((slug, index) => group.folders[index]?.slug === slug));
  const folders = current?.folders ?? [];
  return {
    id, current, groups: matching, depth: folders.length,
    href: id === null ? folderHref(folders) : `${folderHref(folders)}/${id}`,
    children: groups.filter(group => group.parent === (current?.id ?? null)),
    trail: folders.map(({ title }, index) => ({ title, href: folderHref(folders.slice(0, index + 1)) })),
    parentHref: folderHref(folders.slice(0, -1)),
  };
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replaceAll('хип', 'hip').replace(/\s+/g, ' ').trim();
}

export async function getPumpSelectionRows(s: StudioSession, matching: Folder[], query: string) {
  if (!matching.length) return [];
  const { docs } = await s.payload.find({
    collection: 'pump-selection-records', draft: true, depth: 0, sort: 'sku', pagination: false,
    where: { group: { in: matching.map(group => group.id) } },
    select: { sku: true, title: true, group: true, pumpSelection: { modelName: true } }, ...scoped(s),
  });
  const groupById = new Map(matching.map(group => [group.id, group]));
  const search = normalizeSearch(query);
  return docs.flatMap(doc => {
    const group = groupById.get(typeof doc.group === 'number' ? doc.group : doc.group?.id ?? 0);
    if (!group) return [];
    const title = doc.pumpSelection?.modelName?.trim() || doc.title;
    if (search && ![doc.sku, title, doc.title].some(value => normalizeSearch(value).includes(search))) return [];
    return [{ id: doc.id, sku: doc.sku, title, groupName: group.folders.map(folder => folder.title).join(' / '), href: `${group.href}/${doc.id}` }];
  });
}

export async function getPumpSelectionEditor(s: StudioSession, id: number, groups: Folder[]) {
  const doc = await s.payload.findByID({
    collection: 'pump-selection-records', id, draft: true, disableErrors: true, depth: 0, ...scoped(s),
  });
  if (!doc) return null;
  const groupId = typeof doc.group === 'number' ? doc.group : doc.group?.id;
  const group = groups.find(item => item.id === groupId && item.folders.length === 3);
  if (!group) return null;
  const [holder, media, published] = await Promise.all([
    lockHolder(s, 'pump-selection-records', id), getMediaOptions(s),
    s.payload.findByID({
      collection: 'pump-selection-records', id, draft: false, disableErrors: true, depth: 0,
      select: { _status: true, updatedAt: true }, ...scoped(s),
    }),
  ]);
  const values: PumpSelectionValues = {
    sku: doc.sku, title: doc.title, group: group.id, connectionSize: doc.connectionSize ?? '',
    systemTypes: doc.systemTypes ?? [], pumpSelection: fromPumpSelection(doc.pumpSelection),
    characteristicOverrides: pumpSharedOverrideKeysSchema.safeParse(doc.characteristicOverrides).data ?? [],
    specs: {
      powerKw: doc.specs?.powerKw ?? null, voltageV: doc.specs?.voltageV ?? null,
      voltageDeltaV: doc.specs?.voltageDeltaV ?? null, voltageStarV: doc.specs?.voltageStarV ?? null,
      phases: doc.specs?.phases ?? null, netWeightKg: doc.specs?.netWeightKg ?? null,
    },
    curve: {
      points: (doc.curve?.points ?? []).map(({ flow, head }) => ({ flow, head })),
      speedRpm: doc.curve?.speedRpm ?? null, frequencyHz: doc.curve?.frequencyHz ?? null,
      nominalCurrentA: doc.curve?.nominalCurrentA ?? null,
    },
  };
  return {
    id, updatedAt: doc.updatedAt, holder, values, media, href: `${group.href}/${id}`,
    groups: groups.filter(item => item.folders.length === 3).map(item => ({ id: item.id, title: item.folders.map(folder => folder.title).join(' / ') })),
    sharedGroups: groups.map(({ id, parent, title, slug, sharedCharacteristics }) => ({ id, parent, title, slug, sharedCharacteristics })),
    published: published?._status === 'published', hasDraft: published?.updatedAt !== doc.updatedAt,
    curveSource: { workbook: doc.curve?.workbook?.filename ? doc.curve.workbook : null },
  };
}

export type PumpSelectionEditorData = NonNullable<Awaited<ReturnType<typeof getPumpSelectionEditor>>>;
