import { jsPDF } from 'jspdf';
import { autoTable, type UserOptions } from 'jspdf-autotable';
import 'svg2pdf.js';
import { publicPath } from './public-path';
import type { PumpTechnicalData } from './pump-technical-data';

export type PumpPdfData = {
  name: string;
  sku: string;
  design: [string, string][];
  actual: [string, string][];
  technical: PumpTechnicalData;
};
export type PumpPdfSnapshot = {
  plots: SVGSVGElement[];
  legends: { sample: SVGSVGElement; label: string }[];
};

async function fontFile(path: string) {
  const response = await fetch(publicPath(path));
  if (!response.ok) throw new Error('PDF font unavailable');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

export async function downloadPumpPdf(data: PumpPdfData, snapshot: PumpPdfSnapshot) {
  const fonts = await Promise.all(['Regular', 'Bold'].map(weight => fontFile(`/fonts/SFUIText-${weight}.ttf`)));
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  for (const [index, style] of ['normal', 'bold'].entries()) {
    pdf.addFileToVFS(`${style}.ttf`, fonts[index]);
    pdf.addFont(`${style}.ttf`, 'PumpPdf', style);
  }
  pdf.setProperties({ title: `Технический лист ${data.name}`, subject: `Артикул ${data.sku}`, author: 'HEISSKRAFT' });
  pdf.setFont('PumpPdf', 'normal');
  const margin = 14, pageWidth = 210, contentWidth = pageWidth - 2 * margin;
  const header = () => {
    pdf.setTextColor(20).setFont('PumpPdf', 'bold').setFontSize(13);
    pdf.text('HEISSKRAFT', margin, 15);
    pdf.setFont('PumpPdf', 'normal').setFontSize(10);
    pdf.text('Технический лист', pageWidth - margin, 15, { align: 'right' });
    pdf.setDrawColor(183, 25, 37).setLineWidth(0.5).line(margin, 19, pageWidth - margin, 19);
    pdf.setFont('PumpPdf', 'bold').setFontSize(14);
    const name: string[] = pdf.splitTextToSize(data.name, contentWidth);
    pdf.text(name, margin, 27);
    const end = 27 + (name.length - 1) * 5.7;
    pdf.setFont('PumpPdf', 'normal').setFontSize(9).text(`Артикул ${data.sku}`, margin, end + 5);
    return end + 10;
  };
  const table = (options: UserOptions) => {
    autoTable(pdf, {
      theme: 'grid',
      headStyles: { fillColor: [246, 246, 246], textColor: 20, fontStyle: 'bold' },
      ...options,
      styles: { font: 'PumpPdf', fontStyle: 'normal', fontSize: 9, cellPadding: 1.8, textColor: 25, lineColor: 220, lineWidth: 0.2,
        ...options.styles },
    });
    return (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  };

  let y = header();
  const hasDesign = data.design.length > 0;
  const leftEnd = hasDesign ? table({ startY: y, margin: { left: margin }, tableWidth: 87,
    head: [[{ content: 'Расчетная точка', colSpan: 2 }]], body: data.design,
    columnStyles: { 0: { cellWidth: 56 }, 1: { halign: 'right' } },
  }) : y;
  const rightEnd = table({ startY: y, margin: { left: hasDesign ? margin + 95 : margin }, tableWidth: hasDesign ? 87 : contentWidth,
    head: [[{ content: 'Фактическая рабочая точка', colSpan: 2 }]], body: data.actual,
    columnStyles: { 0: { cellWidth: hasDesign ? 56 : contentWidth / 2 }, 1: { halign: 'right' } },
  });
  y = Math.max(leftEnd, rightEnd) + 5;
  const totalRatio = snapshot.plots.reduce((sum, svg) => sum + svg.viewBox.baseVal.height / svg.viewBox.baseVal.width, 0);
  const graphWidth = Math.min(contentWidth, (275 - y - snapshot.legends.length * 4 - snapshot.plots.length * 2) / totalRatio);
  for (const svg of snapshot.plots) {
    const height = graphWidth * svg.viewBox.baseVal.height / svg.viewBox.baseVal.width;
    await pdf.svg(svg, { x: (pageWidth - graphWidth) / 2, y, width: graphWidth, height });
    y += height + 2;
  }
  for (const { sample, label } of snapshot.legends) {
    await pdf.svg(sample, { x: margin, y, width: 8, height: 2.5 });
    pdf.setFont('PumpPdf', 'normal').setFontSize(8).setTextColor(40).text(label, margin + 11, y + 2.5);
    y += 4;
  }

  pdf.addPage();
  const technicalHeader = () => {
    const top = header();
    pdf.setFont('PumpPdf', 'bold').setFontSize(12).text('Технические данные', margin, top + 3);
    return top + 7;
  };
  const technicalTop = technicalHeader();
  y = technicalTop;
  let technicalPage = pdf.getCurrentPageInfo().pageNumber;
  const technicalTable = (options: UserOptions) => table({
    startY: y, margin: { left: margin, right: margin, top: technicalTop, bottom: 17 },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 0.65, right: 3, bottom: 0.65, left: 0 }, lineWidth: 0 },
    willDrawPage: () => {
      const page = pdf.getCurrentPageInfo().pageNumber;
      if (page !== technicalPage) {
        technicalHeader();
        technicalPage = page;
      }
    },
    ...options,
  });
  if (data.technical.description) {
    y = technicalTable({ body: [[data.technical.description]] }) + 1.5;
  }
  for (const section of data.technical.sections) {
    y = technicalTable({
      head: [[{ content: section.title, colSpan: 2 }]],
      headStyles: { fillColor: false, fontStyle: 'bold', textColor: 20, minCellHeight: 5.5 },
      body: section.rows,
      pageBreak: y > technicalTop ? 'avoid' : 'auto',
      rowPageBreak: 'avoid',
      columnStyles: { 0: { cellWidth: 93 } },
    }) + 1.5;
  }
  const count = pdf.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    pdf.setPage(page).setFont('PumpPdf', 'normal').setFontSize(8).setTextColor(100);
    pdf.text(`${data.sku} · ${page} / ${count}`, pageWidth - margin, 289, { align: 'right' });
  }
  const filename = `${data.name} — ${data.sku}`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
  await pdf.save(`${filename}.pdf`, { returnPromise: true });
}
