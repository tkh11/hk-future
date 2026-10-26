export const IMPORT_TEMPLATE_HEADERS = ['sku', 'externalId', 'slug', 'title', 'description', 'category', 'series'] as const

/** Examples are deliberately labelled as samples and must not be seeded as real products. */
export const IMPORT_TEMPLATES = {
  pipes: {
    headers: [...IMPORT_TEMPLATE_HEADERS, 'attr:diameter:number:mm:Диаметр', 'attr:material:text::Материал'],
    rows: [['SAMPLE-PIPE-001', 'sample-pipe-001', 'sample-pipe-001', 'Пример трубы — заменить', 'Учебная строка импорта', 'pipelines', 'heisskraft-therm', '25', 'PP-R']],
  },
  pumps: {
    headers: [...IMPORT_TEMPLATE_HEADERS, 'attr:power:number:kW:Мощность', 'attr:inline:boolean::Ин-лайн'],
    rows: [['SAMPLE-PUMP-001', 'sample-pump-001', 'sample-pump-001', 'Пример насоса — заменить', 'Учебная строка импорта', 'pumps', 'circulation', '1.5', 'true']],
  },
} as const

export type ImportTemplateName = keyof typeof IMPORT_TEMPLATES

export function catalogImportCSVTemplate(name: ImportTemplateName): string {
  const template = IMPORT_TEMPLATES[name]
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  return '\uFEFF' + [template.headers, ...template.rows].map(row => row.map(escape).join(';')).join('\r\n') + '\r\n'
}

export async function catalogImportXLSXTemplate(name: ImportTemplateName): Promise<Uint8Array> {
  const { default: ExcelJS } = await import('exceljs')
  const { Workbook } = ExcelJS
  const workbook = new Workbook()
  const sheet = workbook.addWorksheet('Products')
  const template = IMPORT_TEMPLATES[name]
  sheet.addRow([...template.headers])
  template.rows.forEach(row => sheet.addRow([...row]))
  sheet.columns.forEach(column => { column.width = 24; column.numFmt = '@' })
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  return new Uint8Array(await workbook.xlsx.writeBuffer())
}
