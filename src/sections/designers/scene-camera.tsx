"use client";

import { useEffect, useMemo, type ComponentRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls } from "@react-three/drei";
import { MathUtils, Vector3, type Box3, type PerspectiveCamera } from "three";

export type CameraGoal = {
  target: Vector3;
  distance: number;
  /** Orbit direction; the current one is kept when omitted. */
  direction?: Vector3;
  /** Jump instead of easing — used when a new model takes over the canvas. */
  immediate?: boolean;
};

export type CameraGoalRef = RefObject<CameraGoal | null>;

export type OrbitControlsRef = RefObject<ComponentRef<typeof OrbitControls> | null>;

/** Frustum as measured from the canvas, which is authoritative during a resize. */
export type FrameView = { fov: number; aspect: number };

/**
 * Distance at which a box fits the frame. The horizontal extent is taken as the
 * diagonal of the plan so the framing survives orbiting, while the vertical one
 * is exact — a 94 m tower would be lost inside its own bounding sphere.
 * `minSize` keeps close-ups of a 25 mm fitting outside its own geometry.
 */
export function frameBox(box: Box3, view: FrameView, margin = 1.15, minSize = 0) {
  const size = box.getSize(scratch);
  const vertical = MathUtils.degToRad(view.fov);
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * view.aspect);
  const height = Math.max(size.y, minSize);
  const width = Math.max(Math.hypot(size.x, size.z), minSize);

  return (
    Math.max(height / 2 / Math.tan(vertical / 2), width / 2 / Math.tan(horizontal / 2)) *
    margin
  );
}

const scratch = new Vector3();

export function usePerspectiveCamera() {
  return useThree((state) => state.camera) as PerspectiveCamera;
}

/**
 * Framing has to follow the canvas: on the first commit, and on every resize, the
 * camera aspect trails the measured size by a frame, which on a phone in portrait
 * is the difference between a framed tower and a cropped one.
 */
export function useFrameView(): FrameView {
  const { fov } = usePerspectiveCamera();
  const { width, height } = useThree((state) => state.size);

  // A stable identity: framing effects depend on this and must not re-run per frame.
  return useMemo(() => ({ fov, aspect: width / height }), [fov, width, height]);
}

const FALLBACK_DIRECTION = new Vector3(0.62, 0.3, 0.72).normalize();

/** Writes the unit orbit direction into `out`: the goal's, or the current one. */
function orbitDirection(
  out: Vector3,
  camera: PerspectiveCamera,
  target: Vector3,
  direction: Vector3 | undefined,
) {
  if (direction) {
    out.copy(direction);
  } else {
    out.copy(camera.position).sub(target);
  }

  if (out.lengthSq() < 1e-8) {
    out.copy(FALLBACK_DIRECTION);
  }

  return out.normalize();
}

/**
 * Eases the camera towards the goal set by whichever model owns the canvas. The
 * depth range comes with the view: the facade is measured in tens of metres, the
 * pipework in centimetres.
 */
export function CameraRig({
  controlsRef,
  goalRef,
  near,
  far,
}: {
  controlsRef: OrbitControlsRef;
  goalRef: CameraGoalRef;
  near: number;
  far: number;
}) {
  const invalidate = useThree((state) => state.invalidate);
  const offset = useMemo(() => new Vector3(), []);

  useEffect(invalidate, [invalidate, near, far]);

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera;

    if (camera.near !== near || camera.far !== far) {
      camera.near = near;
      camera.far = far;
      camera.updateProjectionMatrix();
    }

    const controls = controlsRef.current;
    const goal = goalRef.current;

    if (!controls || !goal) {
      return;
    }

    // The canvas only renders on demand, so an in-flight camera move has to
    // keep asking for the next frame.
    invalidate();

    if (goal.immediate) {
      controls.target.copy(goal.target);
      orbitDirection(offset, camera, controls.target, goal.direction);
      camera.position.copy(goal.target).addScaledVector(offset, goal.distance);
      controls.update();
      goalRef.current = null;

      return;
    }

    const step = 1 - Math.pow(0.0008, Math.min(delta, 0.05));

    controls.target.lerp(goal.target, step);

    const distance = MathUtils.lerp(
      camera.position.distanceTo(controls.target),
      goal.distance,
      step,
    );

    orbitDirection(offset, camera, controls.target, goal.direction);

    camera.position.copy(controls.target).addScaledVector(offset, distance);
    controls.update();

    if (
      controls.target.distanceTo(goal.target) < 0.005 &&
      Math.abs(distance - goal.distance) < 0.005
    ) {
      goalRef.current = null;
    }
  });

  return null;
}
