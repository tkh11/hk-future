"use client";

import { useId, useState } from "react";
import styles from "./CoolingExplorer.module.css";

const stages = [
  {
    label: "Серверные стойки",
    title: "Вычисления превращаются в тепло.",
    text: "Процессоры, память и другое оборудование выделяют тепло во время работы. Система охлаждения забирает его из серверной зоны, чтобы поддерживать рабочие условия оборудования.",
  },
  {
    label: "Циркуляция теплоносителя",
    title: "Тепло должно двигаться дальше.",
    text: "Насосы обеспечивают циркуляцию теплоносителя. Трубопроводы связывают узлы охлаждения в контур, по которому тепло переносится от серверной зоны к оборудованию его отвода.",
  },
  {
    label: "Отвод тепла",
    title: "Контур замыкается. Цикл продолжается.",
    text: "Тепло передаётся наружу через теплообменное оборудование. Охлаждённый теплоноситель возвращается в систему. Конкретная схема зависит от климата, нагрузки и требований проекта.",
  },
];

const coolingModes = {
  air: {
    title: "Через воздух серверного зала.",
    text: "Воздух проходит через серверное оборудование и забирает тепло. Затем передаёт его теплообменнику системы охлаждения. В водяной схеме дальше тепло переносит жидкостный контур.",
    note: "Воздух связывает серверы и теплообменник.",
    diagramLabel: "Воздушное охлаждение: воздух переносит тепло от серверных стоек к теплообменнику, подключённому к жидкостному контуру.",
  },
  liquid: {
    title: "Ближе к источнику тепла.",
    text: "В системе direct-to-chip жидкость проходит через холодные пластины у процессоров. Узел распределения охлаждающей жидкости — CDU — передаёт тепло во внешний контур. Часть оборудования при этом может продолжать охлаждаться воздухом.",
    note: "Жидкость забирает тепло непосредственно у процессоров.",
    diagramLabel: "Жидкостное охлаждение direct-to-chip: холодные пластины у процессоров связаны с узлом распределения CDU и внешним контуром.",
  },
};

type CoolingMode = keyof typeof coolingModes;

function Rack({ x, y, active = false }: { x: number; y: number; active?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} className={active ? styles.activeEquipment : styles.equipment}>
      <path d="M0 0 15-10H79L64 0Z" fill="#fff" />
      <path d="M64 0 79-10V153L64 163Z" fill="#e8e8eb" />
      <rect width="64" height="163" fill="#fff" />
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i} transform={`translate(7 ${12 + i * 20})`}>
          <rect width="50" height="14" rx="1" fill="#f5f5f7" />
          <path d="M7 5H27M7 9H27" />
          <circle cx="41" cy="7" r="1.5" fill="currentColor" stroke="none" />
        </g>
      ))}
      <path d="M8 163V170M56 163V170" />
    </g>
  );
}

function Fan({ x, y, radius = 22 }: { x: number; y: number; radius?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={radius} fill="#fff" />
      <circle r="4" fill="#f5f5f7" />
      {[0, 90, 180, 270].map((angle) => (
        <path key={angle} d={`M4 0Q${radius - 1} -${radius - 2} ${radius - 1} -3Q${radius - 3} 5 4 3`} transform={`rotate(${angle})`} fill="#f5f5f7" />
      ))}
    </g>
  );
}

function LoopDiagram({ selected }: { selected: number }) {
  const titleId = useId();
  const pipeClass = selected === 1 ? styles.activeFlow : styles.quietPipe;
  return (
    <svg className={styles.diagram} viewBox="0 0 760 450" role="img" aria-labelledby={titleId}>
      <title id={titleId}>Условный контур охлаждения: серверные стойки, теплообменник, насос и наружный отвод тепла. Выбран этап: {stages[selected].label}.</title>
      <rect x="52" y="78" width="396" height="282" rx="4" fill="#fff" stroke="#dedee2" strokeDasharray="5 5" />
      <text x="74" y="103" className={styles.svgCaption}>СЕРВЕРНЫЙ ЗАЛ</text>
      <text x="546" y="103" className={styles.svgCaption}>СНАРУЖИ</text>
      <path d="M72 325H425" className={styles.baseline} />
      <Rack x={83} y={153} active={selected === 0} />
      <Rack x={170} y={153} active={selected === 0} />
      <Rack x={257} y={153} active={selected === 0} />

      <g className={selected === 0 ? styles.activeEquipment : styles.equipment}>
        <rect x="374" y="160" width="42" height="150" rx="2" fill="#f5f5f7" />
        <path d="M385 172V297M395 172V297M405 172V297" />
        <path d="M338 209H363M355 203 363 209 355 215M338 250H363M355 244 363 250 355 256" />
      </g>
      <text x="204" y="349" textAnchor="middle" className={styles.svgLabel}>Серверные стойки</text>
      <path d="M416 183H606V202M606 285V377H395V310" className={styles.quietPipe} />
      <path d="M416 183H606V202M606 285V377H395V310" className={pipeClass} />
      <g className={selected === 2 ? styles.activeEquipment : styles.equipment}>
        <path d="M553 202 566 190H669L657 202Z" fill="#fff" />
        <path d="M657 202 669 190V273L657 285Z" fill="#e8e8eb" />
        <rect x="553" y="202" width="104" height="83" fill="#fff" />
        <Fan x={580} y={240} radius={21} />
        <Fan x={630} y={240} radius={21} />
        <path d="M564 285V300M646 285V300M564 300H575M635 300H646" />
        <path d="M576 173V144M570 150 576 144 582 150M607 173V144M601 150 607 144 613 150M638 173V144M632 150 638 144 644 150" />
      </g>
      <text x="607" y="325" textAnchor="middle" className={styles.svgLabel}>Отвод тепла</text>
      <g className={selected === 1 ? styles.activeEquipment : styles.equipment}>
        <circle cx="478" cy="377" r="20" fill="#fff" />
        <path d="M486 365 468 377 486 389Z" fill="#f5f5f7" />
      </g>
      <text x="478" y="417" textAnchor="middle" className={styles.svgLabel}>Насос</text>
      <path d="M518 177 526 183 518 189M560 371 552 377 560 383" className={selected === 1 ? styles.activeEquipment : styles.equipment} />
    </svg>
  );
}

function MethodDiagram({ mode }: { mode: CoolingMode }) {
  const titleId = useId();
  return (
    <svg className={styles.diagram} viewBox="0 0 760 450" role="img" aria-labelledby={titleId}>
      <title id={titleId}>{coolingModes[mode].diagramLabel}</title>
      <path d="M63 347H697" className={styles.baseline} />
      <Rack x={101} y={174} />
      <Rack x={187} y={174} />
      <Rack x={273} y={174} />
      <text x="225" y="382" textAnchor="middle" className={styles.svgLabel}>Серверные стойки</text>
      {mode === "air" ? (
        <g>
          <path d="M534 197H439Q413 197 413 164V141H122V159M355 308H462Q487 308 487 280V268H534" className={styles.quietPipe} />
          <path d="M534 197H439Q413 197 413 164V141H122V159M355 308H462Q487 308 487 280V268H534" className={styles.activeFlow} />
          <path d="M131 153 122 162 113 153M477 301 486 292 495 301" className={styles.activeEquipment} />
          <text x="278" y="116" textAnchor="middle" className={styles.svgLabel}>Охлаждённый воздух</text>
          <text x="436" y="333" textAnchor="middle" className={styles.svgLabel}>Нагретый воздух</text>
          <g className={styles.equipment}>
            <path d="M534 164 548 153H631L618 164Z" fill="#fff" />
            <path d="M618 164 631 153V318L618 330Z" fill="#e8e8eb" />
            <rect x="534" y="164" width="84" height="166" fill="#fff" />
            <Fan x={572} y={208} radius={27} />
            <Fan x={572} y={286} radius={27} />
            <path d="M606 174V320" />
          </g>
          <path d="M630 192H671V90M630 293H690V90" className={styles.quietPipe} />
          <text x="581" y="382" textAnchor="middle" className={styles.svgLabel}>Теплообменник</text>
          <text x="620" y="67" textAnchor="middle" className={styles.svgLabel}>Жидкостный контур</text>
        </g>
      ) : (
        <g>
          <path d="M133 161V120H548V190M305 161V139H525V288H548M219 161V120" className={styles.quietPipe} />
          <path d="M133 161V120H548V190M305 161V139H525V288H548M219 161V120" className={styles.activeFlow} />
          <path d="M377 114 385 120 377 126M402 133 394 139 402 145" className={styles.activeEquipment} />
          <g className={styles.activeEquipment}>
            <rect x="365" y="203" width="102" height="91" rx="2" fill="#fff" />
            <rect x="392" y="224" width="48" height="48" rx="2" fill="#f5f5f7" />
            <path d="M402 232V263H410V232H418V263H426V232M410 203V183M422 203V183M386 233H377M386 241H377M386 249H377M386 257H377M446 233H455M446 241H455M446 249H455M446 257H455" />
          </g>
          <path d="M340 247H365" stroke="#b6b6bc" strokeDasharray="3 3" fill="none" />
          <text x="417" y="324" textAnchor="middle" className={styles.svgLabel}>Холодная пластина</text>
          <g className={styles.equipment}>
            <path d="M548 168 563 157H634L620 168Z" fill="#fff" />
            <path d="M620 168 634 157V318L620 330Z" fill="#e8e8eb" />
            <rect x="548" y="168" width="72" height="162" fill="#fff" />
            <rect x="560" y="181" width="27" height="14" fill="#f5f5f7" />
            <path d="M560 211H608M560 219H608M560 227H608M560 235H608" />
            <rect x="560" y="256" width="48" height="60" fill="#f5f5f7" />
            <path d="M569 265V308M579 265V308M589 265V308M599 265V308" />
          </g>
          <path d="M634 190H669V90M634 288H690V90" className={styles.quietPipe} />
          <text x="585" y="382" textAnchor="middle" className={styles.svgLabel}>Узел CDU</text>
          <text x="623" y="67" textAnchor="middle" className={styles.svgLabel}>Внешний контур</text>
        </g>
      )}
    </svg>
  );
}

function CompactLoopDiagram({ selected }: { selected: number }) {
  return (
    <svg className={styles.compactDiagram} viewBox="0 0 340 330" role="img" aria-label={`Условный контур охлаждения: серверная зона, насос и отвод тепла. Выбран этап: ${stages[selected].label}.`}>
      <rect x="19" y="28" width="142" height="212" rx="3" fill="#fff" stroke="#dedee2" strokeDasharray="4 4" />
      <g transform="translate(44 92) scale(.64)"><Rack x={0} y={0} active={selected === 0} /></g>
      <g className={selected === 0 ? styles.activeEquipment : styles.equipment}>
        <rect x="113" y="94" width="18" height="109" fill="#f5f5f7" />
        <path d="M119 101V196M125 101V196M98 146H108M104 141 109 146 104 151" />
      </g>
      <path d="M131 111H258V118M258 183V267H122V203" className={styles.quietPipe} />
      {selected === 1 && <path d="M131 111H258V118M258 183V267H122V203" className={styles.activeFlow} />}
      <g className={selected === 2 ? styles.activeEquipment : styles.equipment}>
        <rect x="222" y="118" width="74" height="65" rx="2" fill="#fff" />
        <Fan x={259} y={150} radius={24} />
        <path d="M235 96V76M230 82 235 76 240 82M282 96V76M277 82 282 76 287 82M231 183V192M287 183V192" />
      </g>
      <g className={selected === 1 ? styles.activeEquipment : styles.equipment}>
        <circle cx="178" cy="267" r="17" fill="#fff" />
        <path d="M184 257 170 267 184 277Z" fill="#f5f5f7" />
      </g>
      <text x="87" y="222" textAnchor="middle" className={styles.svgLabel}>Серверная зона</text>
      <text x="259" y="214" textAnchor="middle" className={styles.svgLabel}>Отвод тепла</text>
      <text x="177" y="309" textAnchor="middle" className={styles.svgLabel}>Насос</text>
    </svg>
  );
}

function CompactMethodDiagram({ mode }: { mode: CoolingMode }) {
  return (
    <svg className={styles.compactDiagram} viewBox="0 0 340 350" role="img" aria-label={coolingModes[mode].diagramLabel}>
      <g transform="translate(42 134) scale(.72)"><Rack x={0} y={0} /></g>
      <path d="M26 261H308" className={styles.baseline} />
      <text x="68" y="283" textAnchor="middle" className={styles.svgLabel}>Серверы</text>
      <text x="257" y="49" textAnchor="middle" className={styles.svgLabel}>Внешний контур</text>
      <path d="M276 145H290V65M276 231H304V65" className={styles.quietPipe} />
      {mode === "air" ? (
        <g>
          <path d="M228 162H174V104H65V121M101 219H170V234H228" className={styles.quietPipe} />
          <path d="M228 162H174V104H65V121M101 219H170V234H228" className={styles.activeFlow} />
          <path d="M58 114 65 121 72 114M149 213 156 219 149 225" className={styles.activeEquipment} />
          <g className={styles.equipment}>
            <rect x="227" y="130" width="49" height="128" fill="#fff" />
            <Fan x={251} y={165} radius={18} />
            <Fan x={251} y={222} radius={18} />
          </g>
          <text x="134" y="86" textAnchor="middle" className={styles.svgLabel}>Холодный воздух</text>
          <text x="153" y="249" textAnchor="middle" className={styles.svgLabel}>Тёплый воздух</text>
          <text x="254" y="283" textAnchor="middle" className={styles.svgLabel}>Теплообменник</text>
        </g>
      ) : (
        <g>
          <path d="M67 122V94H245V132M99 196H134M178 196H207V222H227" className={styles.quietPipe} />
          <path d="M67 122V94H245V132M99 196H134M178 196H207V222H227" className={styles.activeFlow} />
          <g className={styles.activeEquipment}>
            <rect x="129" y="162" width="54" height="64" fill="#fff" />
            <rect x="137" y="177" width="37" height="38" fill="#f5f5f7" />
            <path d="M143 183V208H151V183H159V208H167V183" />
          </g>
          <g className={styles.equipment}>
            <rect x="227" y="130" width="49" height="128" fill="#fff" />
            <rect x="235" y="140" width="19" height="11" fill="#f5f5f7" />
            <path d="M235 166H268M235 173H268M235 180H268M237 201V246M247 201V246M257 201V246M267 201V246" />
          </g>
          <text x="156" y="248" textAnchor="middle" className={styles.svgLabel}>Холодная</text>
          <text x="156" y="264" textAnchor="middle" className={styles.svgLabel}>пластина</text>
          <text x="253" y="283" textAnchor="middle" className={styles.svgLabel}>CDU</text>
          <text x="163" y="78" textAnchor="middle" className={styles.svgLabel}>Жидкостный контур</text>
        </g>
      )}
    </svg>
  );
}

export function CoolingLoop() {
  const [selectedStage, setSelectedStage] = useState(0);
  const stageTextId = useId();
  const stage = stages[selectedStage];

  return (
    <div className={styles.explorer}>
      <section className={styles.section} aria-labelledby="cooling-loop-title" data-header-theme="light">
        <div className={styles.heading}>
          <h2 id="cooling-loop-title">У каждого вычисления<br />есть тепловой след.</h2>
          <p>Проследите путь тепла — от сервера до наружного воздуха.</p>
        </div>
        <div className={styles.layout}>
          <figure className={styles.figure}>
            <div className={styles.diagramWrap}>
              <LoopDiagram selected={selectedStage} />
              <CompactLoopDiagram selected={selectedStage} />
              <div className={styles.hotspots} role="group" aria-label="Выберите узел на схеме">
                {stages.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`${styles.hotspot} ${styles[`hotspot${index}`]}`}
                    aria-label={`${index + 1}. ${item.label}`}
                    aria-pressed={selectedStage === index}
                    aria-controls={stageTextId}
                    onClick={() => setSelectedStage(index)}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
            <figcaption>Выберите узел, чтобы узнать его роль в системе.</figcaption>
          </figure>
          <div className={styles.copy}>
            <div className={styles.steps} role="group" aria-label="Этапы охлаждения">
              {stages.map((item, index) => (
                <button type="button" key={item.label} aria-pressed={selectedStage === index} aria-controls={stageTextId} onClick={() => setSelectedStage(index)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.explanation} id={stageTextId} aria-live="polite" aria-atomic="true">
              <h3>{stage.title}</h3>
              <p>{stage.text}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CoolingMethods() {
  const [mode, setMode] = useState<CoolingMode>("air");
  const modeTextId = useId();
  const cooling = coolingModes[mode];

  return (
    <div className={styles.explorer}>
      <section className={`${styles.section} ${styles.methodsSection}`} aria-labelledby="cooling-methods-title" data-header-theme="light">
        <div className={styles.heading}>
          <h2 id="cooling-methods-title">Одна задача.<br />Разные пути отвода тепла.</h2>
          <p>Сравните два принципа передачи тепла от серверов.</p>
        </div>
        <div className={`${styles.layout} ${styles.reverse}`}>
          <figure className={styles.figure}>
            <div className={styles.diagramWrap}><MethodDiagram mode={mode} /><CompactMethodDiagram mode={mode} /></div>
            <figcaption>{cooling.note}</figcaption>
          </figure>
          <div className={styles.copy}>
            <div className={styles.switcher} role="group" aria-label="Способ охлаждения">
              <button type="button" aria-pressed={mode === "air"} aria-controls={modeTextId} onClick={() => setMode("air")}>Воздушное</button>
              <button type="button" aria-pressed={mode === "liquid"} aria-controls={modeTextId} onClick={() => setMode("liquid")}>Жидкостное</button>
            </div>
            <div className={styles.explanation} id={modeTextId} aria-live="polite" aria-atomic="true">
              <h3>{cooling.title}</h3>
              <p>{cooling.text}</p>
            </div>
            <p className={styles.aside}>Решение подбирают под тепловую нагрузку, компоновку и требования к надёжности конкретного ЦОД.</p>
          </div>
        </div>
        <p className={styles.disclaimer}>Иллюстрации показывают упрощённые принципы работы и не являются проектной схемой.</p>
      </section>
    </div>
  );
}

export default function CoolingExplorer() {
  return <><CoolingLoop /><CoolingMethods /></>;
}
