import type { SheetData } from "./types";

function cell(
  r: number,
  c: number,
  v: string | number,
  opts?: {
    bold?: boolean;
    color?: string;
    bg?: string;
    align?: string;
  }
) {
  const m: Record<string, unknown> = {
    v,
    m: String(v),
    ct: { fa: "General", t: "g" },
  };
  if (opts?.bold) m.bl = 1;
  if (opts?.color) m.fc = opts.color;
  if (opts?.bg) m.bg = opts.bg;
  if (opts?.align) m.ht = opts.align === "center" ? 0 : 1;
  return { r, c, v: m };
}

const sheet1Cells = [
  cell(0, 0, "Sample Price List — Apple & GPU", { bold: true }),
  cell(1, 0, "Product", { bold: true, bg: "#dbeafe" }),
  cell(1, 1, "USD", { bold: true, bg: "#dbeafe", align: "center" }),
  cell(1, 2, "RMB", { bold: true, bg: "#dbeafe", align: "center" }),
  cell(1, 3, "HKD", { bold: true, bg: "#dbeafe", align: "center" }),
  cell(1, 4, "Remark", { bold: true, bg: "#dbeafe" }),
  cell(2, 0, "iPad Devices", { bold: true, bg: "#fef3c7" }),
  cell(3, 0, "A16 11\" 128G"),
  cell(3, 1, 420, { color: "#dc2626", align: "center" }),
  cell(3, 2, 2801, { align: "center" }),
  cell(3, 3, 3276, { align: "center" }),
  cell(3, 4, "Bulk price"),
  cell(4, 0, "A16 11\" 256G"),
  cell(4, 1, 480, { color: "#dc2626", align: "center" }),
  cell(4, 2, 3202, { align: "center" }),
  cell(4, 3, 3744, { align: "center" }),
  cell(4, 4, ""),
  cell(5, 0, "High-end GPU", { bold: true, bg: "#fef3c7" }),
  cell(6, 0, "RTX 5090 OC"),
  cell(6, 1, 2100, { color: "#dc2626", align: "center" }),
  cell(6, 2, 14007, { align: "center" }),
  cell(6, 3, 16380, { align: "center" }),
  cell(6, 4, "Contact for stock", { bg: "#fef08a" }),
  cell(7, 0, "RTX 5080"),
  cell(7, 1, 1200, { color: "#dc2626", align: "center" }),
  cell(7, 2, 8004, { align: "center" }),
  cell(7, 3, 9360, { align: "center" }),
  cell(7, 4, "Brand new"),
  cell(8, 0, "SSD Storage", { bold: true, bg: "#fef3c7" }),
  cell(9, 0, "1TB NVMe Gen4"),
  cell(9, 1, 85, { color: "#dc2626", align: "center" }),
  cell(9, 2, 567, { align: "center" }),
  cell(9, 3, 663, { align: "center" }),
  cell(9, 4, ""),
  cell(10, 0, "2TB NVMe Gen4"),
  cell(10, 1, 145, { color: "#dc2626", align: "center" }),
  cell(10, 2, 967, { align: "center" }),
  cell(10, 3, 1131, { align: "center" }),
  cell(10, 4, ""),
];

const sheet2Cells = [
  cell(0, 0, "Sample Price List — Phones & DJI", { bold: true }),
  cell(1, 0, "Product", { bold: true, bg: "#dbeafe" }),
  cell(1, 1, "USD", { bold: true, bg: "#dbeafe", align: "center" }),
  cell(1, 2, "RMB", { bold: true, bg: "#dbeafe", align: "center" }),
  cell(1, 3, "Remark", { bold: true, bg: "#dbeafe" }),
  cell(2, 0, "Unlocked Phones", { bold: true, bg: "#fef3c7" }),
  cell(3, 0, "iPhone 16 Pro 256G"),
  cell(3, 1, 980, { color: "#dc2626", align: "center" }),
  cell(3, 2, 6537, { align: "center" }),
  cell(3, 3, "US version"),
  cell(4, 0, "iPhone 15 128G"),
  cell(4, 1, 520, { color: "#dc2626", align: "center" }),
  cell(4, 2, 3468, { align: "center" }),
  cell(4, 3, ""),
  cell(5, 0, "DJI", { bold: true, bg: "#fef3c7" }),
  cell(6, 0, "Mini 4 Pro"),
  cell(6, 1, 680, { color: "#dc2626", align: "center" }),
  cell(6, 2, 4536, { align: "center" }),
  cell(6, 3, "Fly More Combo", { bg: "#bbf7d0" }),
  cell(7, 0, "Air 3S"),
  cell(7, 1, 950, { color: "#dc2626", align: "center" }),
  cell(7, 2, 6337, { align: "center" }),
  cell(7, 3, ""),
];

export const defaultSheets: SheetData[] = [
  {
    name: "Apple & GPU",
    id: "sheet-apple-gpu",
    status: 1,
    order: 0,
    row: 60,
    column: 12,
    celldata: sheet1Cells,
    config: {
      columnlen: { "0": 160, "1": 70, "2": 70, "3": 70, "4": 160 },
      merge: {
        "0_0": { r: 0, c: 0, rs: 1, cs: 5 },
        "2_0": { r: 2, c: 0, rs: 1, cs: 5 },
        "5_0": { r: 5, c: 0, rs: 1, cs: 5 },
        "8_0": { r: 8, c: 0, rs: 1, cs: 5 },
      },
    },
  },
  {
    name: "Phones & DJI",
    id: "sheet-phones-dji",
    status: 0,
    order: 1,
    row: 60,
    column: 10,
    celldata: sheet2Cells,
    config: {
      columnlen: { "0": 180, "1": 70, "2": 70, "3": 160 },
      merge: {
        "0_0": { r: 0, c: 0, rs: 1, cs: 4 },
        "2_0": { r: 2, c: 0, rs: 1, cs: 4 },
        "5_0": { r: 5, c: 0, rs: 1, cs: 4 },
      },
    },
  },
];
