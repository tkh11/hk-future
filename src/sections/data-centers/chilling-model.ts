import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Selection = "pipes" | "pumps" | "valves" | null;
export type Part = "neutral" | "supply" | "return" | "pumps" | "valves";
// Names and materials from the supplied Chilling.glb, not proximity guesses.
export function identifyPart(name: string, material: string): Part {
  if (name.includes("valve_")) return "valves";
  if (/^(blue|red)(\.|$)/.test(material)) return material.startsWith("blue") ? "supply" : "return";
  if (name.startsWith("05_Pump_")) return "pumps";
  return "neutral";
}
export function prepareChillingModel(source: THREE.Group) {
  source.updateMatrixWorld(true);
  const buckets = new Map<string, { geometries: THREE.BufferGeometry[]; material: THREE.MeshStandardMaterial; part: Part }>();
  const originals = new Set<THREE.BufferGeometry>();
  const originalMaterials = new Set<THREE.Material>();
  const counts: Record<Part, number> = { neutral: 0, supply: 0, return: 0, pumps: 0, valves: 0 };
  source.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const original = object.material as THREE.MeshStandardMaterial;
    originals.add(object.geometry); originalMaterials.add(original);
    const part = identifyPart(object.name, original.name);
    counts[part]++;
    const key = `${part}:${original.name}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      const material = new THREE.MeshStandardMaterial({ roughness: .72, metalness: .08, side: original.side });
      const gray = part === "supply" || part === "return" ? .4 : Math.max(.09, original.color.r * .2126 + original.color.g * .7152 + original.color.b * .0722);
      material.color.setRGB(gray, gray, gray);
      bucket = { geometries: [], material, part }; buckets.set(key, bucket);
    }
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    for (const name of Object.keys(geometry.attributes)) if (name !== "position" && name !== "normal") geometry.deleteAttribute(name);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    bucket.geometries.push(geometry);
  });
  const group = new THREE.Group();
  const materials: { material: THREE.MeshStandardMaterial; base: THREE.Color; part: Part }[] = [];
  for (const { geometries, material, part } of buckets.values()) {
    const geometry = mergeGeometries(geometries);
    geometries.forEach(item => item.dispose());
    if (!geometry) { material.dispose(); throw new Error("Не удалось подготовить модель"); }
    const mesh = new THREE.Mesh(geometry, material); mesh.name = part; group.add(mesh);
    materials.push({ material, base: material.color.clone(), part });
  }
  originals.forEach(item => item.dispose()); originalMaterials.forEach(item => item.dispose());
  group.position.sub(new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3()));
  group.updateMatrixWorld(true);
  const supply = new THREE.Color("#1875db"), accent = new THREE.Color("#dc2634"), valve = new THREE.Color("#efbf00");
  function select(selection: Selection, pulse = 0) {
    for (const { material, base, part } of materials) {
      const active = selection === "pipes" ? part === "supply" || part === "return" : selection !== null && part === selection;
      material.color.copy(active ? part === "supply" ? supply : part === "valves" ? valve : accent : base);
      // Keep dark contours and motor ribs legible inside highlighted equipment.
      if (active && (part === "pumps" || part === "valves")) material.color.multiplyScalar(.35 + .65 * base.r);
      material.emissive.copy(active ? material.color : base).multiplyScalar(active ? 1 : 0);
      material.emissiveIntensity = active ? part === "pumps" ? .08 + pulse * .13 : .06 : 0;
    }
  }
  function dispose() { group.children.forEach(child => (child as THREE.Mesh).geometry.dispose()); materials.forEach(({ material }) => material.dispose()); }
  return { group, counts, select, dispose };
}
