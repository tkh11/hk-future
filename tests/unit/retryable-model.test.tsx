import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import ModelFailure from "@/components/ui/ModelFailure";
import { createRetryableModel } from "@/components/models/createRetryableModel";

// Preserve the rejected-thenable caching that next/dynamic delegates to React.lazy.
vi.mock("next/dynamic", () => ({
  default: <Props extends object>(load: () => Promise<{ default: ComponentType<Props> }>, options: { ssr: boolean; loading?: () => ReactNode }) => {
    expect(options.ssr).toBe(false);
    const Viewer = lazy(load);
    return function DynamicViewer(props: Props) {
      return <Suspense fallback={options.loading?.()}><Viewer {...props} /></Suspense>;
    };
  },
}));

afterEach(() => vi.restoreAllMocks());

it("replaces the rejected lazy import only on retry and keeps the latest selection", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const load = vi.fn<() => Promise<{ default: ComponentType<{ selection: string }> }>>()
    .mockRejectedValueOnce(new Error("ChunkLoadError"))
    .mockResolvedValue({ default: ({ selection }) => <p>Модель: {selection}</p> });
  const Viewer = createRetryableModel(load, {
    loading: () => <p role="status">Загрузка</p>,
    fallback: retry => <ModelFailure onRetry={retry} />,
  });
  const { rerender } = render(<Viewer selection="Общий вид" />);
  expect(await screen.findByRole("alert")).toBeVisible();
  rerender(<Viewer selection="Насосы" />);
  expect(load).toHaveBeenCalledTimes(1);
  await userEvent.setup().click(screen.getByRole("button", { name: "Попробовать снова" }));
  expect(await screen.findByText("Модель: Насосы")).toBeVisible();
  expect(load).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
