"""Label the supplied, joined FireOff GLB for interactive selection without changing its surfaces.

Usage: python3 scripts/prepare-fireoff-model.py /path/to/fireoff.glb public/models/fireoff.glb
The export has five primitives: pipework + saddles, tees, and three sprinkler details.
The mapping was checked with a coloured close-up render of the source assembly.
"""
import collections
import copy
import hashlib
import json
import pathlib
import struct
import sys

source = pathlib.Path(sys.argv[1]).read_bytes()
json_length = struct.unpack_from('<I', source, 12)[0]
original = json.loads(source[20:20 + json_length])
binary = source[28 + json_length:]
primitives = original['meshes'][0]['primitives']
assert len(original['nodes']) == 1 and len(primitives) == 5, 'Unexpected source layout'

def read_accessor(index):
    accessor = original['accessors'][index]
    view = original['bufferViews'][accessor['bufferView']]
    offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    fmt = {5126: 'f', 5125: 'I', 5123: 'H'}[accessor['componentType']]
    size = {'VEC3': 3, 'VEC2': 2, 'SCALAR': 1}[accessor['type']]
    stride = view.get('byteStride', struct.calcsize(fmt) * size)
    return [struct.unpack_from('<' + fmt * size, binary, offset + i * stride) for i in range(accessor['count'])]

positions = read_accessor(primitives[0]['attributes']['POSITION'])
indices = [row[0] for row in read_accessor(primitives[0]['indices'])]
parent = list(range(len(positions)))

def root(index):
    while parent[index] != index:
        parent[index] = parent[parent[index]]
        index = parent[index]
    return index

def merge(a, b):
    parent[root(a)] = root(b)

seen = {}
for index, position in enumerate(positions):
    key = tuple(round(value, 5) for value in position)
    if key in seen:
        merge(index, seen[key])
    else:
        seen[key] = index
for a, b, c in zip(indices[::3], indices[1::3], indices[2::3]):
    merge(a, b)
    merge(b, c)

components = collections.defaultdict(list)
for index in range(len(positions)):
    components[root(index)].append(index)
categories = {}
counts = collections.Counter()
for key, vertices in components.items():
    size = [max(positions[v][axis] for v in vertices) - min(positions[v][axis] for v in vertices) for axis in range(3)]
    category = 'main' if size[1] > 49 else 'saddle' if max(size) < .1 and len(vertices) > 1000 else 'neutral'
    categories[key] = category
    counts[category] += 1
assert counts['main'] == 1 and counts['saddle'] == 5, 'Source component mapping changed'

output = {'asset': {'version': '2.0', 'generator': 'HEISSKRAFT FireOff part labelling'},
          'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [], 'meshes': [],
          'materials': copy.deepcopy(original['materials']), 'accessors': [], 'bufferViews': [],
          'extras': {'sourceSHA256': hashlib.sha256(source).hexdigest(), 'sourceTriangles': sum(original['accessors'][p['indices']]['count'] // 3 for p in primitives)}}
output['extensionsUsed'] = original.get('extensionsUsed', [])
packed = bytearray()

def write_accessor(values, kind, fmt, target):
    while len(packed) % 4:
        packed.append(0)
    offset = len(packed)
    flat = [value for row in values for value in row]
    packed.extend(struct.pack('<' + fmt * len(flat), *flat))
    view = len(output['bufferViews'])
    output['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(packed) - offset, 'target': target})
    accessor = {'bufferView': view, 'componentType': 5126 if fmt == 'f' else 5125, 'count': len(values), 'type': kind}
    if kind == 'VEC3':
        accessor['min'] = [min(row[i] for row in values) for i in range(3)]
        accessor['max'] = [max(row[i] for row in values) for i in range(3)]
    output['accessors'].append(accessor)
    return len(output['accessors']) - 1

def add_mesh(primitive, selected_indices, category):
    used = sorted(set(selected_indices))
    remap = {vertex: index for index, vertex in enumerate(used)}
    attributes = {}
    for name in ['POSITION', 'NORMAL']:
        values = read_accessor(primitive['attributes'][name])
        attributes[name] = write_accessor([values[index] for index in used], 'VEC3', 'f', 34962)
    index = write_accessor([(remap[value],) for value in selected_indices], 'SCALAR', 'I', 34963)
    output['meshes'].append({'name': category, 'primitives': [{'attributes': attributes, 'indices': index, 'material': primitive['material']}]})

groups = collections.defaultdict(list)
for i in range(0, len(indices), 3):
    groups[categories[root(indices[i])]].extend(indices[i:i + 3])
for category, selected_indices in groups.items():
    add_mesh(primitives[0], selected_indices, category)
for index, primitive in enumerate(primitives[1:], 1):
    add_mesh(primitive, [row[0] for row in read_accessor(primitive['indices'])], 'tee' if index == 1 else 'neutral')

node = copy.deepcopy(original['nodes'][0])
node.pop('mesh')
node['name'] = 'FireOff'
node['children'] = list(range(1, len(output['meshes']) + 1))
output['nodes'] = [node] + [{'name': mesh['name'], 'mesh': index} for index, mesh in enumerate(output['meshes'])]
output['buffers'] = [{'byteLength': len(packed)}]
encoded = json.dumps(output, ensure_ascii=False).encode()
encoded += b' ' * (-len(encoded) % 4)
packed += b'\0' * (-len(packed) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(packed))
glb += struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
glb += struct.pack('<II', len(packed), 0x004E4942) + packed
destination = pathlib.Path(sys.argv[2])
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_bytes(glb)
assert sum(output['accessors'][p['indices']]['count'] // 3 for mesh in output['meshes'] for p in mesh['primitives']) == output['extras']['sourceTriangles']
print(f'{destination}: {len(glb):,} bytes; all {output["extras"]["sourceTriangles"]:,} triangles preserved; {dict(counts)}')
