export type PipelineElement = {
  /** Revit element id carried in the glTF node name, e.g. "...KraftPipePlus SDR 7.4 [559123]". */
  id: string;
  index: string;
  title: string;
  product: string;
  description: string;
  href: string;
};

export const PIPELINE_ELEMENTS: PipelineElement[] = [
  {
    id: "559123",
    index: "01",
    title: "Стояк, нижний участок",
    product: "Труба HEISSKRAFT KraftPipePlus SDR 7.4",
    description:
      "Вертикальный транзитный участок стояка от нижележащего этажа до узла ответвления.",
    href: "/catalog?product=kraftpipe-plus-sdr-7-4",
  },
  {
    id: "559122",
    index: "02",
    title: "Тройник переходный",
    product: "Тройник переходный HEISSKRAFT",
    description:
      "Узел ответвления: отделяет поэтажную подводку от транзитной части стояка.",
    href: "/catalog?product=trojnik-perehodnyj",
  },
  {
    id: "553618",
    index: "03",
    title: "Стояк, верхний участок",
    product: "Труба HEISSKRAFT KraftPipePlus SDR 7.4",
    description:
      "Продолжение стояка выше узла ответвления — транзит на вышележащие этажи.",
    href: "/catalog?product=kraftpipe-plus-sdr-7-4",
  },
  {
    id: "559114",
    index: "04",
    title: "Поэтажная подводка",
    product: "Труба HEISSKRAFT KraftPipePlus SDR 7.4",
    description:
      "Горизонтальный участок от тройника до переходной муфты в пределах этажа.",
    href: "/catalog?product=kraftpipe-plus-sdr-7-4",
  },
  {
    id: "559132",
    index: "05",
    title: "Муфта переходная",
    product: "Муфта переходная HEISSKRAFT",
    description:
      "Переход между диаметрами на подводке перед подключением прибора.",
    href: "/catalog?product=mufta-perehodnaya",
  },
  {
    id: "559130",
    index: "06",
    title: "Выпуск к прибору",
    product: "Труба HEISSKRAFT KraftPipePlus SDR 7.4",
    description:
      "Короткий участок после муфты — подключение санитарного прибора.",
    href: "/catalog?product=kraftpipe-plus-sdr-7-4",
  },
];

const byId = new Map(PIPELINE_ELEMENTS.map((element) => [element.id, element]));

export function findPipelineElement(id: string | null) {
  return id ? (byId.get(id) ?? null) : null;
}

/**
 * Revit ids arrive as bracketed suffixes on glTF node names, but three.js
 * sanitizes names on load and drops the brackets ("... [559123]" becomes
 * "..._559123"), so the instance id is whatever digits trail the name.
 */
export function pipelineElementIdFromNode(name: string) {
  const id = /(\d+)\]?$/.exec(name)?.[1];

  return id && byId.has(id) ? id : null;
}
