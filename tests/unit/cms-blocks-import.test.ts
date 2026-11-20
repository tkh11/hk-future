import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogImportPanel from "@/studio/components/CatalogImportPanel";
import CmsBlocks from "@/cms/blocks/CmsBlocks";
import { parsePublicBlocks } from "@/cms/blocks/parse";

vi.mock("server-only", () => ({}));

const preview = {
  id: "batch-1", status: "preview", issues: [], rows: [{ row: 2, action: "review", data: { sku: "SKU-1", title: "Труба" }, differences: [
    { field: "title", before: "Старое название", after: "Труба" },
    { field: "category", before: 1, after: 2 },
  ] }],
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function uploadAndPreview() {
  const user = userEvent.setup();
  render(createElement(CatalogImportPanel));
  await user.upload(screen.getByLabelText("Файл, до 5 МБ"), new File(["sku,title\nSKU-1,Труба"], "catalog.csv", { type: "text/csv" }));
  await user.click(screen.getByRole("button", { name: "Предварительный просмотр" }));
  await screen.findByRole("table");
  return user;
}

describe("catalog import review UI", () => {
  it("previews first and preserves existing values unless an explicit override is selected", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => preview })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ batchId: "batch-1", created: 0, updated: 0, unchanged: 0, preserved: 1 }) });
    vi.stubGlobal("fetch", fetch);
    const user = await uploadAndPreview();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("checkbox").every(input => !(input as HTMLInputElement).checked)).toBe(true);
    await user.click(screen.getByRole("button", { name: "Применить импорт (1 строк)" }));
    await screen.findByText(/Импорт завершён/);
    expect(fetch.mock.calls[1][0]).toBe("/api/catalog-import/apply");
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ batchId: "batch-1", overwrites: {} });
  });

  it("confirms a category change without overriding other fields", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => preview })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ batchId: "batch-1", created: 0, updated: 1, unchanged: 0, preserved: 0 }) });
    vi.stubGlobal("fetch", fetch);
    const user = await uploadAndPreview();
    await user.click(screen.getByRole("checkbox", { name: /Категория/ }));
    expect(screen.getByRole("checkbox", { name: /Название/ })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Применить импорт (1 строк)" }));
    await screen.findByText(/Импорт завершён/);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ batchId: "batch-1", overwrites: { "2": ["category"] } });
  });

  it("blocks apply when server validation reports an invalid row", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...preview, issues: [{ row: 2, message: "Неизвестная категория", code: "unknown-category" }] }) });
    vi.stubGlobal("fetch", fetch);
    await uploadAndPreview();
    expect(screen.getByRole("alert")).toHaveTextContent("Неизвестная категория");
    expect(screen.getByRole("button", { name: "Применить импорт (1 строк)" })).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("CMS server-rendered blocks", () => {
  it.each([
    { model: "data-centers", element: "pipes" },
    { model: "fire-suppression", element: "station" },
  ])("renders the edited model heading, destination and external product image for $model", ({ model, element }) => {
    const blocks = parsePublicBlocks([{ blockType: "modelDescriptions", model, heading: "Редакторский заголовок", items: [
      { element, title: "Выбранный товар", text: "Описание товара из CMS", href: "/catalog/pipelines", image: { url: "https://media.example.test/product.jpg", alt: "Фото товара" } },
    ] }]);
    const html = renderToStaticMarkup(createElement(CmsBlocks, { blocks }));
    expect(html).toContain("Редакторский заголовок");
    expect(html).toContain("Описание товара из CMS");
    expect(html).toContain('href="/catalog/pipelines"');
    expect(html).toContain('src="https://media.example.test/product.jpg"');
    expect(html).not.toContain("url=https%3A%2F%2Fmedia.example.test");
  });

  it("keeps text and working links in initial HTML and escapes editor markup", () => {
    const blocks = parsePublicBlocks([
      { blockType: "text", heading: "Трубопроводы", text: "<script>alert(1)</script>\n\nОписание системы" },
      { blockType: "cta", heading: "Выберите решение", actions: [{ label: "В каталог", href: "/catalog" }] },
    ]);
    const html = renderToStaticMarkup(createElement(CmsBlocks, { blocks }));
    expect(html).toContain("Трубопроводы"); expect(html).toContain("Описание системы");
    expect(html).toContain('href="/catalog"'); expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
