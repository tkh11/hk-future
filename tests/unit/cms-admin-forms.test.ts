// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { suggestSlug, updateContentAtPath } from '../../src/studio/form-utils';
import { solutionSchema } from '../../src/content/cms-schemas';
import * as copy from '../../src/content/solution-pages';
import { coolingProducts, fireProducts, fireStations } from '../../src/content/solutions';

describe('CMS editor URL suggestions', () => {
  it('transliterates Russian product names into a valid bounded URL', () => {
    expect(suggestSlug('Насос HEISSKRAFT HIP 40/125')).toBe('nasos-heisskraft-hip-40-125');
    expect(suggestSlug('  Ёлка — тест / № 2  ')).toBe('yolka-test-2');
    expect(suggestSlug('ClimatFaser')).toBe('climatfaser');
    expect(suggestSlug('a-'.repeat(200))).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(suggestSlug('a'.repeat(200))).toHaveLength(150);
    expect(suggestSlug('🚀')).toBe('');
  });
});

describe('Editing solution content without a storage migration', () => {
  const initial = () => structuredClone({ ...copy, coolingProducts, fireProducts, fireStations });
  it('changes one paragraph without dropping model IDs, array ordering or untouched fields', () => {
    const before = initial();
    const after = updateContentAtPath(before, ['fireProducts', 2, 'text'], 'Новое описание узла.');
    expect(before.fireProducts[2].text).not.toBe('Новое описание узла.');
    expect(after.fireProducts.map(item => item.id)).toEqual(before.fireProducts.map(item => item.id));
    expect(after.fireProducts[2]).toEqual({ ...before.fireProducts[2], text:'Новое описание узла.' });
    expect(after.coolingProducts).toEqual(before.coolingProducts);
    expect(solutionSchema.parse(JSON.parse(JSON.stringify(after)))).toEqual(after);
  });
  it('preserves tuple properties and permits clearing an optional image without storing a broken URL', () => {
    const before = initial();
    const changed = updateContentAtPath(before, ['dcProducts','pipeProperties',0,1], 'Новое значение');
    expect(changed.dcProducts.pipeProperties[0]).toEqual(['Армирование','Новое значение']);
    const withoutBadge = updateContentAtPath(changed, ['coolingProducts',0,'badge'], undefined);
    const serialized = JSON.parse(JSON.stringify(withoutBadge));
    expect(solutionSchema.safeParse(serialized).success).toBe(true);
    expect(serialized.coolingProducts[0]).not.toHaveProperty('badge');
    expect(before.coolingProducts[0].badge).toBeTruthy();
  });
  it('rejects unsafe update paths and refuses to silently initialize missing content', () => {
    expect(() => updateContentAtPath({}, ['__proto__','polluted'], true)).toThrow();
    expect(() => updateContentAtPath(undefined, ['dcHero','heading'], 'x')).toThrow();
  });
});
