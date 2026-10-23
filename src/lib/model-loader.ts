import { Mesh, LineSegments, type Material, type Object3D, type Texture } from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/** Dispose abandoned/failed loads as well as successfully prepared scenes. */
export function disposeModel(root: Object3D) {
  const geometries = new Set<Mesh["geometry"]>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  root.traverse(object => {
    if (!(object instanceof Mesh || object instanceof LineSegments)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value && typeof value === "object" && "isTexture" in value && value.isTexture) textures.add(value as Texture);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => texture.dispose());
}

/**
 * Own a single attempt. Cancelling also prevents an in-flight decoder or loader
 * callback from restoring a viewer after its WebGL context has failed.
 */
export function loadModel(url: string, onLoad: (model: GLTF) => void, onError: () => void) {
  const controller = new AbortController();
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let active = true;
  const timeout = window.setTimeout(() => {
    if (!active) return;
    active = false;
    controller.abort();
    onError();
  }, 90_000);
  void (async () => {
    let model: GLTF | undefined;
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Model load failed (${response.status})`);
      const bytes = await response.arrayBuffer();
      if (!active) return;
      const absolute = new URL(url, window.location.href);
      model = await loader.parseAsync(bytes, new URL(".", absolute).href);
      if (!active) { disposeModel(model.scene); return; }
      onLoad(model);
    } catch {
      if (model) disposeModel(model.scene);
      if (active) onError();
    } finally {
      window.clearTimeout(timeout);
      active = false;
    }
  })();
  return () => {
    active = false;
    controller.abort();
    window.clearTimeout(timeout);
  };
}
