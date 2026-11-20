"use client";

import { useState, type RefObject } from "react";
import type { PumpPdfData, PumpPdfSnapshot } from "@/lib/pump-pdf";
import css from "./pump-selection.module.css";

const svgStyles = ["color", "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity",
  "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "font-size", "font-weight", "text-anchor"];

function copySvg(source: SVGSVGElement) {
  const copy = source.cloneNode(true) as SVGSVGElement;
  const originals = [source, ...source.querySelectorAll("*")];
  const copies = [copy, ...copy.querySelectorAll("*")];
  originals.forEach((element, index) => {
    const style = getComputedStyle(element);
    const target = copies[index];
    target.removeAttribute("class");
    target.removeAttribute("style");
    for (const property of svgStyles) target.setAttribute(property, style.getPropertyValue(property));
    target.setAttribute("font-family", "PumpPdf");
  });
  copy.querySelector("[data-point-picker]")?.remove();
  const { width, height } = source.viewBox.baseVal;
  copy.setAttribute("width", String(width));
  copy.setAttribute("height", String(height));
  return copy;
}

function captureChart(root: HTMLElement): PumpPdfSnapshot {
  const plots = [...root.querySelectorAll<SVGSVGElement>('svg[role="group"]')].map(copySvg);
  if (!plots.length) throw new Error("No pump chart");
  const legends = [...root.querySelectorAll("li")].map(item => {
    const existing = item.querySelector("svg");
    if (existing) return { sample: copySvg(existing), label: item.textContent?.trim() ?? "" };
    const style = getComputedStyle(item.querySelector("span")!);
    const sample = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    sample.setAttribute("viewBox", "0 0 26 8");
    const line = document.createElementNS(sample.namespaceURI, "line");
    for (const [key, value] of Object.entries({ x1: "1", x2: "25", y1: "4", y2: "4",
      stroke: style.borderTopColor, "stroke-width": "2", "stroke-dasharray": style.borderTopStyle === "dashed" ? "4 2" : "none" })) {
      line.setAttribute(key, value);
    }
    sample.append(line);
    return { sample, label: item.textContent?.trim() ?? "" };
  });
  return { plots, legends };
}

export default function PumpPdfButton({ data, chartRef }: {
  data: PumpPdfData;
  chartRef: RefObject<HTMLDivElement | null>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function download() {
    if (!chartRef.current || pending) return;
    setPending(true);
    setError(false);
    try {
      // Freeze the displayed chart before loading the PDF library or switching pumps.
      const snapshot = captureChart(chartRef.current);
      const { downloadPumpPdf } = await import("@/lib/pump-pdf");
      await downloadPumpPdf(data, snapshot);
    } catch (error) {
      console.error("Pump PDF failed", error);
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return <div className={css.pdfAction}>
    <button type="button" className={css.pdfButton} disabled={pending} aria-busy={pending} onClick={download}>
      {pending ? "Подготовка PDF…" : "Скачать техлист PDF"}
    </button>
    {error && <p className={css.error} role="alert">Не удалось создать PDF. Повторите попытку.</p>}
  </div>;
}
