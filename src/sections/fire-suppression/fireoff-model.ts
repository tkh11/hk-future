import * as THREE from "three";

export type FirePart = "station" | "pipework" | "sprinkler" | "hydrants" | "flange";
export type FireSelection = FirePart | null;
export type FireView = FirePart | "overview";

type CameraView = {
  target: [number, number, number];
  direction: [number, number, number];
  up?: [number, number, number];
  width: number;
  height: number;
  fov: number;
};

// Source coordinates in metres, Y up. The overview and plan use a narrow
// field of view; close-ups retain perspective and the surrounding installation.
export const FIRE_VIEWS: Record<FireView, CameraView> = {
  overview: { target: [1, -2.3, -8.5], direction: [-.48, .52, 1], width: 40, height: 21, fov: 10 },
  station: { target: [-4.25, -3, -3.2], direction: [-.55, .36, 1], width: 6.7, height: 3.8, fov: 12 },
  pipework: { target: [1, -2.2, -8.5], direction: [0, 1, 0], up: [0, 0, -1], width: 37.5, height: 21, fov: 8 },
  sprinkler: { target: [7.5, -.64, -4.5], direction: [-1, .4, .55], width: .42, height: .24, fov: 38 },
  hydrants: { target: [17.79, -3.28, -6.5], direction: [-1, .05, .08], width: 1.2, height: .78, fov: 32 },
  flange: { target: [-2.99, -3.85, -4.1], direction: [.12, .08, -1], width: 1.55, height: .82, fov: 34 },
};

export function isFirePart(value: unknown): value is FirePart {
  return typeof value === "string" && value !== "overview" && Object.hasOwn(FIRE_VIEWS, value);
}

export function prepareFireOffModel(source: THREE.Group) {
  const materials: { material: THREE.MeshStandardMaterial | THREE.LineBasicMaterial; base: THREE.Color; part: FireSelection; baseOpacity: number; fade: number; from: number; to: number }[] = [];
  const originals = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const ownedMaterials = new Set<THREE.Material>();
  const pickable: THREE.Mesh[] = [];
  source.traverse(object => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
    geometries.add(object.geometry);
    const previous = Array.isArray(object.material) ? object.material[0] : object.material;
    const part = isFirePart(object.userData.firePart) ? object.userData.firePart : null;
    (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => originals.add(material));
    if (object instanceof THREE.LineSegments) {
      const material = new THREE.LineBasicMaterial({ color: "#737373", transparent: true, opacity: .5, depthWrite: false });
      object.material = material;
      ownedMaterials.add(material);
      materials.push({ material, base: material.color.clone(), part, baseOpacity: .5, fade: 0, from: 0, to: 0 });
      return;
    }
    // CAD baseColor values in this export are sRGB, rather than linear glTF colors.
    const base = (previous as THREE.MeshStandardMaterial).color.clone().convertSRGBToLinear();
    if (object.userData.sourceMaterial === 10) base.set("#343434");
    if ([0, 1, 9].includes(object.userData.sourceMaterial)) {
      const gray = (base.r + base.g + base.b) / 3;
      base.setRGB(gray, gray, gray);
    }
    const material = new THREE.MeshStandardMaterial({ color: base, roughness: .68, metalness: .06, side: THREE.DoubleSide });
    object.material = material;
    ownedMaterials.add(material);
    materials.push({ material, base, part, baseOpacity: 1, fade: 0, from: 0, to: 0 });
    pickable.push(object);
  });
  originals.forEach(material => material.dispose());
  source.updateMatrixWorld(true);
  const accent = new THREE.Color("#d8222b");
  const muted = new THREE.Color("#d9d9d9");
  let selection: FireSelection = null;
  return {
    group: source,
    pickable,
    select(next: FireSelection) {
      selection = next;
      for (const entry of materials) {
        entry.from = entry.fade;
        entry.to = next && entry.part !== next ? 1 : 0;
      }
    },
    updateAppearance(hovered: FireSelection, progress: number) {
      for (const entry of materials) {
        const { material, base, part, baseOpacity } = entry;
        entry.fade = THREE.MathUtils.lerp(entry.from, entry.to, progress);
        material.color.copy(base);
        material.color.lerp(muted, entry.fade * .62);
        material.opacity = baseOpacity * (1 - entry.fade * .5);
        // Opaque selected geometry writes depth; faded surroundings cannot mask it.
        material.transparent = baseOpacity < 1 || entry.fade > .001;
        material.depthWrite = !material.transparent;
        if (hovered && part === hovered && (!selection || part === selection)) material.color.lerp(accent, .34);
      }
    },
    dispose() {
      geometries.forEach(geometry => geometry.dispose());
      ownedMaterials.forEach(material => material.dispose());
    },
  };
}
