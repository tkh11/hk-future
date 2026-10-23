"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { WebGLRenderer } from "three";
import ModelErrorBoundary from "@/components/ui/ModelErrorBoundary";
import ModelFailure from "@/components/ui/ModelFailure";
import { DESIGNERS_MODEL_RECOVERY_ID } from "./model-recovery";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import type { BuildingBlock, BuildingBlockId } from "@/sections/designers/building-blocks";
import type { PipelineSystemId } from "@/sections/designers/pipeline-data";
import FacadeModel, { FACADE_RANGE, FACADE_URL } from "@/sections/designers/FacadeModel";
import FloorModel, { FLOOR_RANGE, FLOOR_URL } from "@/sections/designers/FloorModel";
import {
  CameraRig,
  type CameraGoal,
  type OrbitControlsRef,
} from "@/sections/designers/scene-camera";

export type DesignersView = "facade" | "floor";

/** `leaving` covers the camera push into a block, `entering` the model swap. */
export type DesignersPhase = "idle" | "leaving" | "entering";

const CONTROLS = {
  facade: {
    minDistance: 40,
    maxDistance: 520,
    minPolarAngle: Math.PI * 0.16,
    maxPolarAngle: Math.PI * 0.56,
    rotateSpeed: 0.5,
    zoomSpeed: 0.6,
    panSpeed: 0.5,
  },
  floor: {
    minDistance: 0.8,
    maxDistance: 90,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI * 0.52,
    rotateSpeed: 0.55,
    zoomSpeed: 0.7,
    panSpeed: 0.6,
  },
} satisfies Record<DesignersView, object>;

export type BuildingSceneProps = {
  view: DesignersView;
  phase: DesignersPhase;
  activeBlockId: BuildingBlockId | null;
  hoveredBlockId: BuildingBlockId | null;
  onHoverBlock: (blockId: BuildingBlockId) => void;
  onHoverBlockEnd: (blockId: BuildingBlockId) => void;
  onSelectBlock: (block: BuildingBlock | null) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  activeSystemId: PipelineSystemId | null;
  isolated: boolean;
  resetToken: number;
  onViewReady: () => void;
};

export default function BuildingScene(props: BuildingSceneProps) {
  const [attempt, setAttempt] = useState(0);
  const [contextFailure, setContextFailure] = useState<string | null>(null);
  const attemptKey = `${props.view}:${attempt}`;
  function retry() {
    // useGLTF caches rejected promises too: remounting alone would fail again.
    useGLTF.clear(props.view === "facade" ? FACADE_URL : FLOOR_URL);
    setContextFailure(null);
    setAttempt(value => value + 1);
  }
  const failure = <ModelFailure onRetry={retry} portalTargetId={DESIGNERS_MODEL_RECOVERY_ID} />;
  return contextFailure === attemptKey ? failure : (
    <ModelErrorBoundary key={attemptKey} fallback={failure}>
      {/* Canvas also renders its native fallback inside a healthy canvas element.
          Keep that hidden HTML local; only an actual error uses the UI outlet. */}
      <SceneCanvas {...props} fallback={<ModelFailure onRetry={retry} />} onFailure={() => setContextFailure(attemptKey)} />
    </ModelErrorBoundary>
  );
}

function SceneCanvas({
  view,
  phase,
  activeBlockId,
  hoveredBlockId,
  onHoverBlock,
  onHoverBlockEnd,
  onSelectBlock,
  selectedElementId,
  onSelectElement,
  activeSystemId,
  isolated,
  resetToken,
  onViewReady,
  onFailure,
  fallback,
}: BuildingSceneProps & { onFailure: () => void; fallback: ReactNode }) {
  const controlsRef: OrbitControlsRef = useRef(null);
  const goalRef = useRef<CameraGoal | null>(null);
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => { setReady(true); onViewReady(); }, [onViewReady]);
  const range = view === "facade" ? FACADE_RANGE : FLOOR_RANGE;

  return (
    <>
      <Canvas
        className="pipeline__canvas"
        dpr={[1, 2]}
        frameloop="demand"
        fallback={fallback}
        gl={async defaults => {
          try { return new WebGLRenderer({ ...defaults, antialias: true }); }
          catch {
            onFailure();
            // R3F awaits the renderer factory without an error handler. The owner
            // unmounts this Canvas; leave configuration suspended, without timers
            // or a rejected promise that could escape to the whole page.
            return new Promise<WebGLRenderer>(() => {});
          }
        }}
        camera={{ position: [130, 86, 134], fov: 36 }}
        onPointerMissed={() => {
          if (view === "floor") {
            onSelectElement(null);
          } else {
            onSelectBlock(null);
          }
        }}
      >
        <ContextGuard onFailure={onFailure} />
        <Suspense fallback={null}>
          {view === "facade" ? (
            <FacadeModel
              goalRef={goalRef}
              activeBlockId={activeBlockId}
              hoveredBlockId={hoveredBlockId}
              resetToken={resetToken}
              onHover={onHoverBlock}
              onHoverEnd={onHoverBlockEnd}
              onSelect={onSelectBlock}
            />
          ) : (
            <FloorModel
              goalRef={goalRef}
              selectedId={selectedElementId}
              activeSystemId={activeSystemId}
              isolated={isolated}
              resetToken={resetToken}
              onSelect={onSelectElement}
            />
          )}

          <ViewReady view={view} onReady={handleReady} />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.075}
          {...CONTROLS[view]}
          onStart={() => {
            goalRef.current = null;
          }}
        />

        <CameraRig
          controlsRef={controlsRef}
          goalRef={goalRef}
          near={range[0]}
          far={range[1]}
        />
      </Canvas>

      <SceneVeil phase={!ready ? "entering" : phase} />
    </>
  );
}

function ContextGuard({ onFailure }: { onFailure: () => void }) {
  const renderer = useThree(state => state.gl);
  useEffect(() => {
    const canvas = renderer.domElement;
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [renderer, onFailure]);
  return null;
}

/**
 * Reports that the model behind the Suspense boundary has finished loading: this
 * only commits once the sibling model resolves, and `view` has to be a
 * dependency because the component itself survives the swap.
 */
function ViewReady({ view, onReady }: { view: DesignersView; onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady, view]);

  return null;
}

/**
 * Covers the canvas while a model takes over — including the first load, which
 * the viewer starts in the `entering` phase — and reports download progress.
 */
function SceneVeil({ phase }: { phase: DesignersPhase }) {
  const { active, progress } = useProgress();
  const visible = phase !== "idle";

  return (
    <div className={`pipeline__veil${visible ? " is-visible" : ""}`} aria-hidden={!visible}>
      {active ? (
        <span className="pipeline__veil-loader">
          <span className="pipeline__veil-label">Загрузка модели</span>
          <span className="pipeline__veil-track">
            <span
              className="pipeline__veil-bar"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </span>
        </span>
      ) : null}
    </div>
  );
}
