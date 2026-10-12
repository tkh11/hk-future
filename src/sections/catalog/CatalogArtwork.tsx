import type { CatalogArt } from "@/lib/catalog";

function Pipe({ x, y, layers = false }: { x: number; y: number; layers?: boolean }) {
  return <g transform={`translate(${x} ${y}) rotate(-28)`}>
    <path d="M0-19h174v38H0c-13 0-13-38 0-38Z" fill="#f4f4f6" />
    <path d="M0-19h174M0 19h174M0-8h174" />
    <ellipse cx="174" rx="12" ry="19" fill="#fff" />
    <ellipse cx="174" rx="7" ry="13" fill="#e6e6e9" />
    {layers && <ellipse cx="174" rx="9.5" ry="16" stroke="#d8222b" />}
    <path d="M7 10h143" stroke="#d8222b" opacity=".6" />
  </g>;
}

function VerticalPump({ x = 180, y = 138, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="m-45 69 51-17 48 26-51 18Z" fill="#f1f1f3" />
    <path d="M-24-39v102c0 16 48 16 48 0V-39" fill="#f4f4f6" />
    <ellipse cy="-39" rx="24" ry="11" fill="#fff" />
    <path d="M-24 1c8 13 40 13 48 0M-24 12c8 13 40 13 48 0M-24 55c8 13 40 13 48 0" />
    <path d="M-28-68v31c0 16 56 16 56 0v-31" fill="#eeeef1" />
    <ellipse cy="-68" rx="28" ry="12" fill="#fff" />
    <path d="M-19-63v28M-10-60v29M0-59v29M10-60v29M19-63v28" />
    <path d="m24 34 28-10v21L24 55M-24 41-50 56V35l26-14" fill="#fff" />
    <path d="M-21 20c9 8 33 8 42 0" stroke="#d8222b" strokeWidth="2" />
    <rect x="20" y="-56" width="20" height="25" rx="2" fill="#fff" />
  </g>;
}

export default function CatalogArtwork({ kind }: { kind: CatalogArt }) {
  return <svg viewBox="0 0 360 260" fill="none" stroke="#9b9ba3" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <path d="m42 208 156 32 124-58" stroke="#e4e4e8" />
    {(kind === "pipes" || kind === "layers") && <><Pipe x={63} y={141} layers={kind === "layers"} /><Pipe x={84} y={168} layers={kind === "layers"} /><Pipe x={105} y={195} layers={kind === "layers"} /></>}
    {kind === "pump" && <VerticalPump />}
    {kind === "station" && <><path d="m80 199 144-42 66 41-150 46Z" fill="#f5f5f7" /><VerticalPump x={146} y={133} scale={.8} /><VerticalPump x={225} y={158} scale={.8} /><path d="m97 194 133-40m-122 57 130-40" stroke="#d8222b" strokeWidth="3" /></>}
    {kind === "borehole" && <g transform="translate(178 129) rotate(25)">
      <path d="M-20-80V72c0 18 40 18 40 0V-80" fill="#f1f1f4" /><ellipse cy="-80" rx="20" ry="9" fill="#fff" />
      <path d="M-20-30c7 8 33 8 40 0M-20 30c7 8 33 8 40 0M-20 61c7 8 33 8 40 0" />
      <path d="M-12-60v18M-6-60v18M0-60v18M6-60v18M12-60v18" stroke="#d8222b" />
      <path d="M15 71h10V-76" /><path d="M-9-86v-18H9v18" fill="#fff" />
    </g>}
    {kind === "circulation" && <>
      <path d="m86 146 55-31 82 44 50-30v36l-50 30-82-44-55 31Z" fill="#eeeef1" />
      <path d="m143 108 46-27 43 25v58l-46 27-43-25Z" fill="#f3f3f5" />
      <path d="m143 108 43 25 46-27M186 133v58" /><ellipse cx="189" cy="135" rx="22" ry="32" fill="#fff" />
      <ellipse cx="189" cy="135" rx="15" ry="24" stroke="#d8222b" /><path d="m84 140 8-5v51l-8 5M269 124l9-5v51l-9 5" />
    </>}
    {kind === "drainage" && <>
      <path d="M136 87v103c0 26 91 26 91 0V87" fill="#f2f2f4" /><ellipse cx="181.5" cy="87" rx="45.5" ry="20" fill="#fff" />
      <path d="M157 73V47h47v26M145 183v18M157 190v18M170 194v18M183 195v18M196 194v18M209 190v18M220 184v18" />
      <path d="M227 157h32v-39h-20v23h-12" fill="#fff" /><path d="M145 112c17 15 58 15 73 0" stroke="#d8222b" />
      <path d="M216 75c30-40 51-22 51 11v54" /><rect x="255" y="137" width="23" height="32" rx="8" fill="#fff" />
    </>}
    {(kind === "automation" || kind === "auxiliary") && <>
      <path d="m179 66 55-24 56 33v115l-54 25-57-34Z" fill="#f2f2f5" /><path d="m179 66 57 34 54-25M236 100v115" />
      <path d="m193 91 28 16v31l-28-16Z" fill="#fff" /><path d="m198 111 18 10" stroke="#d8222b" />
      <path d="m246 147 12-6m-12 13 12-6m-12 13 12-6" /><circle cx="207" cy="151" r="4" stroke="#d8222b" />
      <path d="M110 133v59m-27 0h55M105 205h46" /><circle cx="110" cy="101" r="31" fill="#fff" /><circle cx="110" cy="101" r="24" />
      <path d="m110 101 13-15" stroke="#d8222b" strokeWidth="2" /><path d="M110 82v3m-15 8 3 2m27-2-3 2" />
      {kind === "auxiliary" && <><path d="m58 170 41-23 25 15-41 23Z" fill="#fff" /><path d="m60 190 23 13 43-24v-17m-43 23v18M83 169v-20" /><path d="m65 145 35 15m-35 0 35-15" stroke="#d8222b" strokeWidth="3" /></>}
    </>}
  </svg>;
}
