# Sitebook — Construction cost-control MVP (V1 prototype)

Project → BOQ → Estimate → Procurement → Site → Measurements → Billing → Cost → Profit forecast → Alerts.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 and pick a demo user (Owner, PM, Site Engineer, Procurement, Finance).

## How it is built

- **Next.js 16 + Tailwind 4**, client-rendered, mobile-first (bottom nav on phones, sidebar on desktop).
- **Data** lives in the browser (`localStorage`) for this prototype — `src/lib/store.tsx`. Every write goes
  through `add / patch / remove`, which also writes the audit trail. Swapping in Supabase means replacing this file.
- **Seed data** (`src/lib/seed.ts`) generates 5 internally consistent projects relative to today. Reset from *More → Demo data*.
- **Calculation engine** (`src/lib/calc.ts`) derives every number: progress, estimated vs expected vs committed vs actual,
  forecast cost/profit/margin and the "why the forecast changed" drivers.
- **Alert engine** (`src/lib/alerts.ts`) — the 7 V1 rule types with thresholds in `THRESHOLDS`.
- **Excel** import/export via SheetJS (`src/lib/excel.ts`).

## Key formulas

- Progress = Σ(measured qty × BOQ rate) / BOQ value
- Expected cost at progress = Σ estimate line × progress of its linked BOQ item
- Material actual = consumed qty × average purchase rate (unused material is stock, not cost)
- Forecast final cost = actual + estimate-to-complete (+ overrun rate if a head is running over, capped 30%) + contingency
- Forecast profit = contract − forecast cost; margin = profit / contract
