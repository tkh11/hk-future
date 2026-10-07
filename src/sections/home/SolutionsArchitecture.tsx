type SolutionsArchitectureProps = {
  className?: string;
};

const ribs = Array.from({ length: 19 }, (_, index) => {
  const depth = index / 18;
  const x = 176 + Math.pow(depth, 1.72) * 624;
  const bottom = 271 + Math.pow(depth, 1.7) * 120;
  const top = 236 - Math.pow(depth, 1.23) * 695;
  const bend = 20 + depth * 145;
  const width = 2.5 + depth * 15;
  const side = 2 + depth * 9;
  const shoulder = top + 65 + depth * 92;

  return { x, bottom, top, bend, width, side, shoulder };
});

export default function SolutionsArchitecture({ className }: SolutionsArchitectureProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 720 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="solutions-architecture-wall" x1=".2" y1="0" x2="1" y2=".7">
          <stop stopColor="#f6f7f8" />
          <stop offset=".54" stopColor="#e7ebef" />
          <stop offset="1" stopColor="#d8dee5" />
        </linearGradient>
        <linearGradient id="solutions-architecture-face" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#fff" />
          <stop offset=".32" stopColor="#fcfdfe" />
          <stop offset="1" stopColor="#e2e7ed" />
        </linearGradient>
        <linearGradient id="solutions-architecture-edge" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#c8d0d9" />
          <stop offset="1" stopColor="#e4e9ee" />
        </linearGradient>
        <linearGradient id="solutions-architecture-floor" x1="0" y1="0" x2=".5" y2="1">
          <stop stopColor="#e6eaef" />
          <stop offset=".35" stopColor="#f3f5f7" />
          <stop offset="1" stopColor="#fafbfc" />
        </linearGradient>
        <linearGradient id="solutions-architecture-mist" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#f5f6f8" />
          <stop offset=".2" stopColor="#f5f6f8" stopOpacity=".98" />
          <stop offset=".43" stopColor="#f5f6f8" stopOpacity=".35" />
          <stop offset=".72" stopColor="#f5f6f8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="solutions-architecture-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#f5f6f8" stopOpacity="0" />
          <stop offset="1" stopColor="#f5f6f8" stopOpacity=".7" />
        </linearGradient>
      </defs>

      <path
        d="M128 271C312 264 352 85 412-50H810V434C626 328 363 273 128 271Z"
        fill="url(#solutions-architecture-wall)"
      />
      <path
        d="M92 270C347 264 530 303 800 391V460H0V299Z"
        fill="url(#solutions-architecture-floor)"
      />

      {ribs.map(({ x, bottom, top, bend, width, side, shoulder }, index) => (
        <g key={index}>
          <path
            d={`M${x + width} ${bottom}V${shoulder}C${x + width} ${top + 52} ${x + bend + width} ${top + 29} ${x + bend + width} ${top}H${x + bend + width + side}C${x + bend + width + side} ${top + 29} ${x + width + side} ${top + 52} ${x + width + side} ${shoulder}V${bottom - side * 0.4}Z`}
            fill="url(#solutions-architecture-edge)"
          />
          <path
            d={`M${x} ${bottom}V${shoulder}C${x} ${top + 52} ${x + bend} ${top + 29} ${x + bend} ${top}H${x + bend + width}C${x + bend + width} ${top + 29} ${x + width} ${top + 52} ${x + width} ${shoulder}V${bottom}Z`}
            fill="url(#solutions-architecture-face)"
          />
          <path
            d={`M${x} ${bottom}Q${x + width * 1.2} ${bottom + 6} ${x + width + side * 1.7} ${bottom + 5}L${x + width + side} ${bottom - side * 0.4}L${x + width} ${bottom}Z`}
            fill="#d9dfe6"
            opacity=".45"
          />
        </g>
      ))}

      <path d="M150 285C344 278 534 324 746 413" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".6" />
      <path d="M96 309C288 290 488 333 686 420" fill="none" stroke="#fff" strokeWidth="1" opacity=".6" />
      <rect width="720" height="420" fill="url(#solutions-architecture-mist)" />
      <rect y="300" width="720" height="120" fill="url(#solutions-architecture-bottom)" />
    </svg>
  );
}
