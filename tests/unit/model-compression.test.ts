// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compressModel, EXTENSION, readGlb, verifyModels, writeGlb } from "../../scripts/compress-models.mjs";

function fixture() {
  const positions = new Float32Array(900);
  for (let i = 0; i < positions.length; i++) positions[i] = (i % 9) / 3;
  const indices = new Uint16Array(300);
  for (let i = 0; i < indices.length; i++) indices[i] = i % 3;
  const binary = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(indices.buffer)]);
  return writeGlb({
    asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ name: "05_Pump_valve_631653", mesh: 0, translation: [3, 4, 5], extras: { firePart: "station", sourceMaterial: 10 } }],
    materials: [{ name: "blue.001", pbrMetallicRoughness: { baseColorFactor: [0, 0, 1, 1] } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
      { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 300, type: "VEC3", min: [0, 0, 0], max: [3, 3, 3] },
      { bufferView: 1, componentType: 5123, count: 300, type: "SCALAR" },
    ],
    extras: { source: "original-CAD.gltf" },
  }, binary);
}

describe("lossless GLB compression", () => {
  it("preserves decoded bytes, names, transforms, materials and selection metadata", async () => {
    const source = fixture();
    const { output, report } = await compressModel(source);
    expect(output.length).toBeLessThan(source.length);
    expect(report.verifiedViews).toBe(2);
    await expect(verifyModels(source, output)).resolves.toMatchObject({ verifiedViews: 2 });
    const { json } = readGlb(output);
    expect(json.extensionsRequired).toContain(EXTENSION);
    expect(json.buffers[1]).toMatchObject({ extensions: { [EXTENSION]: { fallback: true } } });
    expect(json.buffers[1].uri).toBeUndefined();
    expect(json.bufferViews[1].extensions[EXTENSION].mode).toBe("INDICES");
    expect(json.bufferViews[1].byteStride).toBeUndefined();
  });

  it("rejects semantic changes even when geometry still decodes", async () => {
    const source = fixture(), { output } = await compressModel(source);
    const { json, binary } = readGlb(output);
    json.nodes[0].extras.firePart = "pipework";
    await expect(verifyModels(source, writeGlb(json, binary))).rejects.toThrow("Model semantics changed");
  });

  it("rejects a short fallback or corrupt binary stream", async () => {
    const source = fixture(), { output } = await compressModel(source);
    const { json, binary } = readGlb(output);
    json.buffers[1].byteLength = 1;
    await expect(verifyModels(source, writeGlb(json, binary))).rejects.toThrow("Fallback buffer is too short");
    const original = readGlb(output);
    const corrupt = Buffer.from(original.binary);
    corrupt[0] = 0;
    await expect(verifyModels(source, writeGlb(original.json, corrupt))).rejects.toThrow();
  });

  it("fails closed for already compressed or truncated input", async () => {
    const source = fixture(), { output } = await compressModel(source);
    await expect(compressModel(output)).rejects.toThrow("Already compressed");
    expect(() => readGlb(source.subarray(0, 30))).toThrow("GLB length mismatch");
  });
});
