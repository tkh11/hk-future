import { parseCatalogImport, createImportPreview, IMPORT_LIMITS, CatalogImportError } from '@/cms/import'
import { createPayloadImportRepository } from '@/cms/import/payload-repository'
import { authorizeImport, importErrorResponse, importResponse, readImportBody } from '../_shared'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { cms, user } = await authorizeImport(request, 'preview')
    const contentType = request.headers.get('content-type') || ''
    if (!/^multipart\/form-data\s*;/i.test(contentType)) throw new CatalogImportError('invalid-request', 'Нужен файл multipart/form-data.')
    const bytes = await readImportBody(request, IMPORT_LIMITS.fileBytes + 64 * 1024)
    let form: FormData
    try { form = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': contentType }, body: bytes.buffer }).formData() }
    catch { throw new CatalogImportError('invalid-request', 'Не удалось прочитать загруженный файл.') }
    const entries = [...form.entries()]
    if (entries.length !== 1 || entries[0][0] !== 'file' || !(entries[0][1] instanceof File)) throw new CatalogImportError('invalid-request', 'Загрузите ровно один файл.')
    const file = entries[0][1]
    const parsed = await parseCatalogImport({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })
    const batch = await createImportPreview(createPayloadImportRepository(cms, user), parsed, { actorId: user.id })
    return importResponse(batch)
  } catch (error) { return importErrorResponse(error) }
}
