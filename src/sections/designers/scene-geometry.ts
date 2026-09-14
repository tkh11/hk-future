import { Box3, Mesh, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Bakes a mesh into world space so unrelated instances can be merged into one
 * draw call. Both exports contain mirrored instances (89 of them in
 * facade.glb); the renderer normally flips their winding at draw time from the
 * matrix determinant, which baking would lose, so triangles are reversed here.
 * The texture coordinates go too — nothing in the scene is textured.
 */
export function bakeGeometry(mesh: Mesh): BufferGeometry {
  const geometry = mesh.geometry.clone();

  geometry.deleteAttribute("uv");
  geometry.applyMatrix4(mesh.matrixWorld);

  if (mesh.matrixWorld.determinant() < 0) {
    reverseWinding(geometry);
  }

  return geometry;
}

function reverseWinding(geometry: BufferGeometry) {
  if (!geometry.getIndex()) {
    const { count } = geometry.getAttribute("position");

    geometry.setIndex(Array.from({ length: count }, (_, vertex) => vertex));
  }

  const index = geometry.getIndex()!;

  for (let triangle = 0; triangle < index.count; triangle += 3) {
    const first = index.getX(triangle);

    index.setX(triangle, index.getX(triangle + 2));
    index.setX(triangle + 2, first);
  }

  index.needsUpdate = true;
}

/** Merges baked geometry, returning null for an empty group. */
export function mergeBaked(geometries: BufferGeometry[]) {
  if (geometries.length === 0) {
    return null;
  }

  const merged = mergeGeometries(geometries);

  merged.computeBoundingBox();
  merged.computeBoundingSphere();

  return merged;
}

export function boundsOf(geometries: BufferGeometry[]) {
  const bounds = new Box3();

  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox!);
  }

  return bounds;
}
