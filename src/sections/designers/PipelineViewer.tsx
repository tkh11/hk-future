"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { publicPath } from "@/lib/public-path";
import {
  BUILDING_BLOCKS,
  findBuildingBlock,
  type BuildingBlock,
  type BuildingBlockId,
} from "@/sections/designers/building-blocks";
import {
  findPipelineElement,
  pipelineProductAnchor,
  PIPELINE_PRODUCTS,
  PIPELINE_SYSTEMS,
  type PipelineProduct,
  type PipelineSystemId,
} from "@/sections/designers/pipeline-data";
import type { DesignersPhase, DesignersView } from "@/sections/designers/BuildingScene";

const BuildingScene = dynamic(() => import("@/sections/designers/BuildingScene"), {
  ssr: false,
});

/** The camera push into a block, and the pull-back out of it, run under the veil. */
const ENTER_DELAY = 420;
const LEAVE_DELAY = 260;

export default function PipelineViewer() {
  const [view, setView] = useState<DesignersView>("facade");
  // The first load starts veiled and lifts once the facade reports ready.
  const [phase, setPhase] = useState<DesignersPhase>("entering");
  const [activeBlockId, setActiveBlockId] = useState<BuildingBlockId | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<BuildingBlockId | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSystemId, setActiveSystemId] = useState<PipelineSystemId | null>(null);
  const [isolated, setIsolated] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Hover previews a block in the panel without committing the camera to it.
  const shownBlock = findBuildingBlock(hoveredBlockId ?? activeBlockId);
  const selected = findPipelineElement(selectedId);

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  // The model and the block list both drive the highlight, so a leaving pointer
  // must not clear a highlight the other one has already taken over.
  const endHover = useCallback((blockId: BuildingBlockId) => {
    setHoveredBlockId((current) => (current === blockId ? null : current));
  }, []);

  const handleViewReady = useCallback(() => {
    setPhase((current) => (current === "entering" ? "idle" : current));
  }, []);

  function switchView(next: DesignersView, delay: number) {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setPhase("leaving");
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setView(next);
      setPhase("entering");
    }, delay);
  }

  function selectBlock(block: BuildingBlock | null) {
    setActiveBlockId(block?.id ?? null);

    if (block?.model) {
      switchView("floor", ENTER_DELAY);
    }
  }

  function leaveBlock() {
    setActiveBlockId(null);
    setHoveredBlockId(null);
    setSelectedId(null);
    setActiveSystemId(null);
    setIsolated(false);
    switchView("facade", LEAVE_DELAY);
  }

  function toggleSystem(systemId: PipelineSystemId) {
    const next = activeSystemId === systemId ? null : systemId;

    setActiveSystemId(next);

    if (next && selected?.system?.id !== next) {
      setSelectedId(null);
    }
  }

  function selectProduct(product: PipelineProduct) {
    setSelectedId(pipelineProductAnchor(product, activeSystemId));
  }

  function resetView() {
    setSelectedId(null);
    setActiveBlockId(null);
    setHoveredBlockId(null);
    setResetToken((token) => token + 1);
  }

  const onFacade = view === "facade";

  return (
    <section className="pipeline" data-header-theme="light">
      <div className="pipeline__stage" data-lenis-prevent>
        <BuildingScene
          view={view}
          phase={phase}
          activeBlockId={activeBlockId}
          hoveredBlockId={hoveredBlockId}
          onHoverBlock={setHoveredBlockId}
          onHoverBlockEnd={endHover}
          onSelectBlock={selectBlock}
          selectedElementId={selectedId}
          onSelectElement={setSelectedId}
          activeSystemId={activeSystemId}
          isolated={isolated}
          resetToken={resetToken}
          onViewReady={handleViewReady}
        />
      </div>

      <div className="pipeline__overlay">
        <div className="pipeline__intro">
          <p className="pipeline__eyebrow">
            {onFacade ? "Проектировщикам" : "Проектировщикам · Типовой этаж"}
          </p>
          <h1 className="pipeline__title">
            {onFacade ? "Интерактивная модель инженерных систем" : "Разводка ХВС и ГВС"}
          </h1>
          <p className="pipeline__note">
            {onFacade ? (
              // Hover is half of the interaction on a desktop and absent on a phone.
              <>
                <span className="pipeline__pointer">
                  Выберите блок здания: наведите курсор, чтобы подсветить его,
                  нажмите — чтобы открыть модель.
                </span>
                <span className="pipeline__touch">
                  Выберите блок здания: нажмите на нужный блок или на строку списка,
                  чтобы открыть модель.
                </span>
              </>
            ) : (
              "Конструкции показаны прозрачными, трубопроводы — в цветах систем. Выберите элемент, чтобы открыть описание."
            )}
          </p>
        </div>

        <div className="pipeline__tools">
          {onFacade ? null : (
            <>
              <button type="button" className="pipeline__tool" onClick={leaveBlock}>
                <span aria-hidden="true">←</span>
                Здание
              </button>

              {PIPELINE_SYSTEMS.map((system) => (
                <button
                  key={system.id}
                  type="button"
                  className={`pipeline__tool pipeline__tool--system${
                    activeSystemId === system.id ? " is-on" : ""
                  }`}
                  style={{ "--system-color": system.color } as CSSProperties}
                  aria-pressed={activeSystemId === system.id}
                  title={`${system.full} — показать только этот контур`}
                  onClick={() => toggleSystem(system.id)}
                >
                  <span className="pipeline__swatch" aria-hidden="true" />
                  {system.title}
                </button>
              ))}

              <button
                type="button"
                className={`pipeline__tool${isolated ? " is-active" : ""}`}
                aria-pressed={isolated}
                onClick={() => setIsolated((value) => !value)}
              >
                Только трубопровод
              </button>
            </>
          )}

          <button type="button" className="pipeline__tool" onClick={resetView}>
            Сбросить вид
          </button>
        </div>

        {onFacade ? (
          <aside className="pipeline__panel" aria-label="Блоки здания">
            <p className="pipeline__panel-label">Блоки здания</p>

            {/* Hovering a row lights the block in the model, and vice versa. */}
            <ul className="pipeline__list pipeline__list--blocks">
              {BUILDING_BLOCKS.map((block) => (
                <li key={block.id}>
                  <button
                    type="button"
                    className={`pipeline__item${block.id === activeBlockId ? " is-active" : ""}${
                      block.id === hoveredBlockId ? " is-hover" : ""
                    }`}
                    aria-current={block.id === activeBlockId}
                    // A tap must stay a tap: previewing on touch would resize the
                    // panel under the finger and the click would never land.
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") {
                        setHoveredBlockId(block.id);
                      }
                    }}
                    onPointerLeave={(event) => {
                      if (event.pointerType === "mouse") {
                        endHover(block.id);
                      }
                    }}
                    onFocus={(event) => {
                      if (event.currentTarget.matches(":focus-visible")) {
                        setHoveredBlockId(block.id);
                      }
                    }}
                    onBlur={() => endHover(block.id)}
                    onClick={() => selectBlock(block)}
                  >
                    <span className="pipeline__item-index">{block.index}</span>
                    <span className="pipeline__item-title">{block.title}</span>
                    {block.model ? null : (
                      <span className="pipeline__item-flag">скоро</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {/* Fixed slot: the panel is bottom-anchored, so a growing card would
                pull the rows out from under the cursor mid-hover. */}
            <div className="pipeline__slot">
              {shownBlock ? (
                <div className="pipeline__detail" key={shownBlock.id}>
                  <h2 className="pipeline__detail-title">{shownBlock.title}</h2>
                  <p className="pipeline__detail-text">{shownBlock.note}</p>
                  {shownBlock.model ? (
                    <button
                      type="button"
                      className="pipeline__detail-link"
                      onClick={() => selectBlock(shownBlock)}
                    >
                      Открыть модель
                      <span aria-hidden="true">→</span>
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="pipeline__detail-empty">
                  <span className="pipeline__pointer">
                    Наведите курсор на здание, чтобы увидеть доступные блоки.
                  </span>
                  <span className="pipeline__touch">
                    Выберите блок в списке или нажмите на здание.
                  </span>
                </p>
              )}
            </div>
          </aside>
        ) : (
          <aside className="pipeline__panel" aria-label="Элементы трубопровода">
            <p className="pipeline__panel-label">Элементы трубопровода</p>

            <ul className="pipeline__list">
              {PIPELINE_PRODUCTS.map((product) => {
                const count = activeSystemId
                  ? product.elements[activeSystemId].length
                  : product.elements.hot.length + product.elements.cold.length;

                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      className={`pipeline__item${
                        product.id === selected?.product.id ? " is-active" : ""
                      }`}
                      aria-current={product.id === selected?.product.id}
                      disabled={count === 0}
                      onClick={() => selectProduct(product)}
                    >
                      <span className="pipeline__item-index">{product.index}</span>
                      <span className="pipeline__item-title">{product.title}</span>
                      <span className="pipeline__item-flag">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selected ? (
              <div className="pipeline__detail pipeline__detail--product" key={selected.id}>
                <div className="pipeline__detail-head">
                  <p className="pipeline__detail-meta">
                    {selected.system ? (
                      <span
                        className="pipeline__badge"
                        style={{ "--system-color": selected.system.color } as CSSProperties}
                      >
                        <span className="pipeline__swatch" aria-hidden="true" />
                        {selected.system.title}
                      </span>
                    ) : null}
                    <span className="pipeline__detail-id">ID {selected.id}</span>
                  </p>

                  <h2 className="pipeline__detail-title">{selected.product.title}</h2>
                </div>

                <p className="pipeline__photo">
                  {selected.product.photo ? (
                    <img
                      src={publicPath(selected.product.photo)}
                      alt={selected.product.title}
                      className="pipeline__photo-image"
                    />
                  ) : (
                    <>
                      <img
                        src={publicPath("/brand/small-black-logo.svg")}
                        alt=""
                        width={71}
                        height={29}
                        className="pipeline__photo-mark"
                      />
                      <span className="pipeline__photo-text">no photo</span>
                    </>
                  )}
                </p>

                <p className="pipeline__detail-text">{selected.product.description}</p>

                <Link className="pipeline__detail-link" href={selected.product.href}>
                  Каталог продукции
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : (
              <p className="pipeline__detail-empty">
                Выберите трубу или соединительную деталь в модели.
              </p>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
