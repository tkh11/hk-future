import { applyImportPreview, CatalogImportError, IMPORT_FIELDS, type ImportField } from '@/cms/import'
import { createPayloadImportRepository } from '@/cms/import/payload-repository'
import { authorizeImport, importErrorResponse, importResponse, readImportBody } from '../_shared'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { cms, user } = await authorizeImport(request, 'apply')
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw new CatalogImportError('invalid-request', 'Нужен JSON-запрос.')
    const bytes = await readImportBody(request, 128 * 1024)
    let body: unknown
    try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }
    catch { throw new CatalogImportError('invalid-request', 'Некорректный JSON.') }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !('batchId' in body) || typeof body.batchId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.batchId) || Object.keys(body).some(key => key !== 'batchId' && key !== 'overwrites')) throw new CatalogImportError('invalid-request', 'Некорректный пакет импорта.')
    const overwrites = 'overwrites' in body ? body.overwrites : {}
    if (!overwrites || typeof overwrites !== 'object' || Array.isArray(overwrites) || Object.keys(overwrites).length > 1000) throw new CatalogImportError('invalid-overwrite', 'Неправильный список подтверждённых полей.')
    for (const [row, fields] of Object.entries(overwrites)) {
      if (!/^\d{1,4}$/.test(row) || !Array.isArray(fields) || fields.length > IMPORT_FIELDS.length || fields.some(field => !IMPORT_FIELDS.includes(field))) throw new CatalogImportError('invalid-overwrite', 'Неправильный список подтверждённых полей.')
    }
    return importResponse(await applyImportPreview(createPayloadImportRepository(cms, user), { batchId: body.batchId, actorId: user.id, overwrites: overwrites as Record<string, ImportField[]> }))
  } catch (error) { return importErrorResponse(error) }
}
