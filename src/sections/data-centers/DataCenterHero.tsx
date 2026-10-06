import Link from "next/link";
import styles from "./DataCenters.module.css";

type Point = readonly [number, number, number];

// Every surface and pipe uses the same ground plane and projection.
const project = ([x, y, z]: Point) => [340 + (x - y) * 0.78, 260 + (x + y) * 0.45 - z];
const line = (points: readonly Point[]) => points.map((point, index) => `${index ? "L" : "M"}${project(point).join(" ")}`).join(" ");
const face = (points: readonly Point[]) => `${line(points)}Z`;
const rackHeight = 160;
const pipeHeight = 205;
const rowPositions = [45, 205];
const columnPositions = [25, 135, 245];
const racks = rowPositions.flatMap((y) => columnPositions.map((x) => ({ x, y })))
  .sort((a, b) => a.x + a.y - b.x - b.y);

function ServerRack({ x, y }: { x: number; y: number }) {
  const width = 64;
  const depth = 64;
  return <g>
    <path d={face([[x, y + depth, 0], [x + width, y + depth, 0], [x + width, y + depth, rackHeight], [x, y + depth, rackHeight]])} fill="#303035" stroke="#727279" strokeWidth="1" />
    <path d={face([[x + width, y + depth, 0], [x + width, y, 0], [x + width, y, rackHeight], [x + width, y + depth, rackHeight]])} fill="#45454c" stroke="#77777f" strokeWidth="1" />
    <path d={face([[x, y, rackHeight], [x + width, y, rackHeight], [x + width, y + depth, rackHeight], [x, y + depth, rackHeight]])} fill="#e6e6ea" stroke="#9999a0" strokeWidth="1" />
    {Array.from({ length: 7 }, (_, index) => {
      const z = 17 + index * 19;
      const light = project([x + 54, y + depth, z + 7]);
      return <g key={index}>
        <path d={face([[x + 6, y + depth, z], [x + 58, y + depth, z], [x + 58, y + depth, z + 14], [x + 6, y + depth, z + 14]])} fill="#37373e" stroke="#707078" strokeWidth=".65" />
        <path d={`${line([[x + 12, y + depth, z + 5], [x + 43, y + depth, z + 5]])} ${line([[x + 12, y + depth, z + 9], [x + 43, y + depth, z + 9]])}`} stroke="#91919a" strokeWidth=".65" />
        <circle cx={light[0]} cy={light[1]} r="1.35" fill={index % 3 === 0 ? "var(--hk-red)" : "#b8b8c0"} />
        <path d={line([[x + width, y + 9, z + 7], [x + width, y + depth - 9, z + 7]])} stroke="#73737d" strokeWidth=".7" />
      </g>;
    })}
  </g>;
}

function ServerHall() {
  const supplyMain: Point[] = [[400, -15, pipeHeight], [400, 290, pipeHeight], [400, 290, 0]];
  const returnMain: Point[] = [[475, -55, pipeHeight], [475, 290, pipeHeight], [475, 290, 0]];
  const pump = project([400, 235, pipeHeight]);

  return (
    <svg viewBox="35 5 760 645" role="img" aria-labelledby="dc-hall-title" className={styles.hall}>
      <title id="dc-hall-title">Шесть серверных стоек, каждая подключена к подающему и обратному коллекторам охлаждения</title>
      <path d={face([[-30, -65, 0], [495, -65, 0], [495, 310, 0], [-30, 310, 0]])} fill="#eeeef1" stroke="#d9d9df" />
      <path d={face([[-30, 310, 0], [495, 310, 0], [495, 310, -8], [-30, 310, -8]])} fill="#e1e1e6" />
      <path d={face([[495, -65, 0], [495, 310, 0], [495, 310, -8], [495, -65, -8]])} fill="#e7e7ec" />
      <g stroke="#d9d9df" strokeWidth=".8" fill="none">
        {[45, 120, 195, 270, 345, 420].map((x) => <path key={`x-${x}`} d={line([[x, -65, 0], [x, 310, 0]])} />)}
        {[10, 85, 160, 235].map((y) => <path key={`y-${y}`} d={line([[-30, y, 0], [495, y, 0]])} />)}
      </g>
      {/* Paint the racks from back to front; their bases share one floor. */}
      {racks.map((rack) => <ServerRack key={`${rack.x}-${rack.y}`} {...rack} />)}
      {/* Both collectors run above the racks, with one pair of drops per rack. */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={line(returnMain)} stroke="#9b9ba4" strokeWidth="3" />
        {rowPositions.map((y) => <g key={`return-${y}`}>
          <path d={line([[7, y - 100, pipeHeight], [475, y - 100, pipeHeight]])} stroke="#9b9ba4" strokeWidth="2.5" />
          {columnPositions.map((x) => <path key={x} d={line([[x + 47, y - 100, pipeHeight], [x + 47, y + 20, pipeHeight], [x + 47, y + 20, rackHeight]])} stroke="#9b9ba4" strokeWidth="2" />)}
        </g>)}
        <path d={line(supplyMain)} stroke="#fff" strokeWidth="7" />
        <path d={line(supplyMain)} stroke="var(--hk-red)" strokeWidth="3.5" />
        <path d={line(supplyMain)} stroke="#fff" strokeWidth="1.4" strokeDasharray="8 110" className={styles.flow} />
        {rowPositions.map((y) => <g key={`supply-${y}`}>
          <path d={line([[7, y - 60, pipeHeight], [400, y - 60, pipeHeight]])} stroke="#fff" strokeWidth="6" />
          <path d={line([[7, y - 60, pipeHeight], [400, y - 60, pipeHeight]])} stroke="var(--hk-red)" strokeWidth="2.8" />
          {columnPositions.map((x) => <path key={x} d={line([[x + 18, y - 60, pipeHeight], [x + 18, y + 20, pipeHeight], [x + 18, y + 20, rackHeight]])} stroke="var(--hk-red)" strokeWidth="2.2" />)}
        </g>)}
      </g>
      {racks.map(({ x, y }) => {
        const supplyPort = project([x + 18, y + 20, rackHeight]);
        const returnPort = project([x + 47, y + 20, rackHeight]);
        return <g key={`ports-${x}-${y}`}>
          <circle cx={supplyPort[0]} cy={supplyPort[1]} r="2.8" fill="#fff" stroke="var(--hk-red)" strokeWidth="1.4" />
          <circle cx={returnPort[0]} cy={returnPort[1]} r="2.8" fill="#fff" stroke="#8e8e98" strokeWidth="1.3" />
        </g>;
      })}
      <circle cx={pump[0]} cy={pump[1]} r="18" fill="#fff" stroke="var(--hk-red)" strokeWidth="1.7" />
      <path d={`M${pump[0] - 6} ${pump[1] - 8}l15 8-15 8Z`} fill="var(--hk-red)" />
    </svg>
  );
}

export default function DataCenterHero() {
  return <section className={styles.hero} data-header-theme="light">
    <div className={styles.heroInner}>
      <div className={styles.heroCopy}>
        <h1>Холод для<br />больших данных.</h1>
        <p className={styles.heroDescription}>За каждым вычислением — тепло.<br />За стабильной работой — инженерия.</p>
        <Link href="/catalog" className="home-hero__link">Решения в каталоге</Link>
      </div>
      <div className={styles.heroVisual}><ServerHall /></div>
    </div>
  </section>;
}
