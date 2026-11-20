// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPumpSelection, createPumpSelectionGroup, deletePumpSelectionGroup, renamePumpSelectionGroup, savePumpSelection, savePumpSharedCharacteristics } from '@/studio/pump-selection-actions';

const mocks = vi.hoisted(() => ({
  requireEditor: vi.fn(), createLocalReq: vi.fn(), getGroups: vi.fn(), lockHolder: vi.fn(), claimLock: vi.fn(), revalidatePath: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('payload', () => ({ createLocalReq: mocks.createLocalReq }));
vi.mock('@payloadcms/db-postgres', () => ({ sql: vi.fn() }));
vi.mock('@/studio/session', () => ({ requireEditor: mocks.requireEditor }));
vi.mock('@/studio/locks', () => ({ lockHolder: mocks.lockHolder, claimLock: mocks.claimLock }));
vi.mock('@/studio/pump-selection-data', () => ({ getPumpSelectionGroups: mocks.getGroups }));

const user = { id: 1, role: 'publisher' };
const req = { user };
const revision = '2026-11-12T10:00:00.000Z';
const savedAt = '2026-11-12T10:01:00.000Z';
function setup(canPublish = true) {
  const payload = {
    create: vi.fn().mockResolvedValue({ id: 42 }), update: vi.fn().mockResolvedValue({ id: 42, updatedAt: savedAt }),
    delete: vi.fn(), findByID: vi.fn(), find: vi.fn(),
    db: { beginTransaction: vi.fn().mockResolvedValue('tx'), commitTransaction: vi.fn(), rollbackTransaction: vi.fn(), sessions: { tx: { db: { execute: vi.fn() } } } },
  };
  mocks.requireEditor.mockResolvedValue({ payload, user, can: { publish: canPublish } });
  mocks.createLocalReq.mockResolvedValue({ ...req });
  mocks.lockHolder.mockResolvedValue(null);
  mocks.claimLock.mockResolvedValue(undefined);
  mocks.getGroups.mockResolvedValue([{ id: 3, href: '/studio/pump-selection/new/row/version', folders: [{}, {}, {}] }]);
  return payload;
}
beforeEach(() => vi.clearAllMocks());

describe('Studio pump management actions', () => {
  it('creates any SKU in a leaf as an independent draft with the authenticated request', async () => {
    const payload = setup();
    await expect(createPumpSelection({ sku: 'NEW-001', title: 'Новый насос', group: 3 })).resolves.toEqual({ ok: true, href: '/studio/pump-selection/new/row/version/42' });
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'pump-selection-records', draft: true, overrideAccess: false, user, req,
      data: expect.objectContaining({ sku: 'NEW-001', title: 'Новый насос', group: 3, _status: 'draft',
        pumpSelection: expect.objectContaining({ modelName: 'Новый насос' }), curve: { points: [] } }),
    }));
  });

  it('refuses creating a pump outside a leaf or without publishing rights', async () => {
    const payload = setup();
    await expect(createPumpSelection({ sku: 'NEW', title: 'Насос', group: 99 })).resolves.toHaveProperty('error');
    setup(false);
    await expect(createPumpSelection({ sku: 'NEW', title: 'Насос', group: 3 })).resolves.toHaveProperty('error');
    expect(payload.create).not.toHaveBeenCalled();
  });

  it('scopes folder operations to the user and lets CMS generate the URL once', async () => {
    const payload = setup();
    await createPumpSelectionGroup({ title: 'Новая серия', parent: null });
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'pump-selection-groups', data: { title: 'Новая серия', parent: null, slug: '' }, overrideAccess: false, req, user,
    }));
    await renamePumpSelectionGroup(3, 'Другое имя');
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({ data: { title: 'Другое имя' }, overrideAccess: false, req, user }));
    payload.delete.mockRejectedValueOnce(new Error('Группа содержит насосы.'));
    await expect(deletePumpSelectionGroup(3)).resolves.toEqual({ error: 'Группа содержит насосы.' });
    expect(payload.delete).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false, req, user }));
  });

  it('preserves curve metadata when editable curve values change', async () => {
    const payload = setup();
    const workbook = { filename: 'source.xlsx', sheet: 'QH', sha256: 'abc' };
    const metadata = { workbook, sourceDocument: 9, sourcePage: 16, hydraulicsOnly: false };
    payload.findByID.mockResolvedValue({ updatedAt: revision, curve: metadata });
    const curve = { points: [{ flow: 0, head: 20 }, { flow: 10, head: 10 }], speedRpm: 2900,
      frequencyHz: 50, nominalCurrentA: null };
    await expect(savePumpSelection(42, revision, { curve, group: 3 }, 'autosave')).resolves.toEqual({ ok: true, savedAt });
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({
      draft: true, autosave: true, overrideLock: false, overrideAccess: false,
      req: { user, transactionID: 'tx' }, data: { group: 3, curve: { ...curve, ...metadata } },
    }));
    expect(payload.db.commitTransaction).toHaveBeenCalledWith('tx');
  });

  it('rejects stale pump edits before changing identity or folder', async () => {
    const payload = setup();
    payload.findByID.mockResolvedValue({ updatedAt: savedAt });
    await expect(savePumpSelection(42, revision, { group: 3, sku: 'NEW' }, 'save')).resolves.toHaveProperty('error');
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.db.rollbackTransaction).toHaveBeenCalledWith('tx');
  });

  it('rejects moving a draft into a missing or non-leaf group', async () => {
    const payload = setup();
    payload.findByID.mockResolvedValue({ updatedAt: revision });
    await expect(savePumpSelection(42, revision, { group: 99 }, 'save')).resolves.toEqual({ error: 'Выберите исполнение насоса.' });
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.db.rollbackTransaction).toHaveBeenCalledWith('tx');
    expect(mocks.getGroups).toHaveBeenCalledWith(expect.objectContaining({ user }), { user, transactionID: 'tx' });
  });

  it('keeps common characteristic drafts private and publishes them separately', async () => {
    const payload = setup();
    payload.findByID.mockResolvedValue({ updatedAt: revision });
    const settings = { description: 'Описание серии' };
    await expect(savePumpSharedCharacteristics(1, revision, settings, 'save')).resolves.toEqual({ ok: true, savedAt });
    expect(payload.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { sharedCharacteristicsDraft: settings } }));
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith('/selection/pumps');
    await expect(savePumpSharedCharacteristics(1, revision, settings, 'publish')).resolves.toEqual({ ok: true, savedAt });
    expect(payload.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { sharedCharacteristics: settings, sharedCharacteristicsDraft: null },
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/selection/pumps');
  });

  it('preserves published groups when a shared change would invalidate a published article', async () => {
    const payload = setup();
    payload.findByID.mockResolvedValue({ updatedAt: revision });
    mocks.getGroups.mockResolvedValue([{ id: 3, folders: [{ id: 1 }, { id: 2 }, { id: 3 }] }]);
    payload.find.mockResolvedValue({ docs: [{ group: 3, sku: 'TEST', systemTypes: [], curve: { speedRpm: 2900, frequencyHz: 50 } }] });
    await expect(savePumpSharedCharacteristics(1, revision, { systemTypes: [] }, 'publish')).resolves.toEqual({
      error: 'Артикул TEST. Выберите тип системы.',
    });
    expect(payload.db.rollbackTransaction).toHaveBeenCalledWith('tx');
    expect(payload.update).not.toHaveBeenCalled();
  });
});
