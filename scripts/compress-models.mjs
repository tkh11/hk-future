/**
 * Byte-exact bufferView compression. No quantization, topology changes, node
 * merging, material deduplication or transform baking is performed.
 *
 * node scripts/compress-models.mjs source.glb destination.glb
 * node scripts/compress-models.mjs --verify source.glb destination.glb
 * node scripts/compress-models.mjs --write [model.glb ...]
 * node scripts/compress-models.mjs --report original-directory [report.json]
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { MeshoptEncoder } from "meshoptimizer/encoder";
import { MeshoptDecoder } from "meshoptimizer/decoder";

export const EXTENSION = "EXT_meshopt_compression";
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const align4 = value => (value + 3) & ~3;

export function readGlb(input) {
  const bytes = Buffer.from(input);
  assert(bytes.length >= 28, "GLB is truncated");
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, "Expected GLB magic");
  assert.equal(bytes.readUInt32LE(4), 2, "Only glTF 2 is supported");
  assert.equal(bytes.readUInt32LE(8), bytes.length, "GLB length mismatch");
  let json, binary;
  for (let offset = 12; offset < bytes.length;) {
    assert(offset + 8 <= bytes.length, "Truncated GLB chunk header");
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    assert.equal(length % 4, 0, "GLB chunks must be four-byte aligned");
    assert(offset + 8 + length <= bytes.length, "Truncated GLB chunk");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === JSON_CHUNK) { assert(!json, "Duplicate JSON chunk"); json = JSON.parse(data.toString()); }
    else if (type === BIN_CHUNK) { assert(!binary, "Duplicate binary chunk"); binary = data; }
    else throw new Error("Unknown GLB chunk; refusing to discard it");
    offset += 8 + length;
  }
  assert(json && binary, "GLB needs JSON and binary chunks");
  return { json, binary };
}

export function writeGlb(json, binary) {
  const text = Buffer.from(JSON.stringify(json));
  const output = Buffer.alloc(28 + align4(text.length) + align4(binary.length));
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(align4(text.length), 12); output.writeUInt32LE(JSON_CHUNK, 16);
  output.fill(0x20, 20, 20 + align4(text.length)); text.copy(output, 20);
  const binOffset = 20 + align4(text.length);
  output.writeUInt32LE(align4(binary.length), binOffset); output.writeUInt32LE(BIN_CHUNK, binOffset + 4);
  Buffer.from(binary).copy(output, binOffset + 8);
  return output;
}

function bufferRange(binary, definition) {
  assert.equal(definition.buffer, 0, "Only embedded binary data is supported");
  const offset = definition.byteOffset ?? 0;
  assert(Number.isInteger(offset) && offset >= 0 && Number.isInteger(definition.byteLength) && definition.byteLength > 0, "Invalid buffer range");
  assert(offset + definition.byteLength <= binary.length, "Buffer view is out of bounds");
  return binary.subarray(offset, offset + definition.byteLength);
}

function encodingFor(json, view, index) {
  const accessors = (json.accessors ?? []).filter(accessor => accessor.bufferView === index);
  const sizes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
  if (view.target === 34963) {
    const stride = sizes[accessors[0]?.componentType];
    if (![2, 4].includes(stride) || accessors.some(accessor => sizes[accessor.componentType] !== stride)) return null;
    return view.byteLength % stride ? null : { mode: "INDICES", stride };
  }
  // Image data and other opaque streams remain byte-for-byte uncompressed.
  if (!accessors.length) return null;
  let stride = view.byteStride ?? sizes[accessors[0].componentType] * widths[accessors[0].type];
  if (!view.byteStride && (stride % 4 || view.byteLength % stride)) stride = 4;
  if (!stride || stride % 4 || stride > 256 || view.byteLength % stride) return null;
  return { mode: "ATTRIBUTES", stride };
}

async function decodedViews({ json, binary }) {
  await MeshoptDecoder.ready;
  return (json.bufferViews ?? []).map(view => {
    const extension = view.extensions?.[EXTENSION];
    if (!extension) return bufferRange(binary, view);
    assert(json.extensionsRequired?.includes(EXTENSION), "Missing required decoder declaration");
    const fallback = json.buffers[view.buffer];
    assert(view.buffer > 0 && !fallback.uri && fallback.extensions?.[EXTENSION]?.fallback, "Invalid fallback buffer");
    assert((view.byteOffset ?? 0) + view.byteLength <= fallback.byteLength, "Fallback buffer is too short");
    assert.equal(extension.byteStride * extension.count, view.byteLength, "Decoded view length mismatch");
    if (view.byteStride) assert.equal(view.byteStride, extension.byteStride, "Vertex stride mismatch");
    assert(["ATTRIBUTES", "INDICES"].includes(extension.mode) && !extension.filter, "Only exact compression is accepted");
    const decoded = new Uint8Array(view.byteLength);
    MeshoptDecoder.decodeGltfBuffer(decoded, extension.count, extension.byteStride, bufferRange(binary, extension), extension.mode);
    return Buffer.from(decoded);
  });
}

function semanticDocument(json) {
  const result = structuredClone(json);
  delete result.buffers;
  for (const key of ["extensionsUsed", "extensionsRequired"]) {
    if (result[key]) result[key] = result[key].filter(value => value !== EXTENSION);
    if (!result[key]?.length) delete result[key];
  }
  result.bufferViews = (result.bufferViews ?? []).map(view => {
    delete view.buffer; delete view.byteOffset;
    if (view.extensions) {
      delete view.extensions[EXTENSION];
      if (!Object.keys(view.extensions).length) delete view.extensions;
    }
    return view;
  });
  return result;
}

export async function verifyModels(originalBytes, compressedBytes) {
  const original = readGlb(originalBytes), compressed = readGlb(compressedBytes);
  assert.deepEqual(semanticDocument(compressed.json), semanticDocument(original.json), "Model semantics changed");
  const [before, after] = await Promise.all([decodedViews(original), decodedViews(compressed)]);
  assert.equal(before.length, after.length, "Buffer view count changed");
  before.forEach((view, index) => assert(view.equals(after[index]), `Buffer view ${index} changed bytes`));
  return { verifiedViews: before.length, sourceSHA256: createHash("sha256").update(originalBytes).digest("hex") };
}

export async function compressModel(input) {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  const { json: source, binary } = readGlb(input);
  assert(!source.extensionsUsed?.includes(EXTENSION), "Already compressed: keep the existing verified asset");
  assert(source.buffers?.length === 1 && !source.buffers[0].uri, "Expected one embedded GLB buffer");
  const json = structuredClone(source), parts = [];
  let packedLength = 0, fallbackLength = 0, compressedViews = 0;
  function append(bytes) {
    const offset = packedLength;
    parts.push(Buffer.from(bytes), Buffer.alloc(align4(bytes.length) - bytes.length));
    packedLength += align4(bytes.length);
    return offset;
  }
  json.bufferViews = source.bufferViews.map((view, index) => {
    const bytes = bufferRange(binary, view), encoding = encodingFor(source, view, index);
    const result = structuredClone(view);
    if (encoding) {
      const { mode, stride } = encoding;
      // encodeGltfBuffer v0 is compatible with EXT (the lower-level encoder now defaults to v1).
      const packed = MeshoptEncoder.encodeGltfBuffer(bytes, bytes.length / stride, stride, mode, 0);
      if (packed.length < bytes.length) {
        result.buffer = 1; result.byteOffset = fallbackLength;
        fallbackLength += align4(bytes.length);
        result.extensions = { ...result.extensions, [EXTENSION]: {
          buffer: 0, byteOffset: append(packed), byteLength: packed.length,
          byteStride: stride, count: bytes.length / stride, mode,
        } };
        compressedViews++;
        return result;
      }
    }
    result.buffer = 0; result.byteOffset = append(bytes);
    return result;
  });
  assert(compressedViews > 0, "No buffer views benefited from compression");
  json.buffers = [
    { byteLength: packedLength },
    // Required placeholder: it has no URI/BIN data, but must fit every decoded view.
    { byteLength: fallbackLength, extensions: { [EXTENSION]: { fallback: true } } },
  ];
  json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), EXTENSION])];
  json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), EXTENSION])];
  const output = writeGlb(json, Buffer.concat(parts));
  const verification = await verifyModels(input, output);
  assert(output.length < input.length, "Compression would make the complete GLB larger");
  return { output, report: {
    ...verification, compressedViews, originalBytes: input.length, compressedBytes: output.length,
    reductionPercent: Number(((1 - output.length / input.length) * 100).toFixed(2)),
  } };
}

async function main(args) {
  if (args[0] === "--report" && args[1]) {
    const models = [];
    for (const name of ["chilling", "parking-sprinkler", "facade", "communications"]) {
      const file = `public/models/${name}.glb`;
      const before = await readFile(resolve(args[1], `${name}.glb`)), after = await readFile(file);
      const verification = await verifyModels(before, after);
      models.push({ file, ...verification, compressedSHA256: createHash("sha256").update(after).digest("hex"),
        transformation: readGlb(after).json.extensionsUsed?.includes(EXTENSION) ? "lossless meshopt" : "unchanged original",
        originalBytes: before.length, compressedBytes: after.length,
        compressedViews: readGlb(after).json.bufferViews.filter(view => view.extensions?.[EXTENSION]).length,
        reductionPercent: Number(((1 - after.length / before.length) * 100).toFixed(2)),
      });
    }
    const output = resolve(args[2] ?? ".ecc/benchmarks/model-assets.json");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify({
      verification: "Every bufferView decoded byte-for-byte; semantic glTF JSON (names, transforms, materials, extras, accessors, scenes) unchanged. No quantization, reordering or topology changes.",
      models,
    }, null, 2));
    console.log(output);
    return;
  }
  if (args[0] === "--verify" && args.length === 3) {
    console.log(JSON.stringify(await verifyModels(await readFile(args[1]), await readFile(args[2])), null, 2));
    return;
  }
  if (args[0] === "--write") {
    // Only measured wins are defaults. The two designers assets became larger
    // over HTTP gzip after lossless meshopt and are intentionally kept original.
    const files = args.length > 1 ? args.slice(1) : ["chilling", "parking-sprinkler"].map(name => `public/models/${name}.glb`);
    for (const file of files) {
      const input = await readFile(file);
      if (readGlb(input).json.extensionsUsed?.includes(EXTENSION)) {
        await decodedViews(readGlb(input));
        console.log(JSON.stringify({ file, status: "already compressed; decoder check passed" }));
        continue;
      }
      const { output, report } = await compressModel(input);
      await writeFile(file, output);
      console.log(JSON.stringify({ file, ...report }));
    }
    return;
  }
  assert(args.length === 2, "Usage: compress-models.mjs source.glb output.glb | --verify source.glb output.glb | --write [files]");
  const { output, report } = await compressModel(await readFile(args[0]));
  await writeFile(args[1], output);
  console.log(JSON.stringify({ file: args[1], ...report }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main(process.argv.slice(2));
}
