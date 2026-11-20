import ExcelJS from 'exceljs';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { EXPORT_LIMIT, getProductsForExport } from '@/studio/data';
import { profileLabel, publishLabels, reviewLabels } from '@/studio/labels';
import { parseProductParams } from '@/studio/query';
import { requireEditor } from '@/studio/session';

const idList = z.string().regex(/^\d+(,\d+){0,499}$/).optional().catch(undefined);
const missingLabels = { photo: 'главное фото', summary: 'краткое описание' } as const;

export async function GET(request: NextRequest) {
  const session = await requireEditor();
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const ids = idList.parse(raw.ids)?.split(',').map(Number);
  const { rows, truncated } = await getProductsForExport(session, parseProductParams(raw), ids);

  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Товары', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Название', key: 'title', width: 48 },
    { header: 'Адрес', key: 'slug', width: 32 },
    { header: 'Артикул', key: 'sku', width: 16 },
    { header: 'Раздел', key: 'category', width: 28 },
    { header: 'Тип продукции', key: 'profile', width: 22 },
    { header: 'Позиций', key: 'variants', width: 11 },
    { header: 'Документов', key: 'docs', width: 12 },
    { header: 'Не хватает', key: 'missing', width: 30 },
    { header: 'Публикация', key: 'status', width: 15 },
    { header: 'Проверка', key: 'review', width: 14 },
    { header: 'Изменено', key: 'updatedAt', width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow({
      ...row,
      profile: profileLabel(row.profile),
      missing: row.missing.map(m => missingLabels[m]).join(', '),
      status: publishLabels[row.status],
      review: reviewLabels[row.review],
      updatedAt: new Date(row.updatedAt),
    });
  }
  sheet.getColumn('updatedAt').numFmt = 'dd.mm.yyyy hh:mm';
  if (truncated) sheet.addRow({ title: `Выгружены первые ${EXPORT_LIMIT} строк. Сузьте фильтр, чтобы получить остальные.` });

  const buffer = await book.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="heisskraft-assortment-${date}.xlsx"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
