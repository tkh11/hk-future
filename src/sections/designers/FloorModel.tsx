"use client";

import { useEffect, useRef, useState } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Box3,
  Color,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
  type Object3D,
} from "three";
import {
  pipelineElementFromNode,
  PIPELINE_SYSTEMS,
  type PipelineElement,
  type PipelineSystemId,
} from "@/sections/designers/pipeline-data";
import {
  frameBox,
  useFrameView,
  type CameraGoalRef,
} from "@/sections/designers/scene-camera";
import { bakeGeometry, mergeBaked } from "@/sections/designers/scene-geometry";

export const FLOOR_URL = "/models/communications.glb";
export const FLOOR_RANGE: [number, number] = [0.05, 400];

const FLOOR_DIRECTION = new Vector3(0.58, 0.4, 0.71).normalize();

/** Sanitary ware and appliances: context for what the pipework connects to. */
const FIXTURES = /Sanitary|compact_kitchen|Refrigerator|trevo_|Vitreous/;

type Shell = "structure" | "fixtures";

type FloorElement = {
  key: string;
  element: PipelineElement;
  geometry: BufferGeometry;
  bounds: Box3;
  center: Vector3;
};

type PreparedFloor = {
  shell: Record<Shell, BufferGeometry | null>;
  elements: FloorElement[];
  bounds: Box3;
};

const prepared = new WeakMap<Object3D, PreparedFloor>();

/**
 * Splits the floor into the pipeline elements the visitor can pick and the shell
 * that only provides context. The shell is merged into two draw calls; every
 * pipe and fitting stays a separate mesh because each one is selectable.
 */
function prepareFloor(root: Object3D): PreparedFloor {
  const cached = prepared.get(root);

  if (cached) {
    return cached;
  }

  root.updateMatrixWorld(true);

  const shell: Record<Shell, BufferGeometry[]> = { structure: [], fixtures: [] };
  const elements: FloorElement[] = [];

  root.traverse((object) => {
    if (!(object instanceof Mesh) || object.name.startsWith("Уровень")) {
      return;
    }

    const geometry = bakeGeometry(object);

    geometry.computeBoundingBox();

    const element = pipelineElementFromNode(object.name);

    if (!element) {
      shell[FIXTURES.test(object.name) ? "fixtures" : "structure"].push(geometry);

      return;
    }

    const bounds = geometry.boundingBox!;

    elements.push({
      key: object.uuid,
      element,
      geometry,
      bounds,
      center: bounds.getCenter(new Vector3()),
    });
  });

  const bounds = elements.reduce(
    (box, item) => box.union(item.geometry.boundingBox!),
    new Box3(),
  );

  const model: PreparedFloor = {
    shell: {
      structure: mergeBaked(shell.structure),
      fixtures: mergeBaked(shell.fixtures),
    },
    elements,
    bounds,
  };

  prepared.set(root, model);

  return model;
}

type PipeState = "base" | "hover" | "active" | "muted" | "ghost";

const NEUTRAL = "#6d757c";

let materials: {
  shell: Record<Shell, MeshStandardMaterial>;
  pipe: Record<string, Record<PipeState, MeshStandardMaterial>>;
} | null = null;

function pipeStates(color: string): Record<PipeState, MeshStandardMaterial> {
  const muted = new Color(color).lerp(new Color("#ffffff"), 0.48);

  return {
    base: new MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.18 }),
    hover: new MeshStandardMaterial({
      color,
      roughness: 0.28,
      metalness: 0.22,
      emissive: color,
      emissiveIntensity: 0.28,
    }),
    active: new MeshStandardMaterial({
      color,
      roughness: 0.26,
      metalness: 0.22,
      emissive: color,
      emissiveIntensity: 0.5,
    }),
    muted: new MeshStandardMaterial({ color: muted, roughness: 0.5, metalness: 0.08 }),
    ghost: new MeshStandardMaterial({
      color: muted,
      roughness: 0.6,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  };
}

function floorMaterials() {
  return (materials ??= {
    shell: {
      // Walls, slabs and glazing stack up along every view ray, so a single
      // surface has to stay almost invisible for the floor to read as glass.
      structure: new MeshStandardMaterial({
        color: "#6d757c",
        roughness: 0.95,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
      }),
      fixtures: new MeshStandardMaterial({
        color: "#7d858c",
        roughness: 0.7,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    },
    pipe: {
      ...Object.fromEntries(
        PIPELINE_SYSTEMS.map((system) => [system.id, pipeStates(system.color)]),
      ),
      unknown: pipeStates(NEUTRAL),
    },
  });
}

export type FloorModelProps = {
  goalRef: CameraGoalRef;
  selectedId: string | null;
  activeSystemId: PipelineSystemId | null;
  isolated: boolean;
  resetToken: number;
  onSelect: (id: string | null) => void;
};

export default function FloorModel({
  goalRef,
  selectedId,
  activeSystemId,
  isolated,
  resetToken,
  onSelect,
}: FloorModelProps) {
  const { scene } = useGLTF(FLOOR_URL);
  const view = useFrameView();
  const invalidate = useThree((state) => state.invalidate);
  const model = prepareFloor(scene);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = model.elements.find((item) => item.element.id === hoveredId) ?? null;
  const initialRef = useRef(true);

  useEffect(() => {
    if (!hovered) {
      return;
    }

    document.body.style.cursor = "pointer";

    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  useEffect(() => {
    const selected = model.elements.find((item) => item.element.id === selectedId);

    goalRef.current = selected
      ? {
          target: selected.center.clone(),
          // A fitting is a few centimetres across: the minimum keeps enough of the
          // surrounding run in frame for the visitor to see where they landed.
          distance: frameBox(selected.bounds, view, 1.4, 1.8),
        }
      : {
          target: model.bounds.getCenter(new Vector3()),
          distance: frameBox(model.bounds, view, 1.45),
          direction: FLOOR_DIRECTION,
          immediate: initialRef.current,
        };

    initialRef.current = false;
    invalidate();
  }, [goalRef, invalidate, model, resetToken, selectedId, view]);

  function materialFor(item: FloorElement) {
    const states = floorMaterials().pipe[item.element.system?.id ?? "unknown"];

    if (activeSystemId && item.element.system?.id !== activeSystemId) {
      return states.ghost;
    }

    if (item.element.id === selectedId) {
      return states.active;
    }

    if (item.element.id === hoveredId) {
      return states.hover;
    }

    return selectedId ? states.muted : states.base;
  }

  return (
    <>
      <hemisphereLight args={["#ffffff", "#c6cad0", 1.1]} />
      <directionalLight position={[18, 26, 14]} intensity={1.6} />
      <directionalLight position={[-16, 12, -12]} intensity={0.5} />

      {/* Only the pipeline carries pointer handlers, so the shell is never hit. */}
      {(["structure", "fixtures"] as const).map((part) => {
        const geometry = model.shell[part];

        return geometry ? (
          <mesh
            key={part}
            geometry={geometry}
            material={floorMaterials().shell[part]}
            visible={!isolated}
          />
        ) : null;
      })}

      {model.elements.map((item) => {
        const filtered = Boolean(
          activeSystemId && item.element.system?.id !== activeSystemId,
        );

        return (
          <mesh
            key={item.key}
            geometry={item.geometry}
            material={materialFor(item)}
            onPointerOver={
              filtered
                ? undefined
                : (event: ThreeEvent<PointerEvent>) => {
                    event.stopPropagation();
                    setHoveredId(item.element.id);
                  }
            }
            onPointerOut={
              filtered
                ? undefined
                : () =>
                    setHoveredId((current) =>
                      current === item.element.id ? null : current,
                    )
            }
            onClick={
              filtered
                ? undefined
                : (event: ThreeEvent<MouseEvent>) => {
                    event.stopPropagation();
                    onSelect(item.element.id);
                  }
            }
          />
        );
      })}

      {hovered ? (
        <Html
          position={hovered.center}
          center
          zIndexRange={[2, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="pipeline__marker">
            <span className="pipeline__marker-title">{hovered.element.product.title}</span>
            {hovered.element.system ? (
              <span className="pipeline__marker-hint">{hovered.element.system.title}</span>
            ) : null}
          </span>
        </Html>
      ) : null}
    </>
  );
}
