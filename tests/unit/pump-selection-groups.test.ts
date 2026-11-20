// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { pumpGroupPath, pumpGroupSlug, pumpModelKey } from '@/cms/pump-selection-groups';
import { pumpSelectionGroupRecords } from '@/cms/pump-selection-group-records';
import { pumpSelectionRecords } from '@/cms/pump-selection-records';
import { pumpSelectionProjection } from '@/cms/pump-selection-fields';

const groups = [
  { id: 1, title: 'New series', slug: 'new-series', parent: null },
  { id: 2, title: 'Row 80', slug: 'row-80', parent: 1 },
  { id: 3, title: 'Vertical', slug: 'vertical', parent: 2 },
];
const request = () => ({
  user: { role: 'publisher' }, context: {},
  payload: { find: vi.fn().mockResolvedValue({ docs: groups }), findVersions: vi.fn().mockResolvedValue({ docs: [] }) },
});
const groupValidate = pumpSelectionGroupRecords.hooks!.beforeValidate![0];
const pumpValidate = pumpSelectionRecords.hooks!.beforeValidate![0];
const published = {
  sku: 'NEW-ANY-123', title: 'New pump', group: 3, _status: 'published', systemTypes: ['heating', 'waterSupply'],
  curve: { speedRpm: 1450, frequencyHz: 60, points: [{ flow: 1, head: 20 }, { flow: 10, head: 8 }], sourceDocument: 1, sourcePage: 2 },
  pumpSelection: { flowMinM3h: 2, flowMaxM3h: 9 },
};

describe('Studio pump groups', () => {
  it('identifies the model using the execution folder without a hardcoded series list', () => {
    expect(pumpModelKey('HIP 32-6/2 R SSVF', 'SSVF')).toBe('HIP 32-6/2 R');
    expect(pumpModelKey('HIP 32-6/2 R', 'CSEF')).toBe('HIP 32-6/2 R');
    expect(pumpModelKey('HIP 32-6/4 R CSEF', 'CSEF')).toBe('HIP 32-6/4 R');
    expect(pumpModelKey('  New\u00a0Pump 80 B ', ' b ')).toBe('NEW PUMP 80');
    expect(pumpModelKey('NEW B 80', 'B')).toBe('NEW B 80');
  });

  it('derives a row from IDs and rejects broken, cyclic or deeper trees', () => {
    expect(pumpGroupPath(groups, 3)?.map(group => group.id)).toEqual([1, 2, 3]);
    expect(pumpGroupPath(groups, 999)).toBeNull();
    expect(pumpGroupPath([{ ...groups[0], parent: 3 }, ...groups.slice(1)], 3)).toBeNull();
    expect(pumpGroupPath([...groups, { id: 4, title: 'Too deep', slug: 'deep', parent: 3 }], 4)).toBeNull();
    expect(pumpGroupSlug('  HIP 40 / SSVF ')).toBe('hip-40-ssvf');
    expect(pumpGroupSlug('40')).toBe('group-40');
  });

  it('generates a slug for an empty creation field and keeps it on rename', async () => {
    const req = request();
    await expect(groupValidate({ req, data: { title: 'New Row', parent: 1, slug: '' } } as never))
      .resolves.toMatchObject({ slug: 'new-row', parent: 1 });
    await expect(groupValidate({ req, originalDoc: groups[2], data: { title: 'New title' } } as never))
      .resolves.toMatchObject({ slug: 'vertical' });
  });

  it('rejects duplicate siblings, cycles and changing the level of existing nodes', async () => {
    const req = request();
    await expect(groupValidate({ req, data: { title: 'Duplicate', slug: 'row-80', parent: 1 } } as never)).rejects.toThrow();
    await expect(groupValidate({ req, data: { title: 'Duplicate', slug: 'new-series', parent: null } } as never)).rejects.toThrow();
    await expect(groupValidate({ req, originalDoc: groups[0], data: { parent: 3 } } as never)).rejects.toThrow();
    await expect(groupValidate({ req, originalDoc: groups[2], data: { parent: null } } as never)).rejects.toThrow();
  });

  it('protects old pump versions when deleting an otherwise empty group', async () => {
    const req = request();
    req.payload.find.mockResolvedValue({ docs: [] });
    req.payload.findVersions.mockResolvedValue({ docs: [{ id: 2 }] });
    const remove = pumpSelectionGroupRecords.hooks!.beforeDelete![0];
    await expect(remove({ id: 3, req } as never)).rejects.toThrow('Папка содержит');
    expect(req.payload.findVersions).toHaveBeenCalledWith(expect.objectContaining({
      req, overrideAccess: false, where: { 'version.group': { equals: 3 } },
    }));
    req.payload.findVersions.mockResolvedValue({ docs: [] });
    await expect(remove({ id: 3, req } as never)).resolves.toBeUndefined();
  });
});

describe('pump publication', () => {
  it('publishes manually entered Q–H points without a source document', async () => {
    const req = request();
    const data = { ...published, curve: { ...published.curve, sourceDocument: null, sourcePage: null } };
    await expect(pumpValidate({ data, req } as never)).resolves.toEqual(data);
    expect(req.payload.find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'pump-selection-groups', req, overrideAccess: false }));
  });

  it('rejects missing systems, curve mode and non-execution folders', async () => {
    for (const patch of [
      { systemTypes: [] }, { systemTypes: ['cooling'] }, { group: 2 }, { group: 999 },
      { curve: { ...published.curve, speedRpm: 0 } },
      { curve: { ...published.curve, frequencyHz: null } },
    ]) {
      await expect(pumpValidate({ data: { ...published, ...patch }, req: request() } as never)).rejects.toThrow();
    }
  });

  it('allows incomplete drafts and hydraulic-only records without electrical frequency', async () => {
    const draft = { sku: 'DRAFT', _status: 'draft' };
    await expect(pumpValidate({ data: draft, req: request() } as never)).resolves.toEqual(draft);
    const hydraulic = { ...published, curve: { ...published.curve, hydraulicsOnly: true, frequencyHz: null } };
    await expect(pumpValidate({ data: hydraulic, req: request() } as never)).resolves.toEqual(hydraulic);
  });

  it('checks direct edits to a published record even when status is omitted', async () => {
    await expect(pumpValidate({ data: { systemTypes: [] }, originalDoc: published, req: request() } as never)).rejects.toThrow();
  });

  it('keeps anonymous API access closed and the internal projection stable after module reload', async () => {
    const read = pumpSelectionRecords.access!.read!;
    expect(await read({ req: { user: null, context: {} } } as never)).toBe(false);
    expect(await read({ req: { user: null, context: { pumpSelectionProjection: 'heisskraft.published-pump-selection' } } } as never)).toBe(false);
    vi.resetModules();
    const reloaded = await import('@/cms/pump-selection-fields');
    expect(reloaded.pumpSelectionProjection).toBe(pumpSelectionProjection);
    expect(await read({ req: { user: null, context: { pumpSelectionProjection: reloaded.pumpSelectionProjection } } } as never))
      .toEqual({ _status: { equals: 'published' } });
    expect(await pumpSelectionGroupRecords.access!.read!({ req: { user: null, context: {} } } as never)).toBe(false);
  });
});
