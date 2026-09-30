"use client";

import { useEffect, useRef } from "react";
import { Html, useGLTF } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
  type Object3D,
} from "three";
import {
  BUILDING_BLOCKS,
  buildingBlockIdForHeight,
  type BuildingBlock,
  type BuildingBlockId,
} from "@/sections/designers/building-blocks";
import {
  frameBox,
  useFrameView,
  type CameraGoalRef,
} from "@/sections/designers/scene-camera";
import { bakeGeometry, boundsOf, mergeBaked } from "@/sections/designers/scene-geometry";
import { publicPath } from "@/lib/public-path";

export const FACADE_URL = publicPath("/models/facade.glb");
export const FACADE_RANGE: [number, number] = [1, 900];

/** Three-quarter view held close to an architectural elevation. */
const FACADE_DIRECTION = new Vector3(0.7, 0.1, 0.71).normalize();

/** Windows and railings; everything else in the export is opaque structure. */
const GLAZING = /Reynaers|Window|Ограждение|поручня/;

type Role = "solid" | "glazing";

type FacadeZone = {
  /** null for the entrance floors, which are context rather than a block. */
  block: BuildingBlock | null;
  solid: BufferGeometry | null;
  glazing: BufferGeometry | null;
  bounds: Box3;
  center: Vector3;
};

type PreparedFacade = {
  zones: FacadeZone[];
  bounds: Box3;
};

const prepared = new WeakMap<Object3D, PreparedFacade>();

/**
 * Groups the export by block and merges each group into a single draw call: 979
 * separately transformed meshes would otherwise be raycast on every pointer move
 * for an interface that only ever needs to know which block is under the cursor.
 * Revit level markers are dropped — they are annotation planes stacked to +86 m.
 */
function prepareFacade(root: Object3D): PreparedFacade {
  const cached = prepared.get(root);

  if (cached) {
    return cached;
  }

  root.updateMatrixWorld(true);

  const groups = new Map<string, Record<Role, BufferGeometry[]>>();
  const center = new Vector3();

  root.traverse((object) => {
    if (!(object instanceof Mesh) || object.name.startsWith("Уровень")) {
      return;
    }

    const geometry = bakeGeometry(object);

    geometry.computeBoundingBox();

    const height = geometry.boundingBox!.getCenter(center).y;
    const key = buildingBlockIdForHeight(height) ?? "context";
    const group =
      groups.get(key) ?? ({ solid: [], glazing: [] } satisfies Record<Role, BufferGeometry[]>);

    group[GLAZING.test(object.name) ? "glazing" : "solid"].push(geometry);
    groups.set(key, group);
  });

  const zones: FacadeZone[] = [];
  const bounds = new Box3();

  for (const [key, group] of groups) {
    const zoneBounds = boundsOf([...group.solid, ...group.glazing]);

    bounds.union(zoneBounds);

    zones.push({
      block: BUILDING_BLOCKS.find((block) => block.id === key) ?? null,
      solid: mergeBaked(group.solid),
      glazing: mergeBaked(group.glazing),
      bounds: zoneBounds,
      center: zoneBounds.getCenter(new Vector3()),
    });
  }

  const model: PreparedFacade = { zones, bounds };

  prepared.set(root, model);

  return model;
}

type MaterialState = "base" | "dimmed" | "open" | "soon";

let materials: Record<Role, Record<MaterialState, MeshStandardMaterial>> | null = null;

function facadeMaterials() {
  return (materials ??= {
    solid: {
      base: new MeshStandardMaterial({ color: "#c8ccd0", roughness: 0.88 }),
      dimmed: new MeshStandardMaterial({
        color: "#c8ccd0",
        roughness: 0.88,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
      // Red marks the block that can actually be opened — see DESIGN_SYSTEM §2.
      open: new MeshStandardMaterial({
        color: "#d3d7da",
        roughness: 0.82,
        emissive: "#c8102e",
        emissiveIntensity: 0.13,
      }),
      soon: new MeshStandardMaterial({ color: "#e0e3e5", roughness: 0.82 }),
    },
    glazing: {
      base: new MeshStandardMaterial({
        color: "#9fa9b2",
        roughness: 0.24,
        metalness: 0.12,
        transparent: true,
        opacity: 0.55,
      }),
      dimmed: new MeshStandardMaterial({
        color: "#9fa9b2",
        roughness: 0.24,
        metalness: 0.12,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
      open: new MeshStandardMaterial({
        color: "#b4bcc3",
        roughness: 0.2,
        metalness: 0.12,
        transparent: true,
        opacity: 0.7,
        emissive: "#c8102e",
        emissiveIntensity: 0.16,
      }),
      soon: new MeshStandardMaterial({
        color: "#c3cad0",
        roughness: 0.2,
        metalness: 0.12,
        transparent: true,
        opacity: 0.68,
      }),
    },
  });
}

export type FacadeModelProps = {
  goalRef: CameraGoalRef;
  activeBlockId: BuildingBlockId | null;
  /** Owned by the viewer so the block list and the model share one highlight. */
  hoveredBlockId: BuildingBlockId | null;
  resetToken: number;
  onHover: (blockId: BuildingBlockId) => void;
  /** Only clears the highlight if the block still owns it. */
  onHoverEnd: (blockId: BuildingBlockId) => void;
  onSelect: (block: BuildingBlock) => void;
};

export default function FacadeModel({
  goalRef,
  activeBlockId,
  hoveredBlockId,
  resetToken,
  onHover,
  onHoverEnd,
  onSelect,
}: FacadeModelProps) {
  const { scene } = useGLTF(FACADE_URL);
  const view = useFrameView();
  const invalidate = useThree((state) => state.invalidate);
  const model = prepareFacade(scene);
  const hovered = model.zones.find((zone) => zone.block?.id === hoveredBlockId) ?? null;
  const initialRef = useRef(true);
  const resetRef = useRef(resetToken);

  useEffect(() => {
    if (!hovered?.block?.model) {
      return;
    }

    document.body.style.cursor = "pointer";

    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  useEffect(() => {
    const active = model.zones.find((zone) => zone.block?.id === activeBlockId) ?? null;
    const bounds = active?.bounds ?? model.bounds;
    // The canonical direction is restored when the view is (re)built, but a block
    // is always approached from wherever the visitor has orbited to.
    const canonical = initialRef.current || resetRef.current !== resetToken;

    goalRef.current = {
      target: bounds.getCenter(new Vector3()),
      // The near corner of a 46 m plan sits well inside the framing distance, so
      // a three-quarter view needs noticeably more slack than a flat elevation.
      distance: frameBox(bounds, view, active ? 1.45 : 1.34),
      direction: canonical ? FACADE_DIRECTION : undefined,
      immediate: initialRef.current,
    };

    initialRef.current = false;
    resetRef.current = resetToken;
    invalidate();
  }, [activeBlockId, goalRef, invalidate, model, resetToken, view]);

  function materialFor(zone: FacadeZone, role: Role) {
    const set = facadeMaterials()[role];

    if (!zone.block) {
      return set.base;
    }

    if (zone.block.id === hoveredBlockId) {
      return zone.block.model ? set.open : set.soon;
    }

    return hoveredBlockId ? set.dimmed : set.base;
  }

  return (
    <>
      <hemisphereLight args={["#ffffff", "#c6cad0", 1.05]} />
      <directionalLight position={[120, 190, 90]} intensity={1.5} />
      <directionalLight position={[-110, 80, -80]} intensity={0.45} />

      {/* Ground level: everything below this disc is the underground part. */}
      <mesh rotation-x={-Math.PI / 2} position={[1.1, 0.05, 0.9]}>
        <circleGeometry args={[95, 96]} />
        <meshBasicMaterial color="#8b9299" transparent opacity={0.13} depthWrite={false} />
      </mesh>

      {model.zones.map((zone) => {
        const block = zone.block;

        return (
          <group
            key={block?.id ?? "context"}
            onPointerOver={
              block
                ? (event: ThreeEvent<PointerEvent>) => {
                    event.stopPropagation();
                    onHover(block.id);

                    if (block.model) {
                      useGLTF.preload(block.model);
                    }
                  }
                : undefined
            }
            onPointerOut={block ? () => onHoverEnd(block.id) : undefined}
            onClick={
              block
                ? (event: ThreeEvent<MouseEvent>) => {
                    event.stopPropagation();
                    onSelect(block);
                  }
                : undefined
            }
          >
            {zone.solid ? (
              <mesh geometry={zone.solid} material={materialFor(zone, "solid")} />
            ) : null}
            {zone.glazing ? (
              <mesh geometry={zone.glazing} material={materialFor(zone, "glazing")} />
            ) : null}
          </group>
        );
      })}

      {hovered?.block ? (
        <Html
          position={hovered.center}
          center
          zIndexRange={[2, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="pipeline__marker">
            <span className="pipeline__marker-title">{hovered.block.title}</span>
            <span
              className={`pipeline__marker-hint${hovered.block.model ? " is-open" : ""}`}
            >
              {hovered.block.model ? "Открыть" : "Скоро"}
            </span>
          </span>
        </Html>
      ) : null}
    </>
  );
}

useGLTF.preload(FACADE_URL);
