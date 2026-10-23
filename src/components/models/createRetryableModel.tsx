"use client";

import dynamic from "next/dynamic";
import { useState, type ComponentType, type ReactElement, type ReactNode } from "react";
import ModelErrorBoundary from "@/components/ui/ModelErrorBoundary";

/** Call at module scope; the owner still decides when the viewer enters the viewport. */
export function createRetryableModel<Props extends object>(
  load: () => Promise<{ default: ComponentType<Props> }>,
  options: {
    loading?: () => ReactElement | null;
    fallback: (retry: () => void) => ReactNode;
  },
) {
  const createViewer = () => dynamic<Props>(load, { ssr: false, loading: options.loading });
  const InitialViewer = createViewer();

  return function RetryableModel(props: Props) {
    const [{ Viewer, attempt }, setAttempt] = useState(() => ({ Viewer: InitialViewer, attempt: 0 }));

    function retry() {
      // A new key alone retains React.lazy's rejected import. A fresh dynamic
      // component re-invokes the loader. Next's chunk loader can then re-request
      // a failed network chunk; an actual module-evaluation error may stay cached.
      const Viewer = createViewer();
      setAttempt(current => ({ Viewer, attempt: current.attempt + 1 }));
    }

    return <ModelErrorBoundary key={attempt} fallback={options.fallback(retry)}>
      <Viewer {...props} />
    </ModelErrorBoundary>;
  };
}
