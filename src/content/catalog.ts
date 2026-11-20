import type { CatalogNode } from "@/lib/catalog";

export const catalog: CatalogNode[] = [
  {
    slug: "pipelines", title: "Трубопроводные системы", art: "pipes",
    children: [
      { slug: "therm", title: "Heisskraft Therm", art: "pipes", image: "/images/catalog/therm.jpg", description: "Трубы и фитинги из полипропилена PP-R/PP-R CT для систем ХВС/ГВС/отопления/холодоснабжения" },
      { slug: "multilayer", title: "Heisskraft Multilayer", art: "layers", image: "/images/catalog/multilayer.jpg", description: "Трубы из термостойкого полиэтилена PE-RT тип I, PE-RT тип II и аксиальные фитинги для систем отопления" },
      { slug: "hdpe", title: "Heisskraft HDPE", art: "pipes", image: "/images/catalog/hdpe.jpg", description: "Трубы из полиэтилена высокой плотности низкого давления (PE100) и компрессионные фитинги к ним для систем технического/хозяйственно-бытового водоснабжения" },
      { slug: "fireoff", title: "Heisskraft FireOff", art: "pipes", image: "/images/catalog/fireoff.jpg", description: "Трубы и фитинги из огнестойкого компаунда полипропилена (PP-R-Compylen) для систем пожаротушения" },
      { slug: "black-pipe", title: "Heisskraft Black Pipe", art: "pipes", image: "/images/catalog/black-pipe.jpg", tone: "light", description: "Трубы и фитинги из полипропилена (PP) для систем промышленного/хозяйственно-бытового водоотведения" },
    ],
  },
  {
    slug: "pumps", title: "Насосное оборудование", art: "pump",
    children: [
      { slug: "pressure-boosting", title: "Повышение давления", art: "pump", image: "/images/catalog/pumps/pressure-boosting.webp", description: "Насосы для подачи воды и повышения давления в системах водоснабжения" },
      { slug: "circulation", title: "Циркуляционные", art: "circulation", image: "/images/catalog/pumps/circulation.webp", description: "Насосы для циркуляции теплоносителя в системах отопления и охлаждения" },
      { slug: "borehole", title: "Скважинные", art: "borehole", image: "/images/catalog/pumps/borehole.webp", description: "Погружные насосы для подъёма воды из скважин и подачи в систему водоснабжения" },
      { slug: "drainage", title: "Дренажные", art: "drainage", image: "/images/catalog/pumps/drainage.webp", description: "Насосы для отвода дренажных вод и осушения затопленных помещений" },
      { slug: "sewage", title: "Канализационные", art: "drainage", image: "/images/catalog/pumps/sewage.webp", description: "Погружные насосы для перекачивания сточных вод в системах канализации" },
      { slug: "stations", title: "Насосные станции", art: "station", image: "/images/catalog/pumps/stations.webp", description: "Комплектные установки для водоснабжения, повышения давления и пожаротушения" },
      { slug: "automation", title: "Автоматика / принадлежности", art: "automation", image: "/images/catalog/pumps/automation.webp", description: "Устройства управления, защиты и контроля работы насосного оборудования" },
    ],
  },
  { slug: "auxiliary", title: "Вспомогательное оборудование", art: "auxiliary" },
];

