import shared from "../data-centers/DataCenters.module.css";
import styles from "./FireSuppression.module.css";

function Sprinkler({ x, y, delay }: { x: number; y: number; delay: string }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M0 0v30" stroke="#99999f" strokeWidth="10" />
    <ellipse cy="29" rx="26" ry="12" fill="#e7e7e9" stroke="#a8a8ae" strokeWidth="1.4" />
    <path d="M-10 31v23q10 14 20 0V31" fill="none" stroke="#77777e" strokeWidth="4" />
    <path d="M0 35v18" stroke="#d8222b" strokeWidth="5" strokeLinecap="round" />
    <ellipse cy="60" rx="16" ry="5" fill="#b2b2b8" stroke="#818188" />
    <g className={styles.water} style={{ animationDelay: delay }} fill="none" stroke="#d8222b" strokeWidth="2" strokeLinecap="round">
      <path d="m-9 78-10 16m19-11v20m9-25 10 16M-27 106l-10 15m37-9v16m27-22 10 15" />
    </g>
  </g>;
}

export default function FireHero() {
  return <section className={shared.hero} data-header-theme="light" aria-labelledby="fire-title">
    <div className={shared.heroInner}>
      <div className={shared.heroCopy}>
        <h1 id="fire-title">Системы<br />пожаротушения</h1>
        <p className={shared.heroDescription}>Надёжность каждого соединения.<br />Готовность всей системы.</p>
      </div>
      <div className={shared.heroVisual}>
        <svg className={styles.heroDiagram} viewBox="0 0 760 560" role="img" aria-label="Условная схема спринклерной системы: магистраль с тремя подключёнными оросителями">
          <path d="m92 259 320-184 270 156-320 185Z" fill="#fff" stroke="#dddde1" strokeWidth="1.2" />
          <g fill="none" stroke="#eeeef0" strokeWidth="1">
            <path d="m160 299 320-184m-250 224 320-184m-250 224 320-184M172 213l270 156M252 167l270 156M332 121l270 156" />
          </g>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M112 318v-68L412 77 667 224" stroke="#d8222b" strokeWidth="11" />
            <path d="M112 318v-68L412 77 667 224" className={styles.flow} stroke="#fff" strokeWidth="2.5" strokeDasharray="12 120" />
            <path d="m412 77 180 104M292 146l180 104M172 215l180 104" stroke="#8e8e96" strokeWidth="7" />
            <path d="m412 77 180 104M292 146l180 104M172 215l180 104" className={styles.flow} stroke="#fff" strokeWidth="1.6" strokeDasharray="8 84" />
          </g>
          <Sprinkler x={592} y={181} delay="0s" />
          <Sprinkler x={472} y={250} delay="-.8s" />
          <Sprinkler x={352} y={319} delay="-1.6s" />
        </svg>
      </div>
    </div>
  </section>;
}
