import type { FirePart } from "./fireoff-model";

// Engineering coordinates in metres: keep these separate from editable product copy.
export const FIRE_MARKERS = [
  { id: "station", anchor: [-4.25, -3, -3.2], offset: [-42, -48] },
  { id: "pipework", anchor: [7.5, -.9, -9], offset: [-28, -52] },
  { id: "sprinkler", anchor: [7.5, -.64, -4.5], offset: [42, -44] },
  { id: "hydrants", anchor: [17.79, -3.28, -6.5], offset: [34, -38] },
  { id: "flange", anchor: [-2.99, -3.85, -4.1], offset: [40, 44] },
] as const satisfies readonly { id: FirePart; anchor: readonly [number, number, number]; offset: readonly [number, number] }[];
