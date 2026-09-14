"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useProgress } from "@react-three/drei";
import type { BuildingBlock, BuildingBlockId } from "@/sections/designers/building-blocks";
import type { PipelineSystemId } from "@/sections/designers/pipeline-data";
import FacadeModel, { FACADE_RANGE } from "@/sections/designers/FacadeModel";
import FloorModel, { FLOOR_RANGE } from "@/sections/designers/FloorModel";
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

export default function BuildingScene({
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
}: BuildingSceneProps) {
  const controlsRef: OrbitControlsRef = useRef(null);
  const goalRef = useRef<CameraGoal | null>(null);
  const range = view === "facade" ? FACADE_RANGE : FLOOR_RANGE;

  return (
    <>
      <Canvas
        className="pipeline__canvas"
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ antialias: true }}
        camera={{ position: [130, 86, 134], fov: 36 }}
        onPointerMissed={() => {
          if (view === "floor") {
            onSelectElement(null);
          } else {
            onSelectBlock(null);
          }
        }}
      >
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

          <ViewReady view={view} onReady={onViewReady} />
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

      <SceneVeil phase={phase} />
    </>
  );
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
