"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  PIPELINE_ELEMENTS,
  findPipelineElement,
} from "@/sections/designers/pipeline-data";

const PipelineScene = dynamic(() => import("@/sections/designers/PipelineScene"), {
  ssr: false,
});

export default function PipelineViewer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isolated, setIsolated] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  const selected = findPipelineElement(selectedId);

  function resetView() {
    setSelectedId(null);
    setResetToken((token) => token + 1);
  }

  return (
    <section className="pipeline" data-header-theme="light">
      <div className="pipeline__stage" data-lenis-prevent>
        <PipelineScene
          selectedId={selectedId}
          isolated={isolated}
          resetToken={resetToken}
          onSelect={setSelectedId}
        />
      </div>

      <div className="pipeline__overlay">
        <div className="pipeline__intro">
          <p className="pipeline__eyebrow">Проектировщикам</p>
          <h1 className="pipeline__title">Интерактивная модель инженерных систем</h1>
          <p className="pipeline__note">
            Несущие конструкции показаны прозрачными. Синим выделен трубопровод
            HEISSKRAFT — выберите элемент, чтобы открыть описание.
          </p>
        </div>

        <div className="pipeline__tools">
          <button
            type="button"
            className={`pipeline__tool${isolated ? " is-active" : ""}`}
            aria-pressed={isolated}
            onClick={() => setIsolated((value) => !value)}
          >
            Только трубопровод
          </button>
          <button type="button" className="pipeline__tool" onClick={resetView}>
            Сбросить вид
          </button>
        </div>

        <aside className="pipeline__panel" aria-label="Элементы трубопровода">
          <p className="pipeline__panel-label">Элементы трубопровода</p>

          <ul className="pipeline__list">
            {PIPELINE_ELEMENTS.map((element) => (
              <li key={element.id}>
                <button
                  type="button"
                  className={`pipeline__item${element.id === selectedId ? " is-active" : ""}`}
                  aria-current={element.id === selectedId}
                  aria-label={element.title}
                  onClick={() => setSelectedId(element.id)}
                >
                  <span className="pipeline__item-index">{element.index}</span>
                  <span className="pipeline__item-title">{element.title}</span>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <div className="pipeline__detail" key={selected.id}>
              <h2 className="pipeline__detail-title">{selected.title}</h2>
              <p className="pipeline__detail-product">{selected.product}</p>
              <p className="pipeline__detail-text">{selected.description}</p>
              <Link className="pipeline__detail-link" href={selected.href}>
                Подробнее
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <p className="pipeline__detail-empty">
              Ничего не выбрано. Выберите трубу, тройник или муфту в модели.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
