/** Conservative v1 limits protect preview requests before ExcelJS allocates workbook objects. */
export const IMPORT_LIMITS = Object.freeze({
  fileBytes: 5 * 1024 * 1024,
  inflatedBytes: 20 * 1024 * 1024,
  zipEntries: 100,
  compressionRatio: 200,
  rows: 1000,
  columns: 80,
  cellCharacters: 8000,
  attributes: 20,
})
