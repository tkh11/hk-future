import { z } from 'zod';
import { curvePoints } from './pump-curve';
import { pumpSelectionSchema } from './pump-selection-data';
import { storedPumpSystemTypes } from '../lib/pump-system-types';
import { pumpSharedOverrideKeysSchema } from './pump-shared-characteristics';

const nonnegative = z.number().finite().nonnegative().nullable();
export const motorVoltageRange = z.string().trim().max(32).regex(/^[1-9]\d*(?:\s*[-–—]\s*[1-9]\d*)?$/).nullish();
type StoredPumpSystemType = keyof typeof storedPumpSystemTypes;
export const pumpSelectionValuesSchema = z.object({
  sku: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  group: z.number().int().positive(),
  characteristicOverrides: pumpSharedOverrideKeysSchema.optional(),
  connectionSize: z.string().trim().max(100),
  systemTypes: z.array(z.custom<StoredPumpSystemType>(value => typeof value === 'string' && Object.hasOwn(storedPumpSystemTypes, value)))
    .refine(types => new Set(types).size === types.length),
  pumpSelection: pumpSelectionSchema,
  specs: z.object({
    powerKw: nonnegative, voltageV: nonnegative, phases: nonnegative, netWeightKg: nonnegative,
    voltageDeltaV: motorVoltageRange, voltageStarV: motorVoltageRange,
  }),
  curve: z.object({
    points: z.union([curvePoints, z.tuple([])]),
    speedRpm: z.number().int().positive().nullable(),
    frequencyHz: z.number().finite().positive().nullable(),
    nominalCurrentA: nonnegative,
  }),
});

export type PumpSelectionValues = z.infer<typeof pumpSelectionValuesSchema>;
