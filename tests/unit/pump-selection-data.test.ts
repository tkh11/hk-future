// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fromPumpSelection, pumpSelectionSchema } from '../../src/cms/pump-selection-data';
import { fromVariant, toVariantData, variantDraftPatch, variantPatchSchema } from '../../src/studio/variant-form';

describe('pump report data', () => {
  it('normalises old records without inventing performance values', () => {
    expect(fromPumpSelection(null)).toMatchObject({ modelName: '', motorCode: '', volumeM3: null, performancePoints: [], sourcePdf: null,
      fluidLimits: [] });
    const data = fromPumpSelection({ motorCode: '000000028', sourcePdf: { id: 7 }, performancePoints: [{ flow: 0, powerP2: 0 }] });
    expect(data.motorCode).toBe('000000028');
    expect(data.sourcePdf).toBe(7);
    expect(data.performancePoints).toEqual([{ flow: 0, powerP2: 0, efficiency: null, npsh: null }]);
  });
  it('validates ranges and whole-number construction values', () => {
    expect(pumpSelectionSchema.safeParse({ temperatureMinC: 110, temperatureMaxC: 0 }).success).toBe(false);
    expect(pumpSelectionSchema.safeParse({ flowMinM3h: 9, flowMaxM3h: 2 }).success).toBe(false);
    expect(pumpSelectionSchema.safeParse({ impellerCount: 1.5 }).success).toBe(false);
    expect(pumpSelectionSchema.safeParse({ headAtMinFlowM: 7.1, headAtMaxFlowM: 3.4 }).success).toBe(true);
  });
  it('rejects invalid efficiency, negative values and repeated flow points', () => {
    const point = { flow: 2, efficiency: null, powerP2: null, npsh: null };
    for (const rows of [[{ ...point, efficiency: 101 }], [{ ...point, powerP2: -1 }], [point, point]]) {
      expect(pumpSelectionSchema.safeParse({ performancePoints: rows }).success).toBe(false);
    }
  });
  it('accepts the full concentration range and stores approvals only for glycols', () => {
    const glycol = { kind: 'propyleneGlycol', temperatureMinC: -10, temperatureMaxC: 80,
      concentrationMinPct: 0, concentrationMaxPct: 60 };
    expect(fromPumpSelection({ fluidLimits: [glycol] }).fluidLimits).toEqual([glycol]);
    for (const fluidLimits of [
      [glycol, glycol], [{ ...glycol, kind: 'water' }], [{ ...glycol, temperatureMaxC: -20 }],
      [{ ...glycol, concentrationMinPct: null }], [{ ...glycol, concentrationMinPct: -1 }],
      [{ ...glycol, concentrationMaxPct: 61 }], [{ ...glycol, concentrationMinPct: 20, concentrationMaxPct: 10 }],
    ]) expect(pumpSelectionSchema.safeParse({ fluidLimits }).success).toBe(false);
  });
  it('sends only changed catalog specs when saving from a card editor', () => {
    const previous = fromVariant({ specs: { powerKw: 0.37, voltageV: 380 }, pumpSelection: { fluid: 'Вода' } });
    const patch = variantDraftPatch({ specs: { ...previous.specs, voltageV: null } }, previous);
    expect(previous).not.toHaveProperty('pumpSelection');
    expect(variantPatchSchema.parse({ pumpSelection: { fluid: 'Вода' } })).toEqual({});
    expect(toVariantData(variantPatchSchema.parse(patch))).toEqual({ specs: { voltageV: null } });
  });
});
