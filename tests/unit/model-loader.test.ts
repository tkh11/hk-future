import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from "three";
import { waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { loadModel } from "@/lib/model-loader";

const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    setMeshoptDecoder() { return this; }
    parseAsync = parse;
  },
}));

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

function response(ok = true) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 404, arrayBuffer: async () => new ArrayBuffer(8) }));
}

it("reports failed HTTP and damaged models instead of completing the viewer", async () => {
  const ready = vi.fn(), error = vi.fn();
  response(false);
  loadModel("/missing.glb", ready, error);
  await waitFor(() => expect(error).toHaveBeenCalledOnce());
  expect(ready).not.toHaveBeenCalled();
  response(); parse.mockRejectedValueOnce(new Error("Malformed GLB"));
  loadModel("/corrupt.glb", ready, error);
  await waitFor(() => expect(error).toHaveBeenCalledTimes(2));
  expect(ready).not.toHaveBeenCalled();
});

it("cannot restore ready after a context failure cancels a pending decoder", async () => {
  response();
  const scene = new Group(), geometry = new BoxGeometry(), material = new MeshStandardMaterial();
  scene.add(new Mesh(geometry, material));
  const disposeGeometry = vi.spyOn(geometry, "dispose"), disposeMaterial = vi.spyOn(material, "dispose");
  let finish!: (model: { scene: Group }) => void;
  parse.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const ready = vi.fn(), error = vi.fn();
  const cancel = loadModel("/model.glb", ready, error);
  await waitFor(() => expect(parse).toHaveBeenCalledOnce());
  cancel(); finish({ scene });
  await waitFor(() => expect(disposeGeometry).toHaveBeenCalledOnce());
  expect(disposeMaterial).toHaveBeenCalledOnce();
  expect(ready).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});

it("shows an error for a stalled attempt and a later retry can succeed", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  })));
  const ready = vi.fn(), error = vi.fn();
  loadModel("/slow.glb", ready, error);
  await vi.advanceTimersByTimeAsync(90_000);
  expect(error).toHaveBeenCalledOnce();
  expect(ready).not.toHaveBeenCalled();
  response(); parse.mockResolvedValueOnce({ scene: new Group() });
  loadModel("/slow.glb", ready, error);
  await vi.advanceTimersByTimeAsync(1);
  expect(ready).toHaveBeenCalledOnce();
  expect(error).toHaveBeenCalledOnce();
});
