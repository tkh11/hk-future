import { getCMS } from '@/cms/client'
import { canEdit } from '@/cms/access'
import { cmsEnabled } from '@/cms/env'
import { CatalogImportError } from '@/cms/import/types'

const windows = new Map<string, { count: number; expires: number }>()

export function importResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
}

export async function authorizeImport(request: Request, action: 'preview' | 'apply') {
  if (!cmsEnabled()) throw new CatalogImportError('disabled', 'Раздел недоступен.')
  const expected = new URL(process.env.CMS_SERVER_URL || 'http://localhost:3000').origin
  if (request.headers.get('origin') !== expected) throw new CatalogImportError('forbidden', 'Недопустимый источник запроса.')
  const cms = await getCMS()
  const { user } = await cms.auth({ headers: request.headers })
  if (!user) throw new CatalogImportError('unauthorized', 'Требуется вход в административную панель.')
  if (!canEdit(user)) throw new CatalogImportError('forbidden', 'Недостаточно прав для импорта.')
  const now = Date.now()
  for (const [key, item] of windows) if (item.expires <= now) windows.delete(key)
  const key = `${user.id}:${action}`
  const window = windows.get(key) || { count: 0, expires: now + 60_000 }
  if (window.count >= (action === 'preview' ? 5 : 10) || windows.size > 5000) throw new CatalogImportError('rate-limit', 'Слишком много запросов. Повторите через минуту.')
  window.count++
  windows.set(key, window)
  return { cms, user }
}

/** Count actual streamed bytes before multipart/JSON parsing; Content-Length alone is not trusted. */
export async function readImportBody(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const length = request.headers.get('content-length')
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new CatalogImportError('file-limit', 'Превышен размер запроса.')
  if (!request.body) throw new CatalogImportError('invalid-request', 'Пустой запрос.')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}) }, 15_000)
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (timedOut) throw new CatalogImportError('request-timeout', 'Истекло время загрузки файла.')
      if (done) break
      received += value.byteLength
      if (received > limit) { await reader.cancel(); throw new CatalogImportError('file-limit', 'Превышен размер запроса.') }
      chunks.push(value)
    }
  } finally {
    clearTimeout(timer)
    reader.releaseLock()
  }
  const result = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length }
  return result
}

export function importErrorResponse(error: unknown): Response {
  if (error instanceof CatalogImportError) {
    const statuses: Record<string, number> = { disabled: 404, unauthorized: 401, forbidden: 403, 'batch-not-found': 404, 'file-limit': 413, 'rate-limit': 429, 'request-timeout': 408, 'stale-preview': 409, 'identity-conflict': 409, 'import-timeout': 409, 'transaction-aborted': 409 }
    return importResponse({ code: error.code, error: error.message }, statuses[error.code] || 400)
  }
  // Never return SQL, request bodies, uploaded content or exception stacks to the browser.
  return importResponse({ code: 'import-failed', error: 'Импорт отменён. Проверьте файл и повторите попытку.' }, 500)
}
