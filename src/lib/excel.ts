"use client";

/** Excel import/export helpers (SheetJS is loaded lazily). */
export async function exportXlsx(filename: string, sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    const keys = Object.keys(s.rows[0] ?? {});
    ws["!cols"] = keys.map((k) => ({ wch: Math.min(48, Math.max(10, k.length + 2, ...s.rows.map((r) => String(r[k] ?? "").length))) }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

export interface ImportedBOQRow {
  itemNo: string;
  category: string;
  description: string;
  unit: string;
  qty: number;
  rate: number;
}

const pick = (row: Record<string, unknown>, names: string[]) => {
  for (const key of Object.keys(row)) {
    const k = key.toLowerCase().replace(/[^a-z]/g, "");
    if (names.includes(k)) return row[key];
  }
  return undefined;
};

/** Reads "Item No | Description | Qty | Unit | Rate" (+ optional Category) from the first sheet. */
export async function parseBOQ(file: File): Promise<{ rows: ImportedBOQRow[]; skipped: number }> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  const rows: ImportedBOQRow[] = [];
  let skipped = 0;
  for (const r of raw) {
    const description = String(pick(r, ["description", "desc", "itemdescription", "particulars", "work"]) ?? "").trim();
    const qty = Number(String(pick(r, ["qty", "quantity"]) ?? "").replace(/,/g, ""));
    const rate = Number(String(pick(r, ["rate", "unitrate"]) ?? "").replace(/[,₹]/g, ""));
    if (!description || !isFinite(qty) || !isFinite(rate) || qty <= 0) {
      skipped++;
      continue;
    }
    rows.push({
      itemNo: String(pick(r, ["itemno", "item", "sno", "slno", "no"]) ?? "").trim() || String(rows.length + 1),
      category: String(pick(r, ["category", "trade", "head", "group"]) ?? "").trim() || guessCategory(description),
      description,
      unit: String(pick(r, ["unit", "uom"]) ?? "").trim() || "nos",
      qty,
      rate,
    });
  }
  return { rows, skipped };
}

function guessCategory(d: string): string {
  const s = d.toLowerCase();
  const map: [string, string][] = [
    ["excavat", "Earthwork"], ["earth", "Earthwork"], ["pcc", "PCC"], ["rcc", "RCC"], ["concrete", "RCC"],
    ["steel", "Steel"], ["reinforce", "Steel"], ["shutter", "Formwork"], ["formwork", "Formwork"],
    ["brick", "Masonry"], ["block", "Masonry"], ["plaster", "Plaster"], ["tile", "Flooring"], ["floor", "Flooring"],
    ["paint", "Painting"], ["plumb", "Plumbing"], ["electric", "Electrical"], ["wiring", "Electrical"],
    ["road", "Roads"], ["bitumin", "Roads"], ["drain", "Drainage"],
  ];
  return map.find(([k]) => s.includes(k))?.[1] ?? "Other";
}
