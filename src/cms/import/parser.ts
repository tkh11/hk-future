import { createHash } from 'node:crypto'
import { IMPORT_LIMITS } from './limits'
import { CatalogImportError, type ImportAttribute, type ImportIssue, type ImportProductRow, type ParsedCatalogImport } from './types'
import { inspectXlsxArchive } from './xlsx-guard'

const BASE_HEADERS = new Set(['sku', 'externalId', 'slug', 'title', 'description', 'category', 'series'])
const REQUIRED_HEADERS = ['sku', 'slug', 'title', 'category', 'series']
const KEY = /^[a-z0-9][a-z0-9_-]{0,99}$/
const PATH = /^[a-z0-9][a-z0-9_/-]{0,199}$/
type AttributeColumn = Pick<ImportAttribute, 'key' | 'label' | 'valueType' | 'unit'>

function invalid(code: string, message: string): never {
  throw new CatalogImportError(code, message)
}

function readCSV(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0]
  const delimiter = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let closed = false
  const finishCell = () => {
    if (cell.length > IMPORT_LIMITS.cellCharacters) invalid('cell-limit', 'Слишком длинное значение ячейки.')
    row.push(cell)
    if (row.length > IMPORT_LIMITS.columns) invalid('column-limit', 'Слишком много колонок.')
    cell = ''
    closed = false
  }
  const finishRow = () => {
    finishCell()
    rows.push(row)
    row = []
    if (rows.length > IMPORT_LIMITS.rows + 1) invalid('row-limit', 'Максимум 1000 товаров в одном файле.')
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ }
        else { quoted = false; closed = true }
      } else cell += char
    } else if (char === delimiter) finishCell()
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      finishRow()
    } else if (char === '"' && cell === '' && !closed) quoted = true
    else if (closed || char === '"') invalid('invalid-csv', 'Неправильное экранирование CSV.')
    else cell += char
    if (cell.length > IMPORT_LIMITS.cellCharacters) invalid('cell-limit', 'Слишком длинное значение ячейки.')
  }
  if (quoted) invalid('invalid-csv', 'Незакрытая кавычка CSV.')
  if (cell || row.length || closed) finishRow()
  return rows
}

async function readXLSX(bytes: Buffer): Promise<string[][]> {
  inspectXlsxArchive(bytes)
  const { default: ExcelJS } = await import('exceljs')
  const { Workbook } = ExcelJS
  const workbook = new Workbook()
  try {
    await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0])
  } catch {
    invalid('invalid-xlsx', 'Не удалось прочитать XLSX.')
  }
  const sheet = workbook.worksheets[0]
  if (!sheet || workbook.worksheets.length !== 1 || sheet.state !== 'visible') invalid('invalid-sheet', 'Нужен один видимый лист товаров.')
  if (sheet.rowCount > IMPORT_LIMITS.rows + 1 || sheet.columnCount > IMPORT_LIMITS.columns) invalid('sheet-limit', 'Превышен размер таблицы.')
  const rows: string[][] = []
  for (let index = 1; index <= sheet.rowCount; index++) {
    const cells: string[] = []
    const row = sheet.getRow(index)
    for (let column = 1; column <= sheet.columnCount; column++) {
      const value = row.getCell(column).value
      if (value !== null && typeof value === 'object') invalid('unsupported-cell', `Строка ${index}: используйте значения без формул, ссылок и форматированного текста.`)
      const text = value == null ? '' : String(value)
      if (text.length > IMPORT_LIMITS.cellCharacters) invalid('cell-limit', `Строка ${index}: слишком длинная ячейка.`)
      if (index > 1 && ['sku', 'externalId'].includes(String(sheet.getRow(1).getCell(column).value)) && value !== null && typeof value !== 'string') invalid('identifier-type', `Строка ${index}: артикул и внешний ID должны быть текстом, чтобы сохранить ведущие нули.`)
      cells.push(text)
    }
    rows.push(cells)
  }
  return rows
}

export async function parseCatalogImport(file: { name: string; bytes: Uint8Array }): Promise<ParsedCatalogImport> {
  if (!file.bytes.byteLength || file.bytes.byteLength > IMPORT_LIMITS.fileBytes) invalid('file-limit', 'Размер файла должен быть от 1 байта до 5 МБ.')
  const bytes = Buffer.from(file.bytes)
  const extension = file.name.toLowerCase().split('.').pop()
  let cells: string[][]
  if (extension === 'csv') {
    let text: string
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
    catch { invalid('csv-encoding', 'Сохраните CSV в UTF-8.') }
    if (text.includes('\0')) invalid('invalid-csv', 'CSV содержит недопустимые символы.')
    cells = readCSV(text.replace(/^\uFEFF/, ''))
  } else if (extension === 'xlsx') cells = await readXLSX(bytes)
  else invalid('file-type', 'Поддерживаются только CSV (UTF-8) и XLSX.')
  const issues: ImportIssue[] = []
  const headers = cells[0]?.map(value => value.trim()) || []
  const attributeColumns = new Map<number, AttributeColumn>()
  const attributeKeys = new Set<string>()
  for (const name of REQUIRED_HEADERS) {
    if (!headers.includes(name)) issues.push({ code: 'missing-header', message: `Отсутствует колонка ${name}.`, field: name, row: 1 })
  }
  const seenHeaders = new Set<string>()
  headers.forEach((name, index) => {
    if (seenHeaders.has(name)) issues.push({ code: 'duplicate-header', message: `Повтор колонки ${name}.`, field: name, row: 1 })
    seenHeaders.add(name)
    if (BASE_HEADERS.has(name)) return
    const [prefix, key, valueType, unit, label, ...extra] = name.split(':')
    if (prefix !== 'attr' || !KEY.test(key || '') || !['text', 'number', 'boolean'].includes(valueType) || extra.length || (unit?.length || 0) > 32 || (label?.length || 0) > 100 || attributeKeys.has(key)) {
      issues.push({ code: 'invalid-header', message: `Неизвестная или неправильная колонка ${name}.`, field: name, row: 1 })
      return
    }
    attributeKeys.add(key)
    attributeColumns.set(index, { key, valueType: valueType as AttributeColumn['valueType'], label: label || key, ...(unit ? { unit } : {}) })
  })
  if (attributeColumns.size > IMPORT_LIMITS.attributes) issues.push({ code: 'attribute-limit', message: 'Максимум 20 характеристик.' })
  const rows: ImportProductRow[] = []
  const unique = { sku: new Set<string>(), externalId: new Set<string>(), slug: new Set<string>() }
  for (let index = 1; index < cells.length; index++) {
    const values = cells[index]
    if (values.every(value => !value.trim())) continue
    const rowNumber = index + 1
    const addIssue = (field: string, message: string, code = 'invalid-value') => issues.push({ row: rowNumber, field, code, message })
    if (values.length > headers.length && values.slice(headers.length).some(value => value.trim())) addIssue('', 'Число ячеек превышает число заголовков.', 'row-shape')
    const get = (name: string) => (values[headers.indexOf(name)] || '').trim()
    const data: ImportProductRow = {
      row: rowNumber, sku: get('sku'), slug: get('slug'), title: get('title'), description: get('description'),
      category: get('category'), series: get('series'), attributes: [],
      ...(get('externalId') ? { externalId: get('externalId') } : {}),
    }
    for (const name of ['sku', 'externalId'] as const) {
      const value = data[name]
      if ((!value && name === 'sku') || (value && (value.length > 100 || /[\x00-\x1F\x7F]/.test(value)))) addIssue(name, `Неправильное значение ${name}.`)
    }
    if (data.slug.length > 150 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) addIssue('slug', 'Slug должен содержать строчные латинские буквы и цифры, разделённые одиночными дефисами.')
    if (!data.title || data.title.length > 200) addIssue('title', 'Название обязательно, максимум 200 символов.')
    for (const name of ['category', 'series'] as const) if (!PATH.test(data[name]) || data[name].includes('//') || data[name].endsWith('/')) addIssue(name, `Укажите стабильный slug или путь для ${name}.`)
    values.forEach((value, column) => {
      if (/^\s*=/.test(value)) addIssue(headers[column] || '', 'Формулы не принимаются. Вставьте рассчитанное значение.', 'formula')
      const attribute = attributeColumns.get(column)
      if (!attribute || !value.trim()) return
      const normalized = value.trim()
      if (attribute.valueType === 'number') {
        const numeric = normalized.replace(',', '.')
        if (!/^-?\d+(?:\.\d+)?$/.test(numeric) || !Number.isFinite(Number(numeric))) addIssue(headers[column], 'Характеристика должна быть конечным числом без единицы измерения в значении.')
        else data.attributes.push({ ...attribute, numberValue: Number(numeric) })
      } else if (attribute.valueType === 'boolean') {
        if (!['true', 'false', '1', '0', 'да', 'нет'].includes(normalized.toLowerCase())) addIssue(headers[column], 'Используйте true/false, 1/0 или да/нет.')
        else data.attributes.push({ ...attribute, booleanValue: ['true', '1', 'да'].includes(normalized.toLowerCase()) })
      } else data.attributes.push({ ...attribute, textValue: normalized })
    })
    for (const name of ['sku', 'externalId', 'slug'] as const) {
      const value = data[name]
      if (!value) continue
      if (unique[name].has(value)) addIssue(name, `Повтор ${name}: ${value}.`, 'duplicate-identity')
      unique[name].add(value)
    }
    rows.push(data)
  }
  if (!rows.length) issues.push({ code: 'empty-file', message: 'Нет строк товаров для импорта.' })
  return {
    sourceName: file.name.split(/[\\/]/).pop()?.slice(0, 200) || 'import',
    sourceHash: createHash('sha256').update(bytes).digest('hex'), rows, issues,
  }
}
