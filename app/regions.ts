// Region layout metadata only. All observations and metrics come from the backend.
export type Cluster = {
  id: number;
  name: string;
  country: string;
  disease: string;
  crop: string;
  count: number;
  x: number;
  y: number;
  level: 1 | 2 | 3 | 4;
};
export type Region = {
  id: string;
  label: string;
  short: string;
  hub: string;
  hubAt: [number, number];
  districts: number;
  outline: string;
  kpi: {
    detections: [string, string, string];
    prevented: string;
    saved: string;
  };
  clusters: Cluster[];
};

export const regions: Region[] = [
  {
    id: "dry-corridor",
    label: "Central American Dry Corridor",
    short: "Dry Corridor",
    hub: "TEGUCIGALPA",
    hubAt: [55, 58],
    districts: 6,
    outline:
      "M70 120L180 70 290 96 380 40 470 82 560 60 650 120 735 180 700 250 742 330 650 360 600 450 480 470 395 520 300 470 200 492 120 420 60 330 95 250 40 190Z",
    kpi: { detections: ["0", "0", "0"], prevented: "0", saved: "$0" },
    clusters: [],
  },
  {
    id: "east-africa",
    label: "East African Highlands",
    short: "East Africa",
    hub: "NAIROBI",
    hubAt: [60, 70],
    districts: 6,
    outline:
      "M120 60L260 30 360 80 470 40 590 90 690 70 740 170 690 260 735 350 660 420 560 400 500 500 380 470 290 520 210 450 110 470 70 380 110 300 50 220 100 150Z",
    kpi: { detections: ["0", "0", "0"], prevented: "0", saved: "$0" },
    clusters: [],
  },
  {
    id: "indo-gangetic",
    label: "Indo-Gangetic Plain",
    short: "Indo-Gangetic",
    hub: "PATNA",
    hubAt: [66, 66],
    districts: 6,
    outline:
      "M40 160L150 90 280 110 400 70 520 120 640 100 760 170 720 250 760 320 640 360 560 430 440 400 340 470 230 430 130 450 80 360 30 280Z",
    kpi: { detections: ["0", "0", "0"], prevented: "0", saved: "$0" },
    clusters: [],
  },
  {
    id: "mekong",
    label: "Lower Mekong Basin",
    short: "Mekong",
    hub: "PHNOM PENH",
    hubAt: [40, 56],
    districts: 6,
    outline:
      "M200 30L330 60 420 30 520 90 600 150 660 240 700 330 640 400 600 500 480 520 400 460 300 500 230 430 140 400 90 300 140 220 100 140Z",
    kpi: { detections: ["0", "0", "0"], prevented: "0", saved: "$0" },
    clusters: [],
  },
];

export const money = (n: number) =>
  "$" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
