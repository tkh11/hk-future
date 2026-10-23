import type { FireStation, ProductDescription } from "./types";

export const coolingProducts = [
  { id: "pipes", label: "Труба ClimatFaser", title: "Трубопроводные системы ClimatFaser", text: "Трубы из термостабилизированного полипропилена PP-RCT со стекловолокном соединяют узлы системы охлаждения. Синим показана подача хладоносителя, красным — контур отвода тепла.", image: "/images/data-centers/pipes.jpg", alt: "Полипропиленовые трубы HEISSKRAFT PP-RCT со стекловолокном", badge: "/images/data-centers/climatfaser-temperature-range.png" },
  { id: "pumps", label: "Насосы HIP", title: "Серия циркуляционных насосов HIP", detail: "Конструкция «ин-лайн»", text: "Насосы поддерживают циркуляцию теплоносителя между источником холода и потребителями. Мягкая пульсация показывает сердце инженерной системы.", image: "/images/data-centers/pump.jpg", alt: "Циркуляционный насос HEISSKRAFT" },
  { id: "valves", label: "Арматура HEISSKRAFT", title: "Запорно-регулирующая арматура HEISSKRAFT", text: "Шаровые краны позволяют отключать отдельные участки контура для обслуживания оборудования. На модели они выделены жёлтым цветом.", image: "/images/data-centers/valve.jpg", alt: "Дисковый затвор HEISSKRAFT DN100 PN16" },
] satisfies ProductDescription<"pipes" | "pumps" | "valves">[];

export const fireProducts = [
  { id: "station", label: "Насосная станция", title: "Подача воды в систему", text: "Насосная станция объединяет насосы, коллекторы и шкаф управления для подачи воды в систему пожаротушения.", image: "/images/fire-suppression/station-fpa.png", alt: "Станция пожаротушения HEISSKRAFT HK-Boost FPA" },
  { id: "pipework", label: "Трубопровод FireOff", title: "Распределительная сеть FireOff", text: "Трубопровод FireOff распределяет воду от насосной станции к спринклерам и пожарным кранам.", image: "/images/fire-suppression/pipe.png", alt: "Труба HEISSKRAFT FireOff" },
  { id: "sprinkler", label: "Узел спринклера", title: "От трубы — к оросителю", text: "Вварное седло и соединительный участок подключают спринклер к распределительной трубе FireOff.", image: "/images/fire-suppression/saddle.jpg", alt: "Вварное седло HEISSKRAFT FireOff для подключения ответвления" },
  { id: "hydrants", label: "Пожарные краны", title: "Подключения к пожарным кранам", text: "Вертикальный отвод соединяет трубопровод FireOff с запорным вентилем и пожарным рукавом в шкафу.", image: "/brand/small-black-logo.svg", alt: "HEISSKRAFT" },
  { id: "flange", label: "Фланцевый переход", title: "Соединение металла и полипропилена", text: "Фланец соединяет металлический коллектор насосной станции с полипропиленовым трубопроводом FireOff.", image: "/brand/small-black-logo.svg", alt: "HEISSKRAFT" },
] satisfies ProductDescription<"station" | "pipework" | "sprinkler" | "hydrants" | "flange">[];

export const fireStations = [
  { id: "fpa", name: "HK-Boost FPA", application: "Автоматические установки пожаротушения", description: "Насосные установки для автоматических систем водяного и пенного пожаротушения. Объединяют насосы HMV, коллекторы, арматуру и систему управления на общей раме." },
  { id: "fpv", name: "HK-Boost FPV", application: "Внутренний противопожарный водопровод", description: "Насосные установки для внутреннего противопожарного водопровода. Насосы HMV, трубопроводная обвязка и система управления собраны в единый комплект." },
] satisfies FireStation[];
