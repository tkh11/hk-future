// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { solutionSchema } from '../../src/content/cms-schemas';
import { productAttributesSchema, draftProductAttributesSchema } from '../../src/cms/product-validation';
import * as copy from '../../src/content/solution-pages';
import { coolingProducts, fireProducts, fireStations } from '../../src/content/solutions';

const solution = () => structuredClone({ ...copy, coolingProducts, fireProducts, fireStations });

describe('solution content validation', () => {
  it('keeps original copy and allows reordering every fixed model element', () => {
    const original = solution();
    expect(solutionSchema.parse(original)).toEqual(original);
    original.coolingProducts.reverse();
    original.fireProducts.reverse();
    expect(solutionSchema.safeParse(original).success).toBe(true);
  });

  it('requires each stable model and station ID exactly once', () => {
    const removed = solution();
    removed.coolingProducts.pop();
    expect(solutionSchema.safeParse(removed).success).toBe(false);
    const duplicate = solution();
    duplicate.fireProducts[4] = duplicate.fireProducts[0];
    expect(solutionSchema.safeParse(duplicate).success).toBe(false);
    const stations = solution();
    stations.fireStations[1] = stations.fireStations[0];
    expect(solutionSchema.safeParse(stations).success).toBe(false);
    expect(solutionSchema.safeParse({ ...solution(), coolingProducts: [{ ...coolingProducts[0], id: 'executable' }, ...coolingProducts.slice(1)] }).success).toBe(false);
  });

  it('rejects markup and executable or ambiguous asset URLs while accepting engineering notation', () => {
    const content = solution();
    content.dcProducts.pipeDescription = 'Диаметр < 10 мм, давление ≤ 2,5 МПа, температура +70 °C';
    expect(solutionSchema.safeParse(content).success).toBe(true);
    content.dcHero.heading = '<img src=x onerror=alert(1)>';
    expect(solutionSchema.safeParse(content).success).toBe(false);
    for (const image of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//evil.example/a.png', '/\\evil.example/a.png', 'https://user:password@example.com/a.png']) {
      const unsafe = solution();
      unsafe.coolingProducts[0].image = image;
      expect(solutionSchema.safeParse(unsafe).success, image).toBe(false);
    }
  });
});

describe('typed product attributes', () => {
  it('accepts actual zero and false values and optional unit strings', () => {
    expect(productAttributesSchema.safeParse([
      { key: 'pressure', label: 'Давление', valueType: 'number', numberValue: 0, unit: 'МПа' },
      { key: 'inline', label: 'Ин-лайн', valueType: 'boolean', booleanValue: false },
      { key: 'material', label: 'Материал', valueType: 'text', textValue: 'PP-RCT' },
    ]).success).toBe(true);
  });

  it('rejects duplicate keys, absent selected values, wrong types, and unsafe or oversized units', () => {
    const base = { key: 'diameter', label: 'Диаметр', valueType: 'number', numberValue: 25, unit: 'мм' };
    expect(productAttributesSchema.safeParse([base, base]).success).toBe(false);
    for (const row of [
      { ...base, numberValue: null }, { ...base, numberValue: '25' }, { ...base, numberValue: Infinity },
      { ...base, valueType: 'boolean', booleanValue: 'false' }, { ...base, valueType: 'text', textValue: '' },
      { ...base, unit: 25 }, { ...base, unit: 'x'.repeat(33) }, { ...base, unit: '<script>alert(1)</script>' },
    ]) expect(productAttributesSchema.safeParse([row]).success).toBe(false);
  });

  it('permits incomplete autosaved rows but cannot publish them', () => {
    const incomplete = [{ key: 'pressure', label: '', valueType: 'number', numberValue: null }, {}];
    expect(draftProductAttributesSchema.safeParse(incomplete).success).toBe(true);
    expect(productAttributesSchema.safeParse(incomplete).success).toBe(false);
  });
});
