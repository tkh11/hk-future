import { inflateRawSync } from 'node:zlib'
import { IMPORT_LIMITS } from './limits'
import { CatalogImportError } from './types'

function reject(message: string): never {
  throw new CatalogImportError('unsafe-workbook', message)
}

/** Validate actual decompressed sizes, not only attacker-controlled ZIP size declarations. */
export function inspectXlsxArchive(bytes: Buffer): void {
  if (bytes.length < 22 || bytes.readUInt32LE(0) !== 0x04034b50) reject('Файл не является XLSX.')
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) {
      end = i
      break
    }
  }
  if (end < 0) reject('Повреждённый ZIP-контейнер XLSX.')
  const entries = bytes.readUInt16LE(end + 10)
  const directoryLength = bytes.readUInt32LE(end + 12)
  const directoryStart = bytes.readUInt32LE(end + 16)
  if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6) || bytes.readUInt16LE(end + 8) !== entries) reject('Многотомные архивы запрещены.')
  if (entries > IMPORT_LIMITS.zipEntries || entries === 0 || directoryStart + directoryLength !== end) reject('Недопустимая структура XLSX.')
  let cursor = directoryStart
  let inflatedTotal = 0
  let sheetCount = 0
  const names = new Set<string>()
  const ranges: Array<[number, number]> = []
  for (let i = 0; i < entries; i++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) reject('Повреждённый каталог XLSX.')
    const flags = bytes.readUInt16LE(cursor + 8)
    const method = bytes.readUInt16LE(cursor + 10)
    const compressedSize = bytes.readUInt32LE(cursor + 20)
    const expandedSize = bytes.readUInt32LE(cursor + 24)
    const nameLength = bytes.readUInt16LE(cursor + 28)
    const extraLength = bytes.readUInt16LE(cursor + 30)
    const commentLength = bytes.readUInt16LE(cursor + 32)
    const localOffset = bytes.readUInt32LE(cursor + 42)
    const next = cursor + 46 + nameLength + extraLength + commentLength
    if (next > end) reject('Повреждённая запись XLSX.')
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
    if (!name || names.has(name) || name.includes('..') || name.includes('\\') || name.startsWith('/') || name.includes('\0')) reject('Недопустимое имя записи XLSX.')
    names.add(name)
    if (flags & 1 || ![0, 8].includes(method) || expandedSize > IMPORT_LIMITS.inflatedBytes || compressedSize === 0xffffffff || bytes.readUInt16LE(cursor + 34)) reject('Зашифрованный или слишком большой XLSX.')
    if (expandedSize / Math.max(compressedSize, 1) > IMPORT_LIMITS.compressionRatio) reject('Слишком высокая степень сжатия XLSX.')
    if (localOffset + 30 > directoryStart || bytes.readUInt32LE(localOffset) !== 0x04034b50) reject('Повреждённый заголовок XLSX.')
    const localNameLength = bytes.readUInt16LE(localOffset + 26)
    const localExtraLength = bytes.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const dataEnd = dataStart + compressedSize
    if (dataEnd > directoryStart || bytes.readUInt16LE(localOffset + 6) !== flags || bytes.readUInt16LE(localOffset + 8) !== method || bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength).toString('utf8') !== name) reject('Несогласованные записи XLSX.')
    if (ranges.some(([start, finish]) => localOffset < finish && dataEnd > start)) reject('Перекрывающиеся записи XLSX.')
    ranges.push([localOffset, dataEnd])
    const compressed = bytes.subarray(dataStart, dataEnd)
    let expanded: Buffer
    try {
      expanded = method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: IMPORT_LIMITS.inflatedBytes - inflatedTotal + 1 })
    } catch {
      reject('Ошибка распаковки или превышен размер XLSX.')
    }
    inflatedTotal += expanded.length
    if (expanded.length !== expandedSize || inflatedTotal > IMPORT_LIMITS.inflatedBytes) reject('Превышен размер распакованного XLSX.')
    if (/(?:vbaProject|embeddings\/|externalLinks\/|connections\.xml|xl\/media\/)/i.test(name)) reject('Макросы, вложенные медиа и внешние источники запрещены.')
    if (/\.(?:xml|rels)$/i.test(name)) {
      const xml = expanded.toString('utf8')
      if (/<!DOCTYPE|<!ENTITY|TargetMode\s*=\s*["']External["']/i.test(xml)) reject('Внешние ссылки и XML-сущности запрещены.')
      if (name === 'xl/styles.xml' && expanded.length > 256 * 1024) reject('Слишком много стилей XLSX. Используйте простой шаблон.')
      if (name === 'xl/sharedStrings.xml') {
        let strings = 0
        const stringTag = /<(?:\w+:)?si(?:\s|>)/g
        while (stringTag.exec(xml)) {
          strings++
          if (strings > (IMPORT_LIMITS.rows + 1) * IMPORT_LIMITS.columns) reject('Слишком много строковых значений XLSX.')
        }
      }
      if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) {
        sheetCount++
        if (sheetCount > 1) reject('Импортируйте книгу с одним листом товаров.')
        if (/<(?:\w+:)?f(?:\s|>)/i.test(xml)) reject('Формулы запрещены. Замените их значениями.')
        let rowCount = 0
        for (const match of xml.matchAll(/<(?:\w+:)?row\b[^>]*>/g)) {
          rowCount++
          const rowNumber = match[0].match(/\br\s*=\s*["'](\d+)["']/)?.[1]
          if (rowCount > IMPORT_LIMITS.rows + 1 || (rowNumber && Number(rowNumber) > IMPORT_LIMITS.rows + 1)) reject('Превышено допустимое число строк XLSX.')
        }
        for (const match of xml.matchAll(/\b(?:r|ref)\s*=\s*["']([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?["']/g)) {
          for (const column of [match[1], match[3]].filter(Boolean)) {
            let number = 0
            for (const character of column) number = number * 26 + character.charCodeAt(0) - 64
            if (number > IMPORT_LIMITS.columns) reject('Превышено допустимое число колонок XLSX.')
          }
          if (Number(match[2]) > IMPORT_LIMITS.rows + 1 || Number(match[4] || 0) > IMPORT_LIMITS.rows + 1) reject('Недопустимый диапазон XLSX.')
        }
      }
    }
    cursor = next
  }
  if (cursor !== end || sheetCount !== 1 || !names.has('[Content_Types].xml') || !names.has('xl/workbook.xml')) reject('Недопустимая книга XLSX.')
}
