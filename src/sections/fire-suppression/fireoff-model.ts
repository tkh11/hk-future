import * as THREE from "three";

export type FireSelection = "main" | "saddle" | "tee" | null;

// Semantic groups are prepared from the supplied, single-object GLB by
// scripts/prepare-fireoff-model.py, without changing its geometry.
export function prepareFireOffModel(source: THREE.Group) {
  source.updateMatrixWorld(true);
  const root = source.getObjectByName("FireOff");
  if (!root) throw new Error("FireOff model root is missing");
  // A fixed close-up makes the fittings legible within the 50 m source system.
  const focus = new THREE.Vector3(-.128, 28.817, -.515).applyMatrix4(root.matrixWorld);
  const group = new THREE.Group();
  const materials: { material: THREE.MeshStandardMaterial; base: THREE.Color; part: FireSelection }[] = [];
  const originals = new Set<THREE.BufferGeometry>();
  const originalMaterials = new Set<THREE.Material>();
  source.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    originals.add(object.geometry);
    const originalsForMesh = Array.isArray(object.material) ? object.material : [object.material];
    originalsForMesh.forEach(material => originalMaterials.add(material));
    const part: FireSelection = object.name === "main" || object.name === "saddle" || object.name === "tee" ? object.name : null;
    const material = new THREE.MeshStandardMaterial({ color: part ? "#9c9ca2" : "#b4b4ba", roughness: .63, metalness: .14 });
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld); geometry.translate(-focus.x, -focus.y, -focus.z);
    const mesh = new THREE.Mesh(geometry, material); mesh.name = part ?? "neutral"; group.add(mesh);
    materials.push({ material, base: material.color.clone(), part });
  });
  originals.forEach(item => item.dispose()); originalMaterials.forEach(item => item.dispose());
  group.updateMatrixWorld(true);
  const accent = new THREE.Color("#d8222b");
  return {
    group,
    viewDirection: new THREE.Vector3(3, -4, -4).transformDirection(root.matrixWorld),
    up: new THREE.Vector3(0, 0, 1).transformDirection(root.matrixWorld),
    select(selection: FireSelection) {
      for (const { material, base, part } of materials) material.color.copy(selection && part === selection ? accent : base);
    },
    dispose() {
      group.children.forEach(child => (child as THREE.Mesh).geometry.dispose());
      materials.forEach(({ material }) => material.dispose());
    },
  };
}
