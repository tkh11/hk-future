"""Batch Parking_Sprinkler_P04.gltf into a self-contained GLB for the FireOff explorer.

Usage: python3 scripts/prepare-parking-model.py source.gltf public/models/parking-sprinkler.glb
Preserves all triangles and CAD linework; labels assemblies before batching by material.
Coordinates are the source's Y-up coordinates converted from millimetres to metres.
"""
import collections
import copy
import hashlib
import json
import pathlib
import struct
import sys

source = pathlib.Path(sys.argv[1])
document = json.loads(source.read_text())
binary = (source.parent / document['buffers'][0]['uri']).read_bytes()
assert document['nodes'][-1]['scale'] == [0.001, 0.001, 0.001]
assert all(not any(k in n for k in ('matrix', 'translation', 'rotation', 'scale'))
           for n in document['nodes'] if 'mesh' in n), 'Unexpected geometry transforms'


def read_accessor(index):
    accessor = document['accessors'][index]
    view = document['bufferViews'][accessor['bufferView']]
    offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    fmt = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[accessor['componentType']]
    size = {'VEC3': 3, 'SCALAR': 1}[accessor['type']]
    stride = view.get('byteStride', struct.calcsize(fmt) * size)
    return [struct.unpack_from('<' + fmt * size, binary, offset + i * stride)
            for i in range(accessor['count'])]


def category(primitive):
    bounds = document['accessors'][primitive['attributes']['POSITION']]
    lo, hi = ([v * .001 for v in bounds[k]] for k in ('min', 'max'))
    x, y, z = [(a + b) / 2 for a, b in zip(lo, hi)]
    material = primitive.get('material', 0)
    if primitive.get('mode', 4) != 4:
        return 'context'
    # Outlet flange at the rear manifold: flange pair, gasket, collar and bolts.
    if -3.04 < x < -2.87 and -4.01 < y < -3.69 and -4.25 < z < -3.95:
        return 'flange'
    if x > 0 and -.73 < y < -.54 and material in (2, 3, 5) and max(b - a for a, b in zip(lo, hi)) < .12:
        return 'sprinkler'
    # All three fire cabinets, their fittings, hoses and vertical connections.
    if ((0 <= x < .31 and abs(z + 9) < .39) or
        (17.65 < x < 18.1 and min(abs(z + 6.5), abs(z + 11.5)) < .39)) and y > -3.7:
        return 'hydrants'
    if -6.8 < x < -1.4 and -4.6 < y < -1.5 and -4.3 < z < -2.1:
        return 'station'
    if material == 5:
        return 'pipework'
    return 'context'


batches = collections.defaultdict(lambda: {'positions': [], 'normals': [], 'indices': [], 'sources': 0})
source_triangles = 0
source_segments = 0
for mesh in document['meshes']:
    for primitive in mesh['primitives']:
        mode = primitive.get('mode', 4)
        assert mode in (3, 4)
        part = category(primitive)
        batch = batches[(part, primitive.get('material', 0), 4 if mode == 4 else 1)]
        positions = read_accessor(primitive['attributes']['POSITION'])
        offset = len(batch['positions'])
        batch['positions'].extend(tuple(v * .001 for v in row) for row in positions)
        indices = [row[0] for row in read_accessor(primitive['indices'])] if 'indices' in primitive else list(range(len(positions)))
        if mode == 3:
            source_segments += len(indices) - 1
            indices = [v for pair in zip(indices[:-1], indices[1:]) for v in pair]
        else:
            source_triangles += len(indices) // 3
            batch['normals'].extend(read_accessor(primitive['attributes']['NORMAL']))
        batch['indices'].extend((index + offset,) for index in indices)
        batch['sources'] += 1

output = {'asset': {'version': '2.0', 'generator': 'HEISSKRAFT parking scene batching'},
          'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [],
          'materials': copy.deepcopy(document['materials']), 'accessors': [], 'bufferViews': [],
          'extras': {'source': source.name, 'sourceSHA256': hashlib.sha256(source.read_bytes() + binary).hexdigest(),
                     'sourceTriangles': source_triangles, 'sourceLineSegments': source_segments}}
packed = bytearray()


def write_accessor(values, kind, fmt, target):
    packed.extend(b'\0' * (-len(packed) % 4))
    offset = len(packed)
    packed.extend(struct.pack('<' + fmt * sum(len(row) for row in values), *(v for row in values for v in row)))
    view = len(output['bufferViews'])
    output['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(packed) - offset, 'target': target})
    accessor = {'bufferView': view, 'componentType': 5126 if fmt == 'f' else 5125, 'count': len(values), 'type': kind}
    if kind == 'VEC3':
        accessor['min'] = [min(row[i] for row in values) for i in range(3)]
        accessor['max'] = [max(row[i] for row in values) for i in range(3)]
    output['accessors'].append(accessor)
    return len(output['accessors']) - 1


for (part, material, mode), batch in batches.items():
    attributes = {'POSITION': write_accessor(batch['positions'], 'VEC3', 'f', 34962)}
    if batch['normals']:
        attributes['NORMAL'] = write_accessor(batch['normals'], 'VEC3', 'f', 34962)
    primitive = {'attributes': attributes, 'indices': write_accessor(batch['indices'], 'SCALAR', 'I', 34963),
                 'mode': mode, 'material': material}
    index = len(output['nodes'])
    output['meshes'].append({'primitives': [primitive]})
    output['nodes'].append({'name': f'{part}-{material}-{mode}', 'mesh': index,
                            'extras': {'firePart': part, 'sourceMaterial': material, 'sourcePrimitives': batch['sources']}})
    output['scenes'][0]['nodes'].append(index)

assert source_triangles == sum(len(b['indices']) // 3 for (_, _, mode), b in batches.items() if mode == 4)
assert source_segments == sum(len(b['indices']) // 2 for (_, _, mode), b in batches.items() if mode == 1)
assert {'station', 'pipework', 'sprinkler', 'hydrants', 'flange'} <= {key[0] for key in batches}
output['buffers'] = [{'byteLength': len(packed)}]
encoded = json.dumps(output, separators=(',', ':')).encode()
encoded += b' ' * (-len(encoded) % 4)
packed += b'\0' * (-len(packed) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(packed))
glb += struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
glb += struct.pack('<II', len(packed), 0x004E4942) + packed
destination = pathlib.Path(sys.argv[2])
destination.write_bytes(glb)
print(f'{destination}: {len(glb):,} bytes, {source_triangles:,} triangles, {source_segments:,} line segments, {len(batches)} render batches')
