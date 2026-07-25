"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import XLSX, { type CellStyle } from "xlsx-js-style";
import { jsPDF } from "jspdf";

export interface ReportPrediction {
  productName: string;
  category: string;
  predictedSales: number;
  salesPotentialScore: number;
  salesPotentialCategory: string;
  discountedPrice: number;
  priceCategory: string;
}

export interface ReportSeasonalTrend {
  label: string;
  predictedSales: number;
}

export interface ReportSummary {
  totalSales: number;
  totalPredictedSales?: number;
  totalProducts: number;
  avgPrice: number;
  growthPct: number;
}

export interface ReportChartData {
  label: string;
  currentSales: number;
  predictedSales: number;
  products: number;
}

export interface ReportData {
  reportTitle: string;
  filePrefix: string;
  category: { name: string; tag?: string; description?: string };
  summary?: ReportSummary;
  insights?: string[];
  chartData?: ReportChartData[];
  prediction?: ReportPrediction;
  seasonalTrend?: ReportSeasonalTrend[];
  predictionInputs?: Record<string, string | number | boolean>;
}

interface ReportGeneratorProps {
  getReportData: () => ReportData;
  className?: string;
}

/** Canonical month order for a consistent dataset table (Jan → Dec). */
const MONTH_ORDER = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/* ─── Excel styles (xlsx-js-style) ─── */
const border: NonNullable<CellStyle["border"]> = {
  top: { style: "thin", color: { rgb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { rgb: "FFCBD5E1" } },
  left: { style: "thin", color: { rgb: "FFCBD5E1" } },
  right: { style: "thin", color: { rgb: "FFCBD5E1" } },
};

const XL: Record<string, CellStyle> = {
  coverBanner: {
    font: { bold: true, sz: 18, color: { rgb: "FFFFFFFF" } },
    fill: { fgColor: { rgb: "FF0F172A" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border,
  },
  coverTitle: {
    font: { bold: true, sz: 14, color: { rgb: "FF0F172A" } },
    fill: { fgColor: { rgb: "FFE2E8F0" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border,
  },
  coverMeta: {
    font: { sz: 10, color: { rgb: "FF64748B" }, italic: true },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border,
  },
  sectionTitle: {
    font: { bold: true, sz: 12, color: { rgb: "FF0F172A" } },
    fill: { fgColor: { rgb: "FFF1F5F9" } },
    alignment: { vertical: "center", wrapText: true },
    border,
  },
  tableHead: {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFFFF" } },
    fill: { fgColor: { rgb: "FF334155" } },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
    border,
  },
  tableCell: {
    font: { sz: 11, color: { rgb: "FF1E293B" } },
    alignment: { vertical: "top", wrapText: true },
    border,
  },
  tableCellAlt: {
    font: { sz: 11, color: { rgb: "FF1E293B" } },
    fill: { fgColor: { rgb: "FFF8FAFC" } },
    alignment: { vertical: "top", wrapText: true },
    border,
  },
  labelStrong: {
    font: { bold: true, sz: 11, color: { rgb: "FF475569" } },
    alignment: { vertical: "top", wrapText: true },
    border,
  },
  note: {
    font: { sz: 9, color: { rgb: "FF94A3B8" }, italic: true },
    alignment: { vertical: "top", wrapText: true },
    border,
  },
};

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

function applyRowStyle(
  ws: XLSX.WorkSheet,
  row: number,
  c0: number,
  c1: number,
  style: CellStyle,
) {
  for (let c = c0; c <= c1; c += 1) {
    const addr = XLSX.utils.encode_cell({ r: row, c });
    const cell = ws[addr];
    if (cell) cell.s = style;
  }
}

function stripeTableBody(
  ws: XLSX.WorkSheet,
  headerRow: number,
  lastRow: number,
  lastCol: number,
  base: CellStyle = XL.tableCell,
  alt: CellStyle = XL.tableCellAlt,
) {
  for (let r = headerRow + 1; r <= lastRow; r += 1) {
    const useAlt = (r - headerRow) % 2 === 0;
    for (let c = 0; c <= lastCol; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell) cell.s = useAlt ? alt : base;
    }
  }
}

function expandRef(ws: XLSX.WorkSheet, r: number, c: number) {
  const cur = ws["!ref"]
    ? XLSX.utils.decode_range(ws["!ref"])
    : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  const e = {
    r: Math.max(cur.e.r, r),
    c: Math.max(cur.e.c, c),
  };
  ws["!ref"] = XLSX.utils.encode_range({ s: cur.s, e });
}

export function ReportGenerator({
  getReportData,
  className,
}: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const timestamp = () =>
    new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safePrefix = (prefix: string) =>
    prefix.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const generateExcel = () => {
    const data = getReportData();
    const wb = XLSX.utils.book_new();
    const generatedAt = new Date().toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const fmtInt = "#,##0";
    const fmtPkr = "\"PKR \"#,##0";

    // ── 1) Sales_by_month — dataset-style table (opened first) ───────
    const chartMap = new Map(
      (data.chartData ?? []).map((r) => [r.label, r] as const),
    );
    const scenarioMap = new Map(
      (data.seasonalTrend ?? []).map((r) => [r.label, r] as const),
    );
    const scenarioTotal = (data.seasonalTrend ?? []).reduce(
      (s, r) => s + r.predictedSales,
      0,
    );

    const salesHeaders = [
      "Month",
      "Dataset — current sales (units)",
      "Dataset — predicted sales (units)",
      "Dataset — product rows",
      "Your scenario — predicted sales (units)",
      "Your scenario — share of year",
    ];

    const salesBody = MONTH_ORDER.map((m) => {
      const ch = chartMap.get(m);
      const sc = scenarioMap.get(m);
      const scenUnits = sc?.predictedSales;
      const share =
        scenarioTotal > 0 && scenUnits != null
          ? scenUnits / scenarioTotal
          : "";
      return [
        m,
        ch?.currentSales ?? "",
        ch?.predictedSales ?? "",
        ch?.products ?? "",
        scenUnits ?? "",
        share === "" ? "" : share,
      ];
    });

    const salesRows: (string | number)[][] = [
      [
        `${data.category.name} · ${data.reportTitle} · Generated ${generatedAt}`,
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "Each row is one calendar month. Dataset columns come from the loaded category; scenario columns appear after Run Prediction.",
        "",
        "",
        "",
        "",
        "",
      ],
      salesHeaders,
      ...salesBody,
    ];

    const salesLastCol = 5;
    const salesHeaderRow = 2;
    const salesDataEndRow = salesHeaderRow + MONTH_ORDER.length;

    const wsSales = XLSX.utils.aoa_to_sheet(salesRows);
    wsSales["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: salesLastCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: salesLastCol } },
    ];
    setColWidths(wsSales, [8, 26, 28, 18, 30, 22]);
    const sm0 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    const sm1 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (wsSales[sm0]) wsSales[sm0].s = XL.coverTitle;
    if (wsSales[sm1]) wsSales[sm1].s = XL.note;
    applyRowStyle(wsSales, salesHeaderRow, 0, salesLastCol, XL.tableHead);
    stripeTableBody(wsSales, salesHeaderRow, salesDataEndRow, salesLastCol);
    for (let r = salesHeaderRow + 1; r <= salesDataEndRow; r += 1) {
      for (const c of [1, 2, 3, 4]) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = wsSales[addr];
        if (cell?.t === "n") cell.z = fmtInt;
      }
      const pAddr = XLSX.utils.encode_cell({ r, c: 5 });
      const pCell = wsSales[pAddr];
      if (pCell?.t === "n") pCell.z = "0.0%";
    }
    expandRef(wsSales, salesRows.length - 1, salesLastCol);
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales_by_month");

    // ── Summary ───────────────────────────────────────────────────
    const summaryHeaderRow = 3;
    const summaryRows: (string | number)[][] = [
      ["Category snapshot"],
      [data.category.name],
      [`Generated: ${generatedAt}`],
      [],
      ["Metric", "Value", "Notes"],
      [
        "Total sales (units)",
        data.summary?.totalSales ?? 0,
        "Sum of current-period sales in the dataset for this category",
      ],
      [
        "Predicted sales (units)",
        data.summary?.totalPredictedSales ?? 0,
        "Model forecast total for the same listings",
      ],
      [
        "Products in dataset",
        data.summary?.totalProducts?.toLocaleString() ?? "—",
        "Rows used for aggregates",
      ],
      [
        "Average price (PKR)",
        data.summary?.avgPrice ?? 0,
        "Mean list price",
      ],
      [
        "Predicted growth vs current",
        data.summary != null
          ? `${data.summary.growthPct >= 0 ? "+" : ""}${data.summary.growthPct}%`
          : "—",
        "Percent change forecast vs historical total",
      ],
      [],
      [
        "Tip",
        "",
        "Open the Sales_by_month sheet for the month × sales table. Use Prediction for full scenario inputs.",
      ],
    ];
    const wsSum = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSum["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    ];
    setColWidths(wsSum, [34, 22, 48]);
    const s0 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    const s1 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    const s2 = XLSX.utils.encode_cell({ r: 2, c: 0 });
    if (wsSum[s0]) wsSum[s0].s = XL.coverBanner;
    if (wsSum[s1]) wsSum[s1].s = XL.coverTitle;
    if (wsSum[s2]) wsSum[s2].s = XL.coverMeta;
    applyRowStyle(wsSum, summaryHeaderRow, 0, 2, XL.tableHead);
    stripeTableBody(wsSum, summaryHeaderRow, 10, 2);
    const noteRow = 12;
    applyRowStyle(wsSum, noteRow, 0, 2, XL.note);
    // Number formats (fmtInt / fmtPkr defined at start of generateExcel)
    const metricValueCells = [5, 6, 8];
    metricValueCells.forEach((r) => {
      const addr = XLSX.utils.encode_cell({ r, c: 1 });
      const cell = wsSum[addr];
      if (cell?.t === "n") {
        cell.z = r === 8 ? fmtPkr : fmtInt;
      }
    });
    expandRef(wsSum, summaryRows.length - 1, 2);
    XLSX.utils.book_append_sheet(wb, wsSum, "Summary");

    // ── Prediction (scenario detail) ─────────────────────────────
    if (data.prediction) {
      const predRows: (string | number)[][] = [
        ["Prediction results"],
        [data.prediction.productName],
        [`Generated: ${generatedAt}`],
        [],
        ["Output", "Value", "Interpretation"],
        [
          "Predicted sales (units)",
          data.prediction.predictedSales,
          "Expected units for the selected month & city",
        ],
        [
          "Potential score",
          data.prediction.salesPotentialScore / 100,
          "Percentile vs training sales distribution (0–100%)",
        ],
        [
          "Potential band",
          data.prediction.salesPotentialCategory,
          "Bucket from score thresholds",
        ],
        [
          "Discounted price (PKR)",
          data.prediction.discountedPrice,
          "Price after your discount %",
        ],
        ["Price tier", data.prediction.priceCategory, ""],
      ];
      if (data.predictionInputs && Object.keys(data.predictionInputs).length) {
        predRows.push(
          [],
          ["Inputs you used", "", ""],
          ["Parameter", "Value", ""],
          ...Object.entries(data.predictionInputs).map(
            ([k, v]) => [k, String(v), ""] as (string | number)[],
          ),
        );
      }
      const wsPred = XLSX.utils.aoa_to_sheet(predRows);
      wsPred["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
      ];
      setColWidths(wsPred, [28, 24, 44]);
      const p0 = XLSX.utils.encode_cell({ r: 0, c: 0 });
      const p1 = XLSX.utils.encode_cell({ r: 1, c: 0 });
      const p2 = XLSX.utils.encode_cell({ r: 2, c: 0 });
      if (wsPred[p0]) wsPred[p0].s = XL.coverBanner;
      if (wsPred[p1]) wsPred[p1].s = XL.coverTitle;
      if (wsPred[p2]) wsPred[p2].s = XL.coverMeta;
      applyRowStyle(wsPred, 4, 0, 2, XL.tableHead);
      stripeTableBody(wsPred, 4, 10, 2);
      const scoreAddr = XLSX.utils.encode_cell({ r: 6, c: 1 });
      const scoreCell = wsPred[scoreAddr];
      if (scoreCell?.t === "n") {
        scoreCell.z = "0.0%";
        scoreCell.v = data.prediction.salesPotentialScore / 100;
      }
      const unitsAddr = XLSX.utils.encode_cell({ r: 5, c: 1 });
      const unitsCell = wsPred[unitsAddr];
      if (unitsCell?.t === "n") unitsCell.z = "#,##0.00";
      const priceAddr = XLSX.utils.encode_cell({ r: 8, c: 1 });
      const priceCell = wsPred[priceAddr];
      if (priceCell?.t === "n") priceCell.z = fmtPkr;

      if (data.predictionInputs && Object.keys(data.predictionInputs).length) {
        const inputSectionTitle = predRows.findIndex(
          (row) => row[0] === "Inputs you used",
        );
        const headerInputs = inputSectionTitle + 1;
        applyRowStyle(wsPred, inputSectionTitle, 0, 2, XL.sectionTitle);
        applyRowStyle(wsPred, headerInputs, 0, 2, XL.tableHead);
        stripeTableBody(
          wsPred,
          headerInputs,
          predRows.length - 1,
          2,
        );
      }
      expandRef(wsPred, predRows.length - 1, 2);
      XLSX.utils.book_append_sheet(wb, wsPred, "Prediction");
    }

    // ── Insights ─────────────────────────────────────────────────
    if (data.insights && data.insights.length > 0) {
      const insightRows: (string | number)[][] = [
        ["Insights"],
        [`Generated: ${generatedAt}`],
        [],
        ["#", "Insight"],
        ...data.insights.map((i, idx) => [idx + 1, i]),
      ];
      const wsIn = XLSX.utils.aoa_to_sheet(insightRows);
      wsIn["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      ];
      setColWidths(wsIn, [6, 78]);
      const i0 = XLSX.utils.encode_cell({ r: 0, c: 0 });
      const i1 = XLSX.utils.encode_cell({ r: 1, c: 0 });
      if (wsIn[i0]) wsIn[i0].s = XL.coverBanner;
      if (wsIn[i1]) wsIn[i1].s = XL.coverMeta;
      const ih = 3;
      applyRowStyle(wsIn, ih, 0, 1, XL.tableHead);
      stripeTableBody(wsIn, ih, ih + data.insights.length, 1);
      expandRef(wsIn, insightRows.length - 1, 1);
      XLSX.utils.book_append_sheet(wb, wsIn, "Insights");
    }

    // ── About (optional reference — not the data tab) ────────────
    const lastColAbout = 1;
    const aboutRows: (string | number)[][] = [
      ["Workbook guide"],
      [`${data.reportTitle} · ${generatedAt}`],
      [],
      ["Tab", "What it contains"],
      [
        "Sales_by_month (first tab)",
        "Dataset-style table: one row per month (Jan–Dec). Dataset columns = category model output; last two columns = your last Run Prediction scenario.",
      ],
      [
        "Summary",
        "Roll-up KPIs (totals, growth, price, rating) for the category dataset.",
      ],
      ...(data.prediction
        ? ([
            [
              "Prediction",
              "Full model outputs and the exact form inputs for your scenario.",
            ],
          ] as (string | number)[][])
        : []),
      ...(data.insights?.length
        ? ([
            [
              "Insights",
              "Short automated takeaways from the category data.",
            ],
          ] as (string | number)[][])
        : []),
      [],
      ["Category name", data.category.name],
      ["Tag / positioning", data.category.tag ?? "—"],
      ["Description", data.category.description ?? "—"],
    ];
    const wsAbout = XLSX.utils.aoa_to_sheet(aboutRows);
    wsAbout["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColAbout } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColAbout } },
    ];
    setColWidths(wsAbout, [30, 72]);
    const a0 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    const a1 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (wsAbout[a0]) wsAbout[a0].s = XL.sectionTitle;
    if (wsAbout[a1]) wsAbout[a1].s = XL.coverMeta;
    applyRowStyle(wsAbout, 3, 0, 1, XL.tableHead);
    const aboutGuideEnd =
      3 +
      2 +
      (data.prediction ? 1 : 0) +
      (data.insights?.length ? 1 : 0);
    stripeTableBody(wsAbout, 3, aboutGuideEnd, 1);
    for (let r = aboutGuideEnd + 2; r <= aboutRows.length - 1; r += 1) {
      applyRowStyle(wsAbout, r, 0, 1, XL.tableCell);
    }
    expandRef(wsAbout, aboutRows.length - 1, lastColAbout);
    XLSX.utils.book_append_sheet(wb, wsAbout, "About");

    XLSX.writeFile(
      wb,
      `${safePrefix(data.filePrefix)}-report-${timestamp()}.xlsx`,
    );
  };

  const generatePDF = () => {
    const data = getReportData();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    let y = 20;
    const lineHeight = 6;
    const sectionGap = 8;

    const addPageIfNeeded = (needed: number) => {
      if (y + needed > pageHeight - 25) {
        doc.addPage();
        y = 20;
      }
    };

    const addText = (text: string, fontSize = 11, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
      lines.forEach((line: string) => {
        addPageIfNeeded(lineHeight);
        doc.text(line, margin, y);
        y += lineHeight;
      });
    };

    const addSectionTitle = (title: string) => {
      addPageIfNeeded(lineHeight * 3);
      y += sectionGap;
      addText(title, 14, true);
      y += 2;
    };

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("TrendInsight Intelligence — Category Report", margin, 12);
    doc.setTextColor(0, 0, 0);
    y = 22;

    addText(data.reportTitle, 18, true);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y + 2);
    doc.setTextColor(0, 0, 0);
    y += 14;

    addSectionTitle("Category");
    addText(`Name: ${data.category.name}`);
    if (data.category.tag) addText(`Tag: ${data.category.tag}`);
    if (data.category.description)
      addText(`Description: ${data.category.description}`);

    if (data.prediction) {
      addSectionTitle("Executive Summary — Prediction");
      doc.setDrawColor(200, 220, 240);
      doc.setFillColor(248, 250, 252);
      const boxY = y;
      doc.rect(margin, boxY - 2, pageWidth - margin * 2, 32, "FD");
      doc.setFontSize(10);
      doc.text(`Product: ${data.prediction.productName}`, margin + 4, boxY + 6);
      doc.text(
        `Predicted Sales: ${data.prediction.predictedSales.toLocaleString()} units`,
        margin + 4,
        boxY + 14,
      );
      doc.text(
        `Potential: ${data.prediction.salesPotentialCategory} (${data.prediction.salesPotentialScore}%)`,
        margin + 4,
        boxY + 22,
      );
      doc.text(
        `Discounted Price: PKR ${data.prediction.discountedPrice.toLocaleString()}`,
        margin + 4,
        boxY + 30,
      );
      y = boxY + 38;
    }

    if (data.summary) {
      addSectionTitle("Category Summary");
      addText(
        `Total Sales (units): ${data.summary.totalSales.toLocaleString()}`,
      );
      addText(
        `Predicted Sales (units): ${(data.summary.totalPredictedSales ?? 0).toLocaleString()}`,
      );
      addText(`Total Products: ${data.summary.totalProducts.toLocaleString()}`);
      addText(
        `Avg Price: PKR ${data.summary.avgPrice.toLocaleString()}`,
      );
      addText(
        `Growth: ${data.summary.growthPct >= 0 ? "+" : ""}${data.summary.growthPct}%`,
      );
    }

    if (data.prediction) {
      addSectionTitle("Prediction Details");
      addText(`Product Name: ${data.prediction.productName}`);
      addText(`Category: ${data.prediction.category}`);
      addText(
        `Predicted Sales: ${data.prediction.predictedSales.toLocaleString()} units`,
      );
      addText(`Sales Potential Score: ${data.prediction.salesPotentialScore}%`);
      addText(
        `Sales Potential Category: ${data.prediction.salesPotentialCategory}`,
      );
      addText(
        `Discounted Price: PKR ${data.prediction.discountedPrice.toLocaleString()}`,
      );
      addText(
        `Price Category: ${data.prediction.priceCategory}`,
      );
      if (data.predictionInputs && Object.keys(data.predictionInputs).length > 0) {
        y += 4;
        addText("Input parameters used:", 10, true);
        Object.entries(data.predictionInputs).forEach(([k, v]) => {
          addText(`${k}: ${String(v)}`, 10);
        });
      }
    }

    if (data.seasonalTrend && data.seasonalTrend.length > 0) {
      addSectionTitle("Predicted Sales by Month");
      data.seasonalTrend.forEach((r) => {
        addText(`${r.label}: ${r.predictedSales.toLocaleString()} units`, 10);
      });
      const total = data.seasonalTrend.reduce((s, r) => s + r.predictedSales, 0);
      addText(`Total (all months): ${total.toLocaleString()}`, 10, true);
    }

    if (data.chartData && data.chartData.length > 0) {
      addSectionTitle("Category Trend by Month");
      data.chartData.forEach((r) => {
        addText(
          `${r.label} — Current: ${r.currentSales.toLocaleString()}, Predicted: ${r.predictedSales.toLocaleString()}, Products: ${r.products}`,
          10,
        );
      });
    }

    if (data.insights && data.insights.length > 0) {
      addSectionTitle("Key Insights");
      data.insights.forEach((i) => addText(`• ${i}`, 10));
    }

    const numPages = doc.getNumberOfPages();
    for (let p = 1; p <= numPages; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `TrendInsight Intelligence — ${data.reportTitle} — Page ${p} of ${numPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" },
      );
      doc.text(
        new Date().toLocaleString(),
        pageWidth - margin,
        pageHeight - 10,
        { align: "right" },
      );
      doc.setTextColor(0, 0, 0);
    }

    doc.save(`${safePrefix(data.filePrefix)}-report-${timestamp()}.pdf`);
  };

  const handleExport = (format: "excel" | "pdf") => {
    try {
      setIsGenerating(true);
      if (format === "excel") generateExcel();
      else generatePDF();
    } catch (err) {
      console.error("Report export failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={isGenerating}
          className={className}
          type="button"
        >
          <Download className="w-4 h-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate Report"}
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
