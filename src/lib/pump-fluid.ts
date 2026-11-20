import { readPumpDecimal } from './pump-input';

export const pumpFluidLabels = {
  water: 'Вода',
  ethyleneGlycol: 'Раствор этиленгликоля',
  propyleneGlycol: 'Раствор пропиленгликоля',
  custom: 'Произвольная вязкая жидкость',
} as const;

export type PumpFluidKind = keyof typeof pumpFluidLabels;
export const pumpGlycolKinds = ['ethyleneGlycol', 'propyleneGlycol'] as const;
type FluidProperties = Readonly<{
  densityKgM3: number;
  kinematicViscosityMm2S: number;
}>;
export type PumpFluidInput = Readonly<{
  kind: Exclude<PumpFluidKind, 'custom'>;
  temperatureC: number;
  concentrationPct: number | null;
}> | (FluidProperties & Readonly<{
  kind: 'custom';
  name: string;
  temperatureC: number | null;
  concentrationPct: number | null;
}>);
export type PumpFluid = PumpFluidInput & FluidProperties;
export type CustomFluidFields = Readonly<{ fluidName: string; density: string; viscosity: string }>;

// Liquid water at saturation, [°C, kg/m³, mPa·s].
// https://datatool.pumps.org/fluid-properties-ii/water-properties
const waterProperties = [
  [0, 999.79, 1.7912],
  [10, 999.65, 1.3056],
  [20, 998.16, 1.0014],
  [30, 995.60, 0.79719],
  [40, 992.17, 0.65285],
  [50, 987.99, 0.54674],
  [60, 983.16, 0.46631],
  [70, 977.73, 0.40382],
  [80, 971.76, 0.35429],
  [90, 965.29, 0.31436],
  [100, 958.34, 0.28171],
  [110, 950.94, 0.25467],
  [120, 943.10, 0.23203],
] as const;
const waterTemperatureRange = { minC: waterProperties[0][0], maxC: waterProperties.at(-1)![0] };
const glycolTemperatureRange = { minC: -50, maxC: 100 };

// Melinder (2010) coefficients in the LBNL Buildings library, mass-based water mixtures.
// https://simulationresearch.lbl.gov/modelica/releases/v13.0.1/help/Buildings_Media_Antifreeze_Functions_EthyleneGlycolWater.html
// https://simulationresearch.lbl.gov/modelica/releases/v13.0.1/help/Buildings_Media_Antifreeze_Functions_PropyleneGlycolWater.html
const glycolProperties = {
  ethyleneGlycol: {
    concentrationBase: 30.8462,
    temperatureBase: 31.728,
    density: [
      1034, -0.4781, -0.002692, 4.725e-6, 1.311, -0.006876, 4.805e-5, 1.690e-8, 7.490e-5,
      7.855e-5, -3.995e-7, 4.982e-9, -1.062e-4, 1.229e-6, -1.153e-8, -9.623e-7, -7.221e-8, 4.891e-8,
    ],
    logViscosity: [
      0.4705, -0.02550, 1.782e-4, -7.669e-7, 0.02471, -1.171e-4, 1.052e-6, -1.634e-8,
      3.328e-6, -1.086e-6, -1.051e-8, -6.475e-10, 1.695e-6, 3.157e-9, 4.063e-10, 3.089e-8, 1.831e-10, -1.865e-9,
    ],
    freezing: [
      -15.25, -1.566e-6, -2.278e-7, 2.169e-9, -0.8080, -1.339e-6, 2.047e-8, -2.717e-11,
      -0.01334, 6.332e-8, 2.373e-10, -2.183e-12, -7.293e-5, -1.764e-9, -2.442e-11, 1.006e-6, -7.662e-11, 1.140e-9,
    ],
  },
  propyleneGlycol: {
    concentrationBase: 30.7031,
    temperatureBase: 32.7083,
    density: [
      1018, -0.5406, -0.002666, 1.347e-5, 0.7604, -0.009450, 5.541e-5, -1.343e-7, -0.002498,
      2.700e-5, -4.018e-7, 3.376e-9, -1.550e-4, 2.829e-6, -7.175e-9, -1.131e-6, -2.221e-8, 2.342e-8,
    ],
    logViscosity: [
      0.6837, -0.03045, 2.525e-4, -1.399e-6, 0.03328, -3.984e-4, 4.332e-6, -1.860e-8, 5.453e-5,
      -8.600e-8, -1.593e-8, -4.465e-11, -3.900e-6, 1.054e-7, -1.589e-9, -1.587e-8, 4.475e-10, 3.564e-9,
    ],
    freezing: [
      -13.25, -3.820e-5, 7.865e-7, -1.733e-9, -0.6631, 6.774e-6, -7.819e-10, -1.918e-9, -0.01094,
      5.332e-8, -4.169e-9, 3.288e-11, -3.409e-6, 8.035e-11, 1.465e-8, 0, 0, 0,
    ],
  },
} as const;

const temperatureTermCounts = [4, 4, 4, 3, 2, 1];
function evaluateMixture(coefficients: readonly number[], concentrationOffset: number, temperatureOffset: number) {
  let index = 0, result = 0;
  for (const [i, termCount] of temperatureTermCounts.entries()) {
    for (let j = 0; j < termCount; j++) {
      result += coefficients[index++] * concentrationOffset ** i * temperatureOffset ** j;
    }
  }
  return result;
}

export function isPumpFluidKind(kind: string): kind is PumpFluidKind {
  return Object.hasOwn(pumpFluidLabels, kind);
}

function readSignedDecimal(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('-') || trimmed.startsWith('+')) {
    const unsigned = trimmed.slice(1);
    if (unsigned !== unsigned.trimStart()) return null;
    const magnitude = readPumpDecimal(unsigned);
    return magnitude === null ? null : trimmed[0] === '-' ? -magnitude : magnitude;
  }
  return readPumpDecimal(trimmed);
}

export function parsePumpFluidInput(kind: string, temperature: string, concentration: string, custom?: CustomFluidFields): PumpFluidInput | null {
  const type = kind || 'water';
  if (!isPumpFluidKind(type)) return null;
  const temperatureC = temperature === '' && type === 'water' ? 20 : readSignedDecimal(temperature);
  if (type === 'custom') {
    if (!custom) return null;
    const densityKgM3 = readPumpDecimal(custom.density);
    const kinematicViscosityMm2S = readPumpDecimal(custom.viscosity);
    const concentrationPct = readPumpDecimal(concentration);
    if (densityKgM3 === null || kinematicViscosityMm2S === null ||
        (temperature.trim() && temperatureC === null) || (concentration.trim() && concentrationPct === null)) return null;
    return { kind: type, name: custom.fluidName.trim(), densityKgM3, kinematicViscosityMm2S, temperatureC, concentrationPct };
  }
  if (temperatureC === null) return null;
  const concentrationPct = type === 'water' ? null : readPumpDecimal(concentration);
  if (type !== 'water' && concentrationPct === null) return null;
  return { kind: type, temperatureC, concentrationPct };
}

export function resolvePumpFluid(input: PumpFluidInput): PumpFluid | null {
  const { kind, temperatureC, concentrationPct } = input;
  if (kind === 'custom') {
    if (!input.name.trim() || input.name.length > 128 ||
        !Number.isFinite(input.densityKgM3) || input.densityKgM3 <= 0 ||
        !Number.isFinite(input.kinematicViscosityMm2S) || input.kinematicViscosityMm2S <= 0 || input.kinematicViscosityMm2S > 3000 ||
        (temperatureC !== null && !Number.isFinite(temperatureC)) ||
        (concentrationPct !== null && (!Number.isFinite(concentrationPct) || concentrationPct < 0 || concentrationPct > 100))) return null;
    return input;
  }
  if (!isPumpFluidKind(kind) || !Number.isFinite(temperatureC)) return null;
  let densityKgM3: number, dynamicViscosityMilliPascalSeconds: number;
  if (kind === 'water') {
    if (temperatureC < waterTemperatureRange.minC || temperatureC > waterTemperatureRange.maxC || concentrationPct !== null) return null;
    const upper = waterProperties.findIndex(([temperature]) => temperature >= temperatureC);
    const [t0, d0, v0] = waterProperties[Math.max(0, upper - 1)];
    const [t1, d1, v1] = waterProperties[upper];
    const fraction = t0 === t1 ? 0 : (temperatureC - t0) / (t1 - t0);
    densityKgM3 = d0 + fraction * (d1 - d0);
    dynamicViscosityMilliPascalSeconds = v0 + fraction * (v1 - v0);
  } else {
    if (concentrationPct === null || !Number.isFinite(concentrationPct) || concentrationPct <= 0 || concentrationPct > 60
      || temperatureC < glycolTemperatureRange.minC || temperatureC > glycolTemperatureRange.maxC) return null;
    const model = glycolProperties[kind];
    const x = concentrationPct - model.concentrationBase;
    const t = temperatureC - model.temperatureBase;
    if (temperatureC <= evaluateMixture(model.freezing, x, t)) return null;
    densityKgM3 = evaluateMixture(model.density, x, t);
    dynamicViscosityMilliPascalSeconds = Math.exp(evaluateMixture(model.logViscosity, x, t));
  }
  return { ...input, densityKgM3, kinematicViscosityMm2S: 1000 * dynamicViscosityMilliPascalSeconds / densityKgM3 };
}

export function pumpFluidTemperatureRange(fluid: PumpFluid) {
  if (fluid.kind === 'custom') return null;
  if (fluid.kind === 'water') return waterTemperatureRange;
  const { minC, maxC } = glycolTemperatureRange;
  if (resolvePumpFluid({ ...fluid, temperatureC: minC })) return glycolTemperatureRange;

  let low = minC, high = fluid.temperatureC;
  for (let step = 0; step < 24; step++) {
    const middle = low + (high - low) / 2;
    if (resolvePumpFluid({ ...fluid, temperatureC: middle })) high = middle;
    else low = middle;
  }
  // Round toward the liquid side without excluding the selected temperature.
  return { minC: Math.min(fluid.temperatureC, Math.ceil(high * 10) / 10), maxC };
}

export const defaultPumpFluid = resolvePumpFluid({ kind: 'water', temperatureC: 20, concentrationPct: null })!;
