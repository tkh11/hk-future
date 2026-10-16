import type { FirePart } from "./fireoff-model";

// World-space anchors stay attached to the same physical nodes in every camera view.
export const FIRE_PARTS = [
  { id: "station", label: "Насосная станция", title: "Подача воды в систему", text: "Насосная станция объединяет насосы, коллекторы и шкаф управления для подачи воды в систему пожаротушения.", image: "/images/fire-suppression/station-fpa.png", alt: "Станция пожаротушения HEISSKRAFT HK-Boost FPA", anchor: [-4.25, -3, -3.2], offset: [-42, -48] },
  { id: "pipework", label: "Трубопровод FireOff", title: "Распределительная сеть FireOff", text: "Трубопровод FireOff распределяет воду от насосной станции к спринклерам и пожарным кранам.", image: "/images/fire-suppression/pipe.png", alt: "Труба HEISSKRAFT FireOff", anchor: [7.5, -.9, -9], offset: [-28, -52] },
  { id: "sprinkler", label: "Узел спринклера", title: "От трубы — к оросителю", text: "Вварное седло и соединительный участок подключают спринклер к распределительной трубе FireOff.", image: "/images/fire-suppression/saddle.jpg", alt: "Вварное седло HEISSKRAFT FireOff для подключения ответвления", anchor: [7.5, -.64, -4.5], offset: [42, -44] },
  { id: "hydrants", label: "Пожарные краны", title: "Подключения к пожарным кранам", text: "Вертикальный отвод соединяет трубопровод FireOff с запорным вентилем и пожарным рукавом в шкафу.", image: "/brand/small-black-logo.svg", alt: "HEISSKRAFT", anchor: [17.79, -3.28, -6.5], offset: [34, -38] },
  { id: "flange", label: "Фланцевый переход", title: "Соединение металла и полипропилена", text: "Фланец соединяет металлический коллектор насосной станции с полипропиленовым трубопроводом FireOff.", image: "/brand/small-black-logo.svg", alt: "HEISSKRAFT", anchor: [-2.99, -3.85, -4.1], offset: [40, 44] },
] as const satisfies readonly { id: FirePart; label: string; title: string; text: string; image: string; alt: string; anchor: readonly [number, number, number]; offset: readonly [number, number] }[];
