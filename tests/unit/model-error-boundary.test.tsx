import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { afterEach, expect, it, vi } from "vitest";
import ModelErrorBoundary from "@/components/ui/ModelErrorBoundary";
import ModelFailure from "@/components/ui/ModelFailure";

afterEach(() => vi.restoreAllMocks());

it("keeps descriptions accessible and recovers the viewport after a failed model", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  let unavailable = true;
  const clearCache = vi.fn(() => { unavailable = false; });
  function Model() {
    if (unavailable) throw new Error("Model request failed");
    return <p>Модель загружена</p>;
  }
  function Viewer() {
    const [attempt, setAttempt] = useState(0);
    return <>
      <Link href="/catalog">Каталог продукции</Link>
      <ModelErrorBoundary key={attempt} fallback={<ModelFailure onRetry={() => { clearCache(); setAttempt(value => value + 1); }} />}>
        <Model />
      </ModelErrorBoundary>
    </>;
  }
  render(<Viewer />);
  expect(screen.getByRole("alert")).toBeVisible();
  expect(screen.getByRole("link", { name: "Каталог продукции" })).toBeVisible();
  await userEvent.setup().click(screen.getByRole("button", { name: "Попробовать снова" }));
  expect(clearCache).toHaveBeenCalledOnce();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Модель загружена")).toBeVisible();
});

it("places a designer recovery action in the UI flow and removes it after retry", async () => {
  const retry = vi.fn();
  const outletId = "test-model-recovery";
  const { rerender } = render(<><div id={outletId} /><div data-testid="renderer-layer" /></>);
  rerender(<>
    <div id={outletId} />
    <div data-testid="renderer-layer"><ModelFailure onRetry={retry} portalTargetId={outletId} /></div>
  </>);
  const button = screen.getByRole("button", { name: "Попробовать снова" });
  expect(button.closest(`#${outletId}`)).not.toBeNull();
  expect(screen.getByTestId("renderer-layer")).toBeEmptyDOMElement();
  await userEvent.setup().click(button);
  expect(retry).toHaveBeenCalledOnce();
  rerender(<><div id={outletId} /><div data-testid="renderer-layer" /></>);
  expect(document.getElementById(outletId)).toBeEmptyDOMElement();
});
