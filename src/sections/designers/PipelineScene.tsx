"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import {
  Box3,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Object3D,
} from "three";
import { pipelineElementIdFromNode } from "@/sections/designers/pipeline-data";

const MODEL_URL = "/models/designers-building.glb";

// The pipeline riser sits at x≈6.45, z≈1.5 and spans y −2.9…9.7 in the source
// model, so the default view is framed around it rather than the whole building.
const DEFAULT_TARGET = new Vector3(6.45, 3.4, 1.5);
const DEFAULT_DIRECTION = new Vector3(0.58, 0.4, 0.71).normalize();
const DEFAULT_DISTANCE = 20;
const DEFAULT_POSITION = DEFAULT_TARGET.clone().addScaledVector(
  DEFAULT_DIRECTION,
  DEFAULT_DISTANCE,
);

type Part = {
  key: string;
  geometry: BufferGeometry;
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
};

type PipePart = Part & { id: string; bounds: Box3 };

type PreparedModel = {
  shell: Part[];
  pipes: PipePart[];
};

function createMaterials() {
  return {
    // Dozens of walls and slabs stack up along every view ray, so a single
    // surface has to stay almost invisible for the building to read as glass.
    shell: new MeshStandardMaterial({
      color: "#6d757c",
      roughness: 0.95,
      metalness: 0,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
    }),
    pipe: new MeshStandardMaterial({
      color: "#1a5fb4",
      roughness: 0.34,
      metalness: 0.2,
    }),
    pipeMuted: new MeshStandardMaterial({
      color: "#7ba6de",
      roughness: 0.5,
      metalness: 0.1,
    }),
    pipeHover: new MeshStandardMaterial({
      color: "#2f7fd6",
      roughness: 0.28,
      metalness: 0.25,
    }),
    pipeActive: new MeshStandardMaterial({
      color: "#1a5fb4",
      roughness: 0.28,
      metalness: 0.25,
      emissive: "#1a5fb4",
      emissiveIntensity: 0.35,
    }),
  };
}

/**
 * Flattens the Revit export into plain geometry + world transform records so
 * the scene can be rendered declaratively: the pipeline elements the user can
 * pick, and the building shell that only provides context. Revit level markers
 * are dropped — they are annotation planes stacked up to +86 m and would wreck
 * both the framing and the depth range.
 */
function prepareModel(root: Object3D): PreparedModel {
  const shell: Part[] = [];
  const pipes: PipePart[] = [];

  root.updateMatrixWorld(true);

  root.traverse((object) => {
    if (!(object instanceof Mesh) || object.name.startsWith("Уровень")) {
      return;
    }

    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();

    object.matrixWorld.decompose(position, quaternion, scale);

    const part: Part = {
      key: object.uuid,
      geometry: object.geometry,
      position,
      quaternion,
      scale,
    };

    const id = pipelineElementIdFromNode(object.name);

    if (id) {
      const bounds = new Box3()
        .setFromBufferAttribute(object.geometry.attributes.position)
        .applyMatrix4(object.matrixWorld);

      pipes.push({ ...part, id, bounds });
    } else {
      shell.push(part);
    }
  });

  return { shell, pipes };
}

type CameraGoal = { target: Vector3; distance: number };

function CameraRig({
  controlsRef,
  goalRef,
}: {
  controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>;
  goalRef: RefObject<CameraGoal | null>;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const offset = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const goal = goalRef.current;

    if (!controls || !goal) {
      return;
    }

    // The canvas only renders on demand, so an in-flight camera move has to
    // keep asking for the next frame.
    invalidate();

    const step = 1 - Math.pow(0.0008, Math.min(delta, 0.05));

    controls.target.lerp(goal.target, step);
    offset.copy(camera.position).sub(controls.target);

    if (offset.lengthSq() < 1e-6) {
      offset.copy(DEFAULT_DIRECTION);
    }

    const distance = MathUtils.lerp(offset.length(), goal.distance, step);

    camera.position.copy(controls.target).addScaledVector(offset.normalize(), distance);
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

type ExperienceProps = {
  selectedId: string | null;
  isolated: boolean;
  resetToken: number;
  onSelect: (id: string | null) => void;
};

function Experience({ selectedId, isolated, resetToken, onSelect }: ExperienceProps) {
  const { scene } = useGLTF(MODEL_URL);
  const invalidate = useThree((state) => state.invalidate);
  const materials = useMemo(() => createMaterials(), []);
  const model = useMemo(() => prepareModel(scene), [scene]);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const goalRef = useRef<CameraGoal | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!hoveredId) {
      return;
    }

    document.body.style.cursor = "pointer";

    return () => {
      document.body.style.cursor = "";
    };
  }, [hoveredId]);

  useEffect(() => {
    const pipe = model.pipes.find((part) => part.id === selectedId);

    if (pipe) {
      const size = pipe.bounds.getSize(new Vector3());

      goalRef.current = {
        target: pipe.bounds.getCenter(new Vector3()),
        distance: Math.max(size.length(), 0.7) * 1.8 + 0.7,
      };
    } else {
      goalRef.current = { target: DEFAULT_TARGET.clone(), distance: DEFAULT_DISTANCE };
    }

    invalidate();
  }, [model, selectedId, resetToken, invalidate]);

  function pipeMaterial(id: string) {
    if (id === selectedId) {
      return materials.pipeActive;
    }

    if (id === hoveredId) {
      return materials.pipeHover;
    }

    return selectedId ? materials.pipeMuted : materials.pipe;
  }

  return (
    <>
      <hemisphereLight args={["#ffffff", "#c6cad0", 1.1]} />
      <directionalLight position={[18, 26, 14]} intensity={1.6} />
      <directionalLight position={[-16, 12, -12]} intensity={0.5} />

      {/* Only the pipes carry pointer handlers, so the shell can never be hit. */}
      {model.shell.map((part) => (
        <mesh
          key={part.key}
          geometry={part.geometry}
          material={materials.shell}
          position={part.position}
          quaternion={part.quaternion}
          scale={part.scale}
          visible={!isolated}
        />
      ))}

      {model.pipes.map((part) => (
        <mesh
          key={part.key}
          geometry={part.geometry}
          material={pipeMaterial(part.id)}
          position={part.position}
          quaternion={part.quaternion}
          scale={part.scale}
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            setHoveredId(part.id);
          }}
          onPointerOut={() =>
            setHoveredId((current) => (current === part.id ? null : current))
          }
          onClick={(event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            onSelect(part.id);
          }}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={DEFAULT_TARGET}
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        panSpeed={0.6}
        minDistance={0.8}
        maxDistance={90}
        maxPolarAngle={Math.PI * 0.52}
        onStart={() => {
          goalRef.current = null;
        }}
      />

      <CameraRig controlsRef={controlsRef} goalRef={goalRef} />
    </>
  );
}

function SceneLoader() {
  const { active, progress } = useProgress();
  const done = !active && progress >= 100;

  return (
    <div className={`pipeline__loader${done ? " is-done" : ""}`} aria-hidden={done}>
      <span className="pipeline__loader-label">Загрузка модели</span>
      <span className="pipeline__loader-track">
        <span
          className="pipeline__loader-bar"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </span>
    </div>
  );
}

export default function PipelineScene(props: ExperienceProps) {
  return (
    <>
      <Canvas
        className="pipeline__canvas"
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ antialias: true }}
        camera={{ position: DEFAULT_POSITION.toArray(), fov: 36, near: 0.1, far: 400 }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <Suspense fallback={null}>
          <Experience {...props} />
        </Suspense>
      </Canvas>

      <SceneLoader />
    </>
  );
}

useGLTF.preload(MODEL_URL);
