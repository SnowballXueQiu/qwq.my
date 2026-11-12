import type { L10n } from "@/lib/i18n";

export type Place = {
  name: L10n;
  lon: number;
  lat: number;
  /** Where the label sits relative to the pin, in degrees (keeps clusters readable). */
  label: [number, number];
};

// 去过的地方：每个地方插一根针，标签按偏移量错开。
export const places: Place[] = [
  { name: { zh: "北京", en: "Beijing" }, lon: 116.4, lat: 39.9, label: [-2.4, 2.8] },
  { name: { zh: "天津", en: "Tianjin" }, lon: 117.2, lat: 39.13, label: [3.6, -2.4] },
  { name: { zh: "唐山", en: "Tangshan" }, lon: 118.18, lat: 39.63, label: [3.0, 2.9] },
  { name: { zh: "太原", en: "Taiyuan" }, lon: 112.55, lat: 37.87, label: [-3.4, -0.6] },
  { name: { zh: "内蒙古", en: "Inner Mongolia" }, lon: 111.75, lat: 40.84, label: [-3.6, 2.2] },
  { name: { zh: "青岛", en: "Qingdao" }, lon: 120.38, lat: 36.07, label: [3.4, -0.8] },
  { name: { zh: "上海", en: "Shanghai" }, lon: 121.47, lat: 31.23, label: [2.8, 0.5] },
  { name: { zh: "杭州", en: "Hangzhou" }, lon: 120.16, lat: 30.27, label: [2.2, -1.9] },
  { name: { zh: "广州", en: "Guangzhou" }, lon: 113.26, lat: 23.13, label: [-3.2, 2.0] },
  { name: { zh: "中山", en: "Zhongshan" }, lon: 113.39, lat: 22.52, label: [-3.8, -0.4] },
  { name: { zh: "珠海", en: "Zhuhai" }, lon: 113.58, lat: 22.27, label: [-2.4, -2.8] },
  { name: { zh: "澳门", en: "Macau" }, lon: 113.55, lat: 22.2, label: [0.6, -3.8] },
  { name: { zh: "深圳", en: "Shenzhen" }, lon: 114.06, lat: 22.54, label: [3.4, 1.4] },
  { name: { zh: "香港", en: "Hong Kong" }, lon: 114.17, lat: 22.32, label: [3.4, -1.6] },
];

/** Provincial-level divisions I've been to (raised and drawn in red). */
export const visitedProvinces = new Set([
  "110000", // 北京
  "120000", // 天津
  "130000", // 河北（唐山）
  "140000", // 山西（太原）
  "150000", // 内蒙古
  "310000", // 上海
  "330000", // 浙江（杭州）
  "370000", // 山东（青岛）
  "440000", // 广东（广州、深圳、珠海、中山）
  "810000", // 香港
  "820000", // 澳门
]);

/** All provincial-level divisions on the map: 23 provinces, 5 autonomous regions, 4 municipalities, 2 SARs. */
export const PROVINCE_COUNT = 34;
