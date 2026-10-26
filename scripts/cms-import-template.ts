import { writeFile } from 'node:fs/promises'
import { catalogImportCSVTemplate, catalogImportXLSXTemplate, type ImportTemplateName } from '../src/cms/import/templates'

async function main() {
  const [name, output] = process.argv.slice(2)
  if (!['pipes', 'pumps'].includes(name) || !output || !/\.(csv|xlsx)$/i.test(output)) throw new Error('Usage: tsx scripts/cms-import-template.ts <pipes|pumps> <output.csv|output.xlsx>')
  const bytes = output.toLowerCase().endsWith('.csv') ? catalogImportCSVTemplate(name as ImportTemplateName) : await catalogImportXLSXTemplate(name as ImportTemplateName)
  // Never overwrite an existing filled spreadsheet accidentally.
  await writeFile(output, bytes, { flag: 'wx' })
  console.log(`Шаблон сохранён: ${output}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Не удалось создать шаблон')
  process.exitCode = 1
})
