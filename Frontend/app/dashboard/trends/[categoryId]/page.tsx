"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  DollarSign,
  Package,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  getActiveDatasetId,
  getClientCache,
  setActiveDatasetId,
  setClientCache,
} from "@/lib/client-cache";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { buildPredictionInsight } from "@/lib/prediction-insight";

const ReportGenerator = dynamic(
  () =>
    import("@/components/dashboard/report-generator").then(
      (m) => m.ReportGenerator,
    ),
  { ssr: false },
);

const categoryData: Record<string, any> = {
  "t-shirts": {
    emoji: "👕",
    name: "T-Shirts",
    tag: "Seasonal hero",
    tagColor: "bg-muted/50 text-foreground border-border",
    description:
      "Graphic tees and limited drops spike ahead of summer and holiday campaigns.",
    trendData: [
      { month: "Jan", sales: 4200, units: 850 },
      { month: "Feb", sales: 3800, units: 760 },
      { month: "Mar", sales: 5200, units: 1040 },
      { month: "Apr", sales: 6800, units: 1360 },
      { month: "May", sales: 8500, units: 1700 },
      { month: "Jun", sales: 9200, units: 1840 },
    ],
  },
  jeans: {
    emoji: "👖",
    name: "Jeans",
    tag: "Baseline anchor",
    tagColor: "bg-muted/50 text-foreground border-border",
    description:
      "Denim provides steady revenue with modest growth driven by fit refreshes.",
    trendData: [
      { month: "Jan", sales: 7200, units: 720 },
      { month: "Feb", sales: 6900, units: 690 },
      { month: "Mar", sales: 7400, units: 740 },
      { month: "Apr", sales: 7100, units: 710 },
      { month: "May", sales: 7600, units: 760 },
      { month: "Jun", sales: 7800, units: 780 },
    ],
  },
  shoes: {
    emoji: "👟",
    name: "Shoes",
    tag: "Momentum driver",
    tagColor: "bg-muted/50 text-foreground border-border",
    description:
      "Footwear experiences strong momentum during back-to-school and festival seasons.",
    trendData: [
      { month: "Jan", sales: 5800, units: 580 },
      { month: "Feb", sales: 5200, units: 520 },
      { month: "Mar", sales: 6200, units: 620 },
      { month: "Apr", sales: 7400, units: 740 },
      { month: "May", sales: 8900, units: 890 },
      { month: "Jun", sales: 9600, units: 960 },
    ],
  },
  socks: {
    emoji: "🧦",
    name: "Socks",
    tag: "Steady performer",
    tagColor: "bg-muted/50 text-foreground border-border",
    description:
      "Essential replenishment category with dependable baseline volume.",
    trendData: [
      { month: "Jan", sales: 2800, units: 2800 },
      { month: "Feb", sales: 2700, units: 2700 },
      { month: "Mar", sales: 2900, units: 2900 },
      { month: "Apr", sales: 2850, units: 2850 },
      { month: "May", sales: 3000, units: 3000 },
      { month: "Jun", sales: 3100, units: 3100 },
    ],
  },
  shorts: {
    emoji: "🩳",
    name: "Shorts",
    tag: "Warm-weather spike",
    tagColor: "bg-muted/50 text-foreground border-border",
    description:
      "Shorts peak sharply in spring/summer with strong regional variance.",
    trendData: [
      { month: "Jan", sales: 1200, units: 240 },
      { month: "Feb", sales: 1800, units: 360 },
      { month: "Mar", sales: 4200, units: 840 },
      { month: "Apr", sales: 6800, units: 1360 },
      { month: "May", sales: 9200, units: 1840 },
      { month: "Jun", sales: 10500, units: 2100 },
    ],
  },
};

// Map URL slug → model category value
const slugToCategory: Record<string, string> = {
  "t-shirts": "T-Shirt",
  jeans: "Jeans",
  shoes: "Shoes",
  socks: "Socks",
  shorts: "Shorts",
};

// Month labels used only for full-year prediction charts (not a form field).
const MONTH_VALUES = [
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

// Fallback options used only if the active-dataset options API is unavailable.
// Cities match the baseline Pakistan e-commerce dataset generator.
const FALLBACK_OPTIONS = {
  city: [
    "Karachi",
    "Lahore",
    "Islamabad",
    "Rawalpindi",
    "Faisalabad",
    "Multan",
    "Peshawar",
    "Hyderabad",
    "Quetta",
    "Sialkot",
    "Gujranwala",
    "Abbottabad",
    "Sargodha",
    "Bahawalpur",
    "Sukkur",
  ],
  gender: ["Male", "Female", "Unisex"],
  color: ["Black", "White", "Blue", "Grey", "Red", "Navy"],
  sleeveType: ["Half Sleeve", "Full Sleeve", "Sleeveless"],
  material: {
    "T-Shirt": ["Cotton", "Polyester", "Cotton Blend", "Jersey", "Linen"],
    Jeans: ["Denim", "Stretch Denim", "Slim Denim", "Cotton Denim"],
    Shoes: ["Leather", "Synthetic", "Canvas", "Mesh", "Suede"],
    Socks: ["Cotton", "Wool", "Polyester", "Nylon", "Spandex"],
    Shorts: ["Cotton", "Polyester", "Nylon", "Denim", "Linen"],
  },
} as const;

type PredictionMode = "standard" | "generic";

const GENERIC_RANK_MEDALS = ["🥇", "🥈", "🥉"] as const;

interface GenericTopProduct {
  rank: number;
  productName: string;
  category: string;
  salesPotentialScore: number;
  salesPotentialCategory: string;
  predictedSales: number;
}

function MonthlySalesChart({
  data,
  title,
  tooltipStyle,
}: {
  data: Array<{ label: string; predictedSales: number }>;
  title?: string;
  tooltipStyle: CSSProperties;
}) {
  if (data.length === 0) return null;

  return (
    <div className="mt-6 pt-5 border-t border-border">
      <h3 className="text-base font-bold text-foreground mb-4">
        {title ?? "Predicted Sales by Month"}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" stroke="var(--muted-foreground)" />
          <YAxis stroke="var(--muted-foreground)" />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Line
            type="monotone"
            dataKey="predictedSales"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Predicted Sales"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function toSelectOptions(values: string[]) {
  return values.map((value) => ({ label: value, value }));
}

function pickDefaultFromOptions(
  options: string[],
  preferred: string[],
): string[] {
  if (options.length === 0) return preferred;
  for (const value of preferred) {
    if (options.includes(value)) return [value];
  }
  return [options[0]];
}

function keepValidSelections(selected: string[], options: string[]): string[] {
  const valid = selected.filter((value) => options.includes(value));
  if (valid.length > 0) return valid;
  return options.length > 0 ? [options[0]] : [];
}

interface PredictionFormData {
  productName: string;
  category: string;
  price: string;
  discountPct: string;
  isFlashSale: boolean;
  gender: string[];
  color: string[];
  sleeveType: string[];
  material: string[];
  isCombo: boolean;
  city: string[];
}

interface SinglePredictionResult {
  productName: string;
  category: string;
  predictedSales: number;
  salesPotentialScore: number;
  salesPotentialCategory: string;
  discountedPrice: number;
  priceCategory: string;
  forecastYear?: number;
  year?: number;
  month?: string;
}

type MultiSelectField = "city" | "gender" | "color" | "sleeveType" | "material";

type PredictionCombo = {
  city: string;
  gender: string;
  color: string;
  sleeveType: string;
  material: string;
};

const MAX_FULL_COMBOS = 24;

function toggleMultiValue(values: string[], option: string, checked: boolean) {
  if (checked) {
    return values.includes(option) ? values : [...values, option];
  }
  return values.filter((v) => v !== option);
}

function buildPredictionCombos(form: PredictionFormData): PredictionCombo[] {
  const cities = form.city.length > 0 ? form.city : ["Karachi"];
  const genders = form.gender.length > 0 ? form.gender : ["Unisex"];
  const colors = form.color.length > 0 ? form.color : ["Black"];
  const sleeves =
    form.sleeveType.length > 0 ? form.sleeveType : ["Not Specified"];
  const materials = form.material.length > 0 ? form.material : ["Cotton"];

  const product =
    cities.length *
    genders.length *
    colors.length *
    sleeves.length *
    materials.length;

  // Small sets: full cartesian product.
  if (product <= MAX_FULL_COMBOS) {
    const combos: PredictionCombo[] = [];
    for (const city of cities) {
      for (const gender of genders) {
        for (const color of colors) {
          for (const sleeveType of sleeves) {
            for (const material of materials) {
              combos.push({ city, gender, color, sleeveType, material });
            }
          }
        }
      }
    }
    return combos;
  }

  // Large sets (e.g. Select All on many fields): vary one dimension at a time
  // so Select All still works without exploding into thousands of runs.
  const base: PredictionCombo = {
    city: cities[0],
    gender: genders[0],
    color: colors[0],
    sleeveType: sleeves[0],
    material: materials[0],
  };
  const combos: PredictionCombo[] = [base];
  const seen = new Set<string>([JSON.stringify(base)]);
  const dims: Array<[keyof PredictionCombo, string[]]> = [
    ["city", cities],
    ["gender", genders],
    ["color", colors],
    ["sleeveType", sleeves],
    ["material", materials],
  ];
  for (const [key, values] of dims) {
    for (const value of values) {
      const combo = { ...base, [key]: value };
      const id = JSON.stringify(combo);
      if (!seen.has(id)) {
        seen.add(id);
        combos.push(combo);
      }
    }
  }
  return combos;
}

function potentialCategoryFromScore(score: number) {
  if (score >= 75) return "High Potential";
  if (score >= 50) return "Medium Potential";
  if (score >= 25) return "Low-Medium Potential";
  return "Low Potential";
}

function aggregateYearlyFromMonthly(
  monthly: Array<{ month: string; prediction: SinglePredictionResult }>,
  extras: Partial<SinglePredictionResult> = {},
): SinglePredictionResult | null {
  if (monthly.length === 0) return null;

  const predictedSales = monthly.reduce(
    (sum, item) => sum + item.prediction.predictedSales,
    0,
  );
  const salesPotentialScore =
    monthly.reduce(
      (sum, item) => sum + item.prediction.salesPotentialScore,
      0,
    ) / monthly.length;
  const first = monthly[0].prediction;

  return {
    ...first,
    ...extras,
    predictedSales,
    salesPotentialScore,
    salesPotentialCategory: potentialCategoryFromScore(salesPotentialScore),
  };
}

function averagePredictionResults(
  results: SinglePredictionResult[],
): SinglePredictionResult | null {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];

  const predictedSales =
    results.reduce((sum, r) => sum + r.predictedSales, 0) / results.length;
  const salesPotentialScore =
    results.reduce((sum, r) => sum + r.salesPotentialScore, 0) / results.length;
  const discountedPrice =
    results.reduce((sum, r) => sum + r.discountedPrice, 0) / results.length;
  const first = results[0];

  return {
    ...first,
    predictedSales,
    salesPotentialScore,
    salesPotentialCategory: potentialCategoryFromScore(salesPotentialScore),
    discountedPrice,
  };
}

function averageMonthlyTrend(
  monthlyLists: Array<
    Array<{ month: string; prediction: SinglePredictionResult }>
  >,
  forecastYear: number,
  monthOrder: readonly string[] = MONTH_VALUES,
): Array<{ label: string; predictedSales: number }> {
  const byMonth = new Map<string, number[]>();
  for (const list of monthlyLists) {
    for (const item of list) {
      const bucket = byMonth.get(item.month) ?? [];
      bucket.push(item.prediction.predictedSales);
      byMonth.set(item.month, bucket);
    }
  }
  return monthOrder
    .filter((month) => byMonth.has(month))
    .map((month) => {
      const values = byMonth.get(month)!;
      return {
        label: month,
        predictedSales: Math.round(
          values.reduce((sum, v) => sum + v, 0) / values.length,
        ),
      };
    });
}

function formatMultiSelectLabel(
  values: string[],
  options: readonly { label: string; value: string }[],
) {
  if (values.length === 0) return "Select options";
  if (values.length === options.length) return "All selected";
  if (values.length === 1) {
    return (
      options.find((opt) => opt.value === values[0])?.label ?? values[0]
    );
  }
  return `${values.length} selected`;
}

function SearchableSelect({
  options,
  value,
  onChange,
  label,
  id,
  placeholder = "Select from dataset",
  emptyText = "No matching values in dataset",
}: {
  options: readonly { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  id: string;
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="space-y-1.5" ref={rootRef}>
      <label
        htmlFor={id}
        className="text-xs font-medium text-muted-foreground block"
      >
        {label}
      </label>
      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full min-h-9 items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={`truncate text-left ${value ? "" : "text-muted-foreground"}`}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open && (
          <div className="absolute z-40 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
            <div className="border-b border-border p-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dataset values..."
                className="h-8"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyText}
                </p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`flex w-full px-3 py-2 text-left text-sm hover:bg-muted/40 ${
                      value === opt.value
                        ? "bg-muted/60 font-medium text-foreground"
                        : "text-foreground"
                    }`}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MultiSelectDropdown({
  options,
  values,
  onToggle,
  onSelectAll,
  label,
  id,
}: {
  options: readonly { label: string; value: string }[];
  values: string[];
  onToggle: (option: string, checked: boolean) => void;
  onSelectAll: (selectAll: boolean) => void;
  label: string;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const allValues = options.map((opt) => opt.value);
  const allSelected =
    allValues.length > 0 && allValues.every((v) => values.includes(v));
  const someSelected = values.length > 0 && !allSelected;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="space-y-1.5" ref={rootRef}>
      <label
        htmlFor={id}
        className="text-xs font-medium text-muted-foreground block"
      >
        {label}
      </label>
      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full h-9 items-center justify-between rounded-md border border-border bg-card px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">
            {formatMultiSelectLabel(values, options)}
          </span>
          <ChevronDown
            className={`ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open && (
          <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-56 overflow-y-auto">
            <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground cursor-pointer border-b border-border hover:bg-muted/40">
              <Checkbox
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                onCheckedChange={(state) => onSelectAll(state === true)}
              />
              <span>Select All</span>
            </label>
            {options.map((opt) => {
              const checked = values.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(state) =>
                      onToggle(opt.value, state === true)
                    }
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface CategoryTrendResponse {
  category: string;
  chartData: Array<{
    label: string;
    currentSales: number;
    predictedSales: number;
    products: number;
  }>;
  insights?: string[];
  summary: {
    totalSales: number;
    totalPredictedSales: number;
    totalProducts: number;
    avgPrice: number;
    growthPct: number;
  };
}

function monthlyPredictionsFromApi(data: Record<string, unknown>): Array<{
  month: string;
  prediction: SinglePredictionResult;
}> {
  if (Array.isArray(data.monthlyPredictions)) {
    return data.monthlyPredictions as Array<{
      month: string;
      prediction: SinglePredictionResult;
    }>;
  }
  const nested = data.prediction as Record<string, unknown> | undefined;
  if (nested && Array.isArray(nested.monthlyPredictions)) {
    return nested.monthlyPredictions as Array<{
      month: string;
      prediction: SinglePredictionResult;
    }>;
  }
  return [];
}

export default function CategoryDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const categoryId = params.categoryId as string;
  const category = categoryData[categoryId];
  const modelCategory = slugToCategory[categoryId] ?? "T-Shirt";

  const [predicting, setPredicting] = useState(false);
  const [predictionMode, setPredictionMode] =
    useState<PredictionMode>("standard");
  const [genericTopProducts, setGenericTopProducts] = useState<
    GenericTopProduct[]
  >([]);
  const [genericLeaderName, setGenericLeaderName] = useState("");
  const [predictionError, setPredictionError] = useState("");
  const [predictionResult, setPredictionResult] =
    useState<SinglePredictionResult | null>(null);
  const [monthlyTrendData, setMonthlyTrendData] = useState<
    Array<{ label: string; predictedSales: number }>
  >([]);
  const [categoryTrends, setCategoryTrends] =
    useState<CategoryTrendResponse | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<
    Array<{
      createdAt?: string;
      role?: string;
      source?: string;
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
    }>
  >([]);
  const [predictionForm, setPredictionForm] = useState<PredictionFormData>({
    productName: "",
    category: modelCategory,
    price: "",
    discountPct: "",
    isFlashSale: false,
    gender: ["Unisex"],
    color: ["Black"],
    sleeveType: ["Half Sleeve"],
    material: ["Cotton"],
    isCombo: false,
    city: ["Karachi"],
  });
  const [scenarioResults, setScenarioResults] = useState<
    Array<{
      label: string;
      prediction: SinglePredictionResult;
    }>
  >([]);
  const [datasetOptions, setDatasetOptions] = useState<{
    productNames: string[];
    cities: string[];
    gender: string[];
    color: string[];
    sleeveType: string[];
    material: string[];
    ranges: {
      price: { min: number; max: number };
      discountPct: { min: number; max: number };
    };
    years: number[];
    months: string[];
    forecastYear: number;
    datasetYearMin: number;
    datasetYearMax: number;
  }>({
    productNames: [],
    cities: [...FALLBACK_OPTIONS.city],
    gender: [...FALLBACK_OPTIONS.gender],
    color: [...FALLBACK_OPTIONS.color],
    sleeveType: [...FALLBACK_OPTIONS.sleeveType],
    material: [
      ...(FALLBACK_OPTIONS.material[
        modelCategory as keyof typeof FALLBACK_OPTIONS.material
      ] ?? ["Cotton"]),
    ],
    ranges: {
      price: { min: 0, max: Number.POSITIVE_INFINITY },
      discountPct: { min: 0, max: 100 },
    },
    years: [],
    months: [...MONTH_VALUES],
    forecastYear: 2026,
    datasetYearMin: 2020,
    datasetYearMax: 2025,
  });

  const productNameOptions = useMemo(
    () => toSelectOptions(datasetOptions.productNames),
    [datasetOptions.productNames],
  );
  const cityOptions = useMemo(
    () => toSelectOptions(datasetOptions.cities),
    [datasetOptions.cities],
  );
  const genderOptions = useMemo(
    () => toSelectOptions(datasetOptions.gender),
    [datasetOptions.gender],
  );
  const colorOptions = useMemo(
    () => toSelectOptions(datasetOptions.color),
    [datasetOptions.color],
  );
  const sleeveOptions = useMemo(
    () => toSelectOptions(datasetOptions.sleeveType),
    [datasetOptions.sleeveType],
  );
  const materialOptions = useMemo(
    () => toSelectOptions(datasetOptions.material),
    [datasetOptions.material],
  );

  const chartTooltipStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    color: "var(--card-foreground)",
    fontSize: "12px",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.2)",
  };

  useEffect(() => {
    setPredictionResult(null);
    setMonthlyTrendData([]);
    setScenarioResults([]);
    setPredictionError("");

    const fallbackMaterial = [
      ...(FALLBACK_OPTIONS.material[
        modelCategory as keyof typeof FALLBACK_OPTIONS.material
      ] ?? ["Cotton"]),
    ];
    const fallbackSleeve =
      modelCategory === "T-Shirt"
        ? [...FALLBACK_OPTIONS.sleeveType]
        : ["Not Specified"];

    setDatasetOptions({
      productNames: [],
      cities: [...FALLBACK_OPTIONS.city],
      gender: [...FALLBACK_OPTIONS.gender],
      color: [...FALLBACK_OPTIONS.color],
      sleeveType: fallbackSleeve,
      material: fallbackMaterial,
      ranges: {
        price: { min: 0, max: Number.POSITIVE_INFINITY },
        discountPct: { min: 0, max: 100 },
      },
      years: [],
      months: [...MONTH_VALUES],
      forecastYear: 2026,
      datasetYearMin: 2020,
      datasetYearMax: 2025,
    });

    setPredictionForm((prev) => ({
      ...prev,
      category: modelCategory,
      productName: "",
      price: "",
      discountPct: "",
      gender: pickDefaultFromOptions([...FALLBACK_OPTIONS.gender], ["Unisex"]),
      color: pickDefaultFromOptions([...FALLBACK_OPTIONS.color], ["Black"]),
      city: pickDefaultFromOptions([...FALLBACK_OPTIONS.city], ["Karachi"]),
      sleeveType: pickDefaultFromOptions(
        fallbackSleeve,
        modelCategory === "T-Shirt" ? ["Half Sleeve"] : ["Not Specified"],
      ),
      material: pickDefaultFromOptions(fallbackMaterial, [
        fallbackMaterial[0] ?? "Cotton",
      ]),
    }));

    let cancelled = false;
    const loadDatasetOptions = async () => {
      try {
        const activeId = getActiveDatasetId();
        const optionsCacheKey = `dataset_options_${activeId || "unknown"}_${modelCategory}`;
        const cachedOptions = getClientCache<{
          datasetId?: string;
          productNames?: string[];
          cities?: string[];
          gender?: string[];
          color?: string[];
          sleeveType?: string[];
          material?: string[];
          ranges?: {
            price?: { min?: number; max?: number };
            discountPct?: { min?: number; max?: number };
          };
          years?: number[];
          months?: string[];
          forecastYear?: number;
          datasetYearMin?: number;
          datasetYearMax?: number;
        }>(optionsCacheKey);
        if (
          cachedOptions &&
          (!activeId || cachedOptions.datasetId === activeId) &&
          Array.isArray(cachedOptions.productNames)
        ) {
          // Apply cached options immediately, then refresh in background.
          const productNames = cachedOptions.productNames || [];
          setDatasetOptions((prev) => ({
            ...prev,
            productNames,
            cities: cachedOptions.cities?.length
              ? cachedOptions.cities
              : prev.cities,
            gender: cachedOptions.gender?.length
              ? cachedOptions.gender
              : prev.gender,
            color: cachedOptions.color?.length ? cachedOptions.color : prev.color,
            sleeveType: cachedOptions.sleeveType?.length
              ? cachedOptions.sleeveType
              : prev.sleeveType,
            material: cachedOptions.material?.length
              ? cachedOptions.material
              : prev.material,
          }));
        }

        const response = await fetch(
          `/api/trends/options?category=${encodeURIComponent(modelCategory)}&ts=${Date.now()}`,
          { credentials: "include", cache: "no-store" },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          datasetId?: string;
          productNames?: string[];
          cities?: string[];
          gender?: string[];
          color?: string[];
          sleeveType?: string[];
          material?: string[];
          ranges?: {
            price?: { min?: number; max?: number };
            discountPct?: { min?: number; max?: number };
          };
          years?: number[];
          months?: string[];
          forecastYear?: number;
          datasetYearMin?: number;
          datasetYearMax?: number;
        };
        if (cancelled) return;
        if (payload.datasetId) {
          setActiveDatasetId(payload.datasetId);
        }

        const productNames = Array.isArray(payload.productNames)
          ? payload.productNames
          : [];
        const cities =
          Array.isArray(payload.cities) && payload.cities.length > 0
            ? payload.cities
            : [...FALLBACK_OPTIONS.city];
        const gender =
          Array.isArray(payload.gender) && payload.gender.length > 0
            ? payload.gender
            : [...FALLBACK_OPTIONS.gender];
        const color =
          Array.isArray(payload.color) && payload.color.length > 0
            ? payload.color
            : [...FALLBACK_OPTIONS.color];
        const sleeveType =
          Array.isArray(payload.sleeveType) && payload.sleeveType.length > 0
            ? payload.sleeveType
            : fallbackSleeve;
        const material =
          Array.isArray(payload.material) && payload.material.length > 0
            ? payload.material
            : fallbackMaterial;
        const priceMin = Number(payload.ranges?.price?.min);
        const priceMax = Number(payload.ranges?.price?.max);
        const discountMin = Number(payload.ranges?.discountPct?.min);
        const discountMax = Number(payload.ranges?.discountPct?.max);
        const years =
          Array.isArray(payload.years) && payload.years.length > 0
            ? payload.years
            : [];
        const months =
          Array.isArray(payload.months) && payload.months.length > 0
            ? payload.months
            : [...MONTH_VALUES];
        const forecastYear = Number(payload.forecastYear);
        const datasetYearMin = Number(payload.datasetYearMin);
        const datasetYearMax = Number(payload.datasetYearMax);

        const nextOptions = {
          productNames,
          cities,
          gender,
          color,
          sleeveType,
          material,
          ranges: {
            price: {
              min: Number.isFinite(priceMin) ? priceMin : 0,
              max: Number.isFinite(priceMax)
                ? priceMax
                : Number.POSITIVE_INFINITY,
            },
            discountPct: {
              min: Number.isFinite(discountMin) ? discountMin : 0,
              max: Number.isFinite(discountMax) ? discountMax : 100,
            },
          },
          years,
          months,
          forecastYear: Number.isFinite(forecastYear)
            ? forecastYear
            : (years.length > 0 ? Math.max(...years) + 1 : 2026),
          datasetYearMin: Number.isFinite(datasetYearMin)
            ? datasetYearMin
            : (years.length > 0 ? Math.min(...years) : 2020),
          datasetYearMax: Number.isFinite(datasetYearMax)
            ? datasetYearMax
            : (years.length > 0 ? Math.max(...years) : 2025),
        };
        setDatasetOptions(nextOptions);
        setClientCache(
          `dataset_options_${payload.datasetId || activeId || "unknown"}_${modelCategory}`,
          { datasetId: payload.datasetId, ...nextOptions },
          10 * 60_000,
        );
        setPredictionForm((prev) => ({
          ...prev,
          productName:
            prev.productName && productNames.includes(prev.productName)
              ? prev.productName
              : "",
          city: keepValidSelections(prev.city, cities),
          gender: keepValidSelections(prev.gender, gender),
          color: keepValidSelections(prev.color, color),
          sleeveType: keepValidSelections(prev.sleeveType, sleeveType),
          material: keepValidSelections(prev.material, material),
        }));
      } catch (error) {
        console.error("Failed to load dataset options", error);
      }
    };

    loadDatasetOptions();
    return () => {
      cancelled = true;
    };
  }, [modelCategory]);

  useEffect(() => {
    const fetchCategoryTrends = async () => {
      const activeId = getActiveDatasetId();
      const cacheKey = `category_trends_${activeId || "unknown"}_${categoryId}`;
      const cached = getClientCache<CategoryTrendResponse & { datasetId?: string }>(
        cacheKey,
      );
      if (cached && (!activeId || cached.datasetId === activeId)) {
        setCategoryTrends(cached);
        setCategoryLoading(false);
      } else {
        setCategoryTrends(null);
        setCategoryLoading(true);
      }
      try {
        const response = await fetch(
          `/api/trends/${categoryId}?ts=${Date.now()}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as CategoryTrendResponse & {
          datasetId?: string;
        };
        const latestActive = getActiveDatasetId();
        if (
          latestActive &&
          payload.datasetId &&
          payload.datasetId !== latestActive
        ) {
          return;
        }
        if (payload.datasetId) {
          setActiveDatasetId(payload.datasetId);
        }
        setCategoryTrends(payload);
        setClientCache(
          `category_trends_${payload.datasetId || latestActive || "unknown"}_${categoryId}`,
          payload,
          60_000,
        );
      } catch (error) {
        console.error("Failed to fetch category trends", error);
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchCategoryTrends();
  }, [categoryId]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch("/api/trends/predict/history?limit=15", {
          credentials: "include",
        });
        if (!response.ok) return;
        const payload = await response.json();
        setHistoryItems(Array.isArray(payload?.items) ? payload.items : []);
      } catch (error) {
        console.error("Failed to load prediction history", error);
      }
    };
    loadHistory();
  }, [predictionResult]);

  const metrics = useMemo(() => {
    if (!categoryTrends) {
      return {
        totalSales: 0,
        totalProducts: 0,
        salesGrowthPct: 0,
        avgPrice: 0,
      };
    }
    return {
      totalSales: categoryTrends.summary.totalSales,
      totalProducts: categoryTrends.summary.totalProducts,
      salesGrowthPct: categoryTrends.summary.growthPct,
      avgPrice: categoryTrends.summary.avgPrice,
    };
  }, [categoryTrends]);

  const avgCategorySales = useMemo(() => {
    if (metrics.totalProducts > 0) {
      return metrics.totalSales / metrics.totalProducts;
    }
    return 500;
  }, [metrics.totalSales, metrics.totalProducts]);

  const predictionInsight = useMemo(() => {
    if (!predictionResult) return null;
    return buildPredictionInsight(
      predictionResult.predictedSales,
      predictionResult.salesPotentialScore,
      avgCategorySales,
    );
  }, [predictionResult, avgCategorySales]);

  const handlePredictionFieldChange = (
    field: keyof PredictionFormData,
    value: string | boolean | string[],
  ) => {
    setPredictionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMultiSelectToggle = (
    field: MultiSelectField,
    option: string,
    checked: boolean,
  ) => {
    setPredictionForm((prev) => ({
      ...prev,
      [field]: toggleMultiValue(prev[field], option, checked),
    }));
  };

  const handleSelectAll = (
    field: MultiSelectField,
    optionValues: string[],
    selectAll: boolean,
  ) => {
    setPredictionForm((prev) => ({
      ...prev,
      [field]: selectAll ? [...optionValues] : [],
    }));
  };

  const handlePredictionModeChange = (value: string) => {
    if (value !== "standard" && value !== "generic") return;
    setPredictionMode(value);
    setPredictionError("");
    if (value === "standard") {
      setGenericTopProducts([]);
      setGenericLeaderName("");
    } else {
      setPredictionResult(null);
      setScenarioResults([]);
    }
    setMonthlyTrendData([]);
  };

  const handleGenericPredictSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPredictionError("");
    setGenericTopProducts([]);
    setGenericLeaderName("");
    setMonthlyTrendData([]);

    try {
      setPredicting(true);
      const response = await fetch("/api/trends/predict/generic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ category: modelCategory }),
      });
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(String(data?.error || "Generic prediction failed"));
      }

      const topProducts = Array.isArray(data.topProducts)
        ? (data.topProducts as GenericTopProduct[])
        : [];
      if (topProducts.length === 0) {
        throw new Error("No ranked products returned.");
      }

      const forecastYear =
        Number(data.forecastYear) || datasetOptions.forecastYear;
      const monthlyRaw = Array.isArray(data.monthlyPredictions)
        ? (data.monthlyPredictions as Array<{
            month: string;
            prediction: SinglePredictionResult;
          }>)
        : [];

      setGenericTopProducts(topProducts);
      setGenericLeaderName(String(data.leaderProductName ?? topProducts[0]?.productName ?? ""));
      setMonthlyTrendData(
        averageMonthlyTrend([monthlyRaw], forecastYear, datasetOptions.months),
      );
      toast.success("Generic prediction generated successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Generic prediction failed";
      setPredictionError(message);
    } finally {
      setPredicting(false);
    }
  };

  const handlePredictSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPredictionError("");
    const price = Number.parseFloat(predictionForm.price);
    const discount = Number.parseFloat(predictionForm.discountPct);
    const trimmedName = predictionForm.productName.trim();
    if (!trimmedName) {
      setPredictionError(
        "Product name is required. Select a name that exists in the dataset.",
      );
      return;
    }
    const nameExists = datasetOptions.productNames.some(
      (name) => name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (!nameExists) {
      setPredictionError(
        `This name "${trimmedName}" does not exist in the dataset for ${modelCategory}. Please select a product name that is present in the active dataset.`,
      );
      return;
    }
    if (
      predictionForm.city.some((v) => !datasetOptions.cities.includes(v)) ||
      predictionForm.gender.some((v) => !datasetOptions.gender.includes(v)) ||
      predictionForm.color.some((v) => !datasetOptions.color.includes(v)) ||
      predictionForm.material.some(
        (v) => !datasetOptions.material.includes(v),
      ) ||
      (modelCategory === "T-Shirt" &&
        predictionForm.sleeveType.some(
          (v) => !datasetOptions.sleeveType.includes(v),
        ))
    ) {
      setPredictionError(
        "One or more selected options do not exist in the active dataset. Please reselect valid dataset values.",
      );
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setPredictionError("Price must be greater than 0.");
      return;
    }
    const priceMin = datasetOptions.ranges.price.min;
    const priceMax = datasetOptions.ranges.price.max;
    if (
      Number.isFinite(priceMin) &&
      Number.isFinite(priceMax) &&
      (price < priceMin || price > priceMax)
    ) {
      setPredictionError(
        `This price is not present in the dataset for ${modelCategory}. ` +
          `Allowed range is PKR ${priceMin.toLocaleString()} – PKR ${priceMax.toLocaleString()} ` +
          `(maximum dataset value: PKR ${priceMax.toLocaleString()}).`,
      );
      return;
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      setPredictionError("Discount must be between 0 and 100.");
      return;
    }
    const discountMin = datasetOptions.ranges.discountPct.min;
    const discountMax = datasetOptions.ranges.discountPct.max;
    if (
      Number.isFinite(discountMin) &&
      Number.isFinite(discountMax) &&
      (discount < discountMin || discount > discountMax)
    ) {
      setPredictionError(
        `This discount is not present in the dataset for ${modelCategory}. ` +
          `Allowed range is ${discountMin}% – ${discountMax}% ` +
          `(maximum dataset value: ${discountMax}%).`,
      );
      return;
    }
    if (
      predictionForm.city.length === 0 ||
      predictionForm.gender.length === 0 ||
      predictionForm.color.length === 0 ||
      predictionForm.material.length === 0 ||
      (modelCategory === "T-Shirt" && predictionForm.sleeveType.length === 0)
    ) {
      setPredictionError("Select at least one option in each dropdown.");
      return;
    }

    const submittedForm = { ...predictionForm, productName: trimmedName };
    const combos = buildPredictionCombos(submittedForm);

    try {
      setPredicting(true);
      setMonthlyTrendData([]);
      setScenarioResults([]);

      const months = [...datasetOptions.months];
      const predictionCacheKey = `prediction_${modelCategory}_${JSON.stringify({
        ...submittedForm,
        category: modelCategory,
        months,
        forecastYear: datasetOptions.forecastYear,
        combos,
      })}`;
      const cachedPrediction = getClientCache<{
        prediction: SinglePredictionResult;
        monthlyTrend: Array<{ label: string; predictedSales: number }>;
        scenarios: Array<{ label: string; prediction: SinglePredictionResult }>;
      }>(predictionCacheKey);
      if (cachedPrediction?.prediction) {
        setPredictionResult(cachedPrediction.prediction);
        setMonthlyTrendData(cachedPrediction.monthlyTrend ?? []);
        setScenarioResults(cachedPrediction.scenarios ?? []);
        toast.success(
          "Prediction generated successfully. Now you can download report.",
        );
        setPredicting(false);
        return;
      }

      const comboRuns = await Promise.all(
        combos.map(async (combo) => {
          const res = await fetch("/api/trends/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              ...submittedForm,
              ...combo,
              category: modelCategory,
              months,
            }),
          });
          const data = (await res.json()) as Record<string, unknown>;
          if (!res.ok) {
            throw new Error(String(data?.error || "Prediction failed"));
          }
          const forecastYear = Number(data.forecastYear) || datasetOptions.forecastYear;
          const monthlyPredictions = monthlyPredictionsFromApi(data);
          const yearlyPrediction = aggregateYearlyFromMonthly(monthlyPredictions, {
            forecastYear,
            year: forecastYear,
          });
          if (!yearlyPrediction) {
            throw new Error(
              "Could not read prediction results. Please try again.",
            );
          }
          return {
            label: [
              combo.city,
              combo.gender,
              combo.color,
              combo.material,
              combo.sleeveType !== "Not Specified" ? combo.sleeveType : null,
            ]
              .filter(Boolean)
              .join(" · "),
            prediction: yearlyPrediction,
            monthlyPredictions,
            forecastYear,
          };
        }),
      );

      const forecastYear =
        comboRuns[0]?.forecastYear ?? datasetOptions.forecastYear;

      const averaged = averagePredictionResults(
        comboRuns.map((run) => run.prediction),
      );
      if (!averaged) {
        throw new Error("Could not read prediction results. Please try again.");
      }
      const averagedWithYear = { ...averaged, forecastYear, year: forecastYear };

      const monthlyTrend = averageMonthlyTrend(
        comboRuns.map((run) => run.monthlyPredictions),
        forecastYear,
        datasetOptions.months,
      );
      const scenarios = comboRuns.map(({ label, prediction }) => ({
        label,
        prediction,
      }));

      setClientCache(
        predictionCacheKey,
        {
          prediction: averagedWithYear,
          monthlyTrend,
          scenarios,
        },
        60_000,
      );

      setPredictionResult(averagedWithYear);
      setMonthlyTrendData(monthlyTrend);
      setScenarioResults(scenarios);
      toast.success(
        combos.length > 1
          ? `Prediction averaged across ${combos.length} selected option sets.`
          : "Prediction generated successfully. Now you can download report.",
      );
      try {
        const response = await fetch("/api/trends/predict/history?limit=15", {
          credentials: "include",
        });
        if (response.ok) {
          const payload = await response.json();
          setHistoryItems(Array.isArray(payload?.items) ? payload.items : []);
        }
      } catch {
        // Best-effort refresh only.
      }
    } catch (error) {
      setPredictionError(
        error instanceof Error ? error.message : "Prediction failed",
      );
    } finally {
      setPredicting(false);
    }
  };

  if (!category) {
    return <div>Category not found</div>;
  }

  return (
    <div className="min-h-full">
      {/* Back Button */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link href="/dashboard/trends">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Categories
          </Button>
        </Link>
        <ReportGenerator
          className="h-10 bg-foreground text-background"
          getReportData={() => ({
            reportTitle: `${category.name} Category Report`,
            filePrefix: `${categoryId}-category`,
            category: {
              name: category.name,
              tag: category.tag,
              description: category.description,
            },
            summary: categoryTrends
              ? {
                  totalSales: categoryTrends.summary.totalSales,
                  totalPredictedSales:
                    categoryTrends.summary.totalPredictedSales,
                  totalProducts: categoryTrends.summary.totalProducts,
                  avgPrice: categoryTrends.summary.avgPrice,
                  growthPct: categoryTrends.summary.growthPct,
                }
              : undefined,
            insights: categoryTrends?.insights,
            chartData: categoryTrends?.chartData,
            prediction: predictionResult
              ? {
                  productName: predictionResult.productName,
                  category: predictionResult.category,
                  predictedSales: predictionResult.predictedSales,
                  salesPotentialScore: predictionResult.salesPotentialScore,
                  salesPotentialCategory:
                    predictionResult.salesPotentialCategory,
                  discountedPrice: predictionResult.discountedPrice,
                  priceCategory: predictionResult.priceCategory,
                  insightSummary: predictionInsight?.summary,
                  insightRecommendation: predictionInsight?.recommendation,
                  stockMin: predictionInsight?.stock.minUnits,
                  stockRecommended: predictionInsight?.stock.recommendedUnits,
                  stockMax: predictionInsight?.stock.maxUnits,
                  stockMessage: predictionInsight?.stockMessage,
                }
              : undefined,
            seasonalTrend:
              monthlyTrendData.length > 0 ? monthlyTrendData : undefined,
            predictionInputs:
              predictionResult && Object.keys(predictionForm).length > 0
                ? {
                    "Product Name": predictionForm.productName,
                    Price: predictionForm.price,
                    Discount: predictionForm.discountPct,
                    City: predictionForm.city.join(", "),
                    Gender: predictionForm.gender.join(", "),
                    Color: predictionForm.color.join(", "),
                    Material: predictionForm.material.join(", "),
                    Combo: predictionForm.isCombo,
                    "Flash Sale": predictionForm.isFlashSale,
                  }
                : undefined,
          })}
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 md:mb-8"
      >
        <div className="flex items-center gap-3 md:gap-4 mb-4">
          <div className="text-4xl md:text-6xl">{category.emoji}</div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
              {category.name}
            </h1>
            <span
              className={`inline-block px-2 md:px-3 py-1 text-xs md:text-sm font-semibold rounded-full border ${category.tagColor}`}
            >
              {category.tag}
            </span>
          </div>
        </div>
        <p className="text-muted-foreground text-base md:text-lg">
          {category.description}
        </p>
      </motion.div>

      {/* Stats Cards */}
      {categoryLoading && (
        <div className="mb-6 md:mb-8 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4 md:p-6 border-2 border-border bg-card/80">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
              <span className="text-xs md:text-sm text-muted-foreground">
                Total Sales
              </span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-foreground">
              PKR {Math.round(metrics.totalSales).toLocaleString()}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              {metrics.salesGrowthPct >= 0 ? "+" : ""}
              {metrics.salesGrowthPct.toFixed(1)}% from first to last month
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 md:p-6 border-2 border-border bg-card/80">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <Package className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
              <span className="text-xs md:text-sm text-muted-foreground">
                Products
              </span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-foreground">
              {Math.round(metrics.totalProducts).toLocaleString()}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Records in this category
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4 md:p-6 border-2 border-border bg-card/80">
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
              <span className="text-xs md:text-sm text-muted-foreground">
                Avg. Price
              </span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-foreground">
              PKR {metrics.avgPrice.toFixed(0)}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Actual average from dataset
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Key Insights - derived from API data */}
      {categoryTrends?.insights && categoryTrends.insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-4 md:p-6 border-2 border-border bg-muted/35">
            <h3 className="text-lg md:text-xl font-bold text-foreground mb-4">
              Key Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryTrends.insights.map((insight: string, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-foreground mt-2" />
                  <span className="text-muted-foreground">{insight}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Predict New Product */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="border border-border p-4 md:p-6 bg-card/80">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center text-background">
              <Lightbulb className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Predict a {category.name} Product
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mb-5 ml-11">
            {predictionMode === "standard"
              ? "All inputs must match values from the active dataset before prediction runs."
              : `Rank the top 3 ${category.name} products using the trained model and dataset baselines.`}
          </p>

          <div className="mb-6 ml-11">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Prediction mode
            </p>
            <ToggleGroup
              type="single"
              value={predictionMode}
              onValueChange={handlePredictionModeChange}
              variant="outline"
              className="w-full max-w-md grid grid-cols-2"
            >
              <ToggleGroupItem value="standard" className="flex-1">
                Standard
              </ToggleGroupItem>
              <ToggleGroupItem value="generic" className="flex-1">
                Generic
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {predictionMode === "generic" ? (
            <form onSubmit={handleGenericPredictSubmit} className="space-y-6">
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Category:{" "}
                <span className="font-semibold text-foreground">
                  {category.name}
                </span>{" "}
                — predictions use this page&apos;s category automatically.
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" disabled={predicting}>
                  {predicting ? "Predicting..." : "Run Prediction"}
                </Button>
              </div>

              {predictionError && (
                <p className="text-sm text-red-600 font-medium">
                  {predictionError}
                </p>
              )}
            </form>
          ) : (
          <form onSubmit={handlePredictSubmit} className="space-y-6">
            {/* Product Name from dataset + Category */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1 flex-1 min-w-45">
                <SearchableSelect
                  id="cp-name"
                  label={`Product Name (${datasetOptions.productNames.length} in dataset)`}
                  options={productNameOptions}
                  value={predictionForm.productName}
                  onChange={(v) =>
                    handlePredictionFieldChange("productName", v)
                  }
                  placeholder="Select a product name from dataset"
                  emptyText="This name does not exist in the dataset"
                />
                <p className="text-[11px] text-muted-foreground">
                  Only product names that already exist in the active dataset
                  can be predicted.
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Category:{" "}
                <span className="font-medium text-foreground">
                  {modelCategory}
                </span>
              </div>
            </div>

            {/* Price & Discount — constrained to active dataset ranges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="cp-price"
                  className="text-xs font-medium text-muted-foreground block"
                >
                  Price (PKR)
                </label>
                <Input
                  id="cp-price"
                  type="number"
                  min={
                    Number.isFinite(datasetOptions.ranges.price.min)
                      ? datasetOptions.ranges.price.min
                      : 1
                  }
                  max={
                    Number.isFinite(datasetOptions.ranges.price.max)
                      ? datasetOptions.ranges.price.max
                      : undefined
                  }
                  placeholder="1000"
                  value={predictionForm.price}
                  onChange={(e) =>
                    handlePredictionFieldChange("price", e.target.value)
                  }
                  className="h-9"
                />
                {Number.isFinite(datasetOptions.ranges.price.max) &&
                  datasetOptions.ranges.price.max <
                    Number.POSITIVE_INFINITY && (
                    <p className="text-[11px] text-muted-foreground">
                      Dataset range for {modelCategory}: PKR{" "}
                      {datasetOptions.ranges.price.min.toLocaleString()} – PKR{" "}
                      {datasetOptions.ranges.price.max.toLocaleString()}{" "}
                      (max {datasetOptions.ranges.price.max.toLocaleString()})
                    </p>
                  )}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="cp-discount"
                  className="text-xs font-medium text-muted-foreground block"
                >
                  Discount (%)
                </label>
                <Input
                  id="cp-discount"
                  type="number"
                  min={
                    Number.isFinite(datasetOptions.ranges.discountPct.min)
                      ? datasetOptions.ranges.discountPct.min
                      : 0
                  }
                  max={
                    Number.isFinite(datasetOptions.ranges.discountPct.max)
                      ? datasetOptions.ranges.discountPct.max
                      : 100
                  }
                  placeholder="30"
                  value={predictionForm.discountPct}
                  onChange={(e) =>
                    handlePredictionFieldChange("discountPct", e.target.value)
                  }
                  className="h-9"
                />
                {Number.isFinite(datasetOptions.ranges.discountPct.max) && (
                  <p className="text-[11px] text-muted-foreground">
                    Dataset range for {modelCategory}:{" "}
                    {datasetOptions.ranges.discountPct.min}% –{" "}
                    {datasetOptions.ranges.discountPct.max}% (max{" "}
                    {datasetOptions.ranges.discountPct.max}%)
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Forecast target:{" "}
              <span className="font-semibold text-foreground">
                {datasetOptions.forecastYear}
              </span>{" "}
              (model trained on {datasetOptions.datasetYearMin}–
              {datasetOptions.datasetYearMax}; predicts the next calendar year
              for each month in the dataset)
            </div>

            {/* City, Gender, Color — values loaded from active dataset */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MultiSelectDropdown
                id="cp-city"
                label={`City (${datasetOptions.cities.length} in dataset)`}
                options={cityOptions}
                values={predictionForm.city}
                onToggle={(option, checked) =>
                  handleMultiSelectToggle("city", option, checked)
                }
                onSelectAll={(selectAll) =>
                  handleSelectAll("city", datasetOptions.cities, selectAll)
                }
              />
              <MultiSelectDropdown
                id="cp-gender"
                label="Gender"
                options={genderOptions}
                values={predictionForm.gender}
                onToggle={(option, checked) =>
                  handleMultiSelectToggle("gender", option, checked)
                }
                onSelectAll={(selectAll) =>
                  handleSelectAll("gender", datasetOptions.gender, selectAll)
                }
              />
              <MultiSelectDropdown
                id="cp-color"
                label="Color"
                options={colorOptions}
                values={predictionForm.color}
                onToggle={(option, checked) =>
                  handleMultiSelectToggle("color", option, checked)
                }
                onSelectAll={(selectAll) =>
                  handleSelectAll("color", datasetOptions.color, selectAll)
                }
              />
            </div>

            {/* Sleeve (T-Shirt only) + Material — values loaded from active dataset */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modelCategory === "T-Shirt" && (
                <MultiSelectDropdown
                  id="cp-sleeve"
                  label="Sleeve Type"
                  options={sleeveOptions}
                  values={predictionForm.sleeveType}
                  onToggle={(option, checked) =>
                    handleMultiSelectToggle("sleeveType", option, checked)
                  }
                  onSelectAll={(selectAll) =>
                    handleSelectAll(
                      "sleeveType",
                      datasetOptions.sleeveType,
                      selectAll,
                    )
                  }
                />
              )}
              <MultiSelectDropdown
                id="cp-material"
                label="Material"
                options={materialOptions}
                values={predictionForm.material}
                onToggle={(option, checked) =>
                  handleMultiSelectToggle("material", option, checked)
                }
                onSelectAll={(selectAll) =>
                  handleSelectAll(
                    "material",
                    datasetOptions.material,
                    selectAll,
                  )
                }
              />
            </div>

            {/* Toggles + Submit */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label
                htmlFor="cp-combo"
                className="text-sm text-muted-foreground flex items-center gap-2 cursor-pointer select-none"
              >
                <Checkbox
                  id="cp-combo"
                  checked={predictionForm.isCombo}
                  onCheckedChange={(state) =>
                    handlePredictionFieldChange("isCombo", state === true)
                  }
                />
                Combo Item
              </label>
              <label
                htmlFor="cp-flash"
                className="text-sm text-muted-foreground flex items-center gap-2 cursor-pointer select-none"
              >
                <Checkbox
                  id="cp-flash"
                  checked={predictionForm.isFlashSale}
                  onCheckedChange={(state) =>
                    handlePredictionFieldChange("isFlashSale", state === true)
                  }
                />
                Flash Sale
              </label>
              <Button type="submit" disabled={predicting}>
                {predicting ? "Predicting..." : "Run Prediction"}
              </Button>
            </div>

            {predictionError && (
              <p className="text-sm text-red-600 font-medium">
                {predictionError}
              </p>
            )}
          </form>
          )}

          {predictionMode === "generic" && genericTopProducts.length > 0 && (
            <div className="mt-5 rounded-xl border border-border bg-muted/30 p-5">
              <h3 className="text-base font-bold text-foreground mb-4">
                Top 3 Products — {category.name}
              </h3>
              <div className="space-y-3">
                {genericTopProducts.map((item, index) => (
                  <div
                    key={`${item.productName}-${item.rank}`}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card/80 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">
                        {GENERIC_RANK_MEDALS[index] ?? `#${item.rank}`}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.salesPotentialCategory}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">
                        Prediction Score: {item.salesPotentialScore.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(item.predictedSales).toLocaleString()} units
                        / yr
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <MonthlySalesChart
                data={monthlyTrendData}
                title={`#1 ${genericLeaderName} — Monthly Forecast`}
                tooltipStyle={chartTooltipStyle}
              />
            </div>
          )}

          {predictionMode === "standard" && predictionResult && (
            <div className="mt-5 rounded-xl border border-border bg-muted/30 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-foreground text-base">
                    {predictionResult.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {predictionResult.category} &middot;{" "}
                    {predictionResult.priceCategory}
                    {predictionResult.forecastYear != null && (
                      <> &middot; Forecast {predictionResult.forecastYear}</>
                    )}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    predictionResult.salesPotentialCategory === "High Potential"
                      ? "bg-foreground text-background"
                      : predictionResult.salesPotentialCategory ===
                          "Medium Potential"
                        ? "bg-muted text-foreground"
                        : predictionResult.salesPotentialCategory ===
                            "Low-Medium Potential"
                          ? "bg-muted/70 text-muted-foreground"
                          : "bg-muted/70 text-muted-foreground"
                  }`}
                >
                  {predictionResult.salesPotentialCategory}
                </span>
              </div>
              {scenarioResults.length > 1 && (
                <p className="text-xs text-muted-foreground mb-3">
                  Showing average across {scenarioResults.length} selected
                  option sets.
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-card/80 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(
                      predictionResult.predictedSales,
                    ).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Predicted Sales (year total)
                    {scenarioResults.length > 1 ? " · avg across sets" : ""}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card/80 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {(Number.isFinite(predictionResult.salesPotentialScore)
                      ? predictionResult.salesPotentialScore
                      : 0
                    ).toFixed(1)}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Potential Score (year avg)
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card/80 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    PKR{" "}
                    {Math.round(
                      Number.isFinite(predictionResult.discountedPrice)
                        ? predictionResult.discountedPrice
                        : 0,
                    ).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Discounted Price
                  </p>
                </div>
              </div>

              {scenarioResults.length > 1 && (
                <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-border bg-card/60 divide-y divide-border">
                  {scenarioResults.map((scenario) => (
                    <div
                      key={scenario.label}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground truncate">
                        {scenario.label}
                      </span>
                      <span className="font-semibold text-foreground shrink-0">
                        {Math.round(
                          scenario.prediction.predictedSales,
                        ).toLocaleString()}{" "}
                        sales (year)
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {monthlyTrendData.length > 0 && (
                <MonthlySalesChart
                  data={monthlyTrendData}
                  tooltipStyle={chartTooltipStyle}
                />
              )}

              {predictionInsight && (
                <div className="mt-6 pt-5 border-t border-border space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      Stock Recommendation
                    </h3>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        predictionInsight.tier === "high"
                          ? "bg-foreground text-background"
                          : predictionInsight.tier === "medium"
                            ? "bg-muted text-foreground"
                            : "bg-muted/70 text-muted-foreground"
                      }`}
                    >
                      {predictionInsight.tierLabel}
                    </span>
                  </div>
                  <blockquote className="border-l-4 border-primary/40 pl-4 text-sm text-muted-foreground italic">
                    {predictionInsight.summary}
                  </blockquote>
                  <p className="text-sm text-foreground leading-relaxed">
                    {predictionInsight.recommendation}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border bg-card/80 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {predictionInsight.stock.minUnits.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Minimum Stock
                      </p>
                    </div>
                    <div className="rounded-lg border-2 border-primary/60 bg-primary/5 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {predictionInsight.stock.recommendedUnits.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                        Recommended Stock
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {predictionInsight.stock.bufferPct >= 0
                          ? `+${predictionInsight.stock.bufferPct}% buffer`
                          : `${predictionInsight.stock.bufferPct}% vs demand`}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-card/80 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {predictionInsight.stock.maxUnits.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Maximum Stock
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-foreground leading-relaxed">
                    {predictionInsight.stockMessage}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        className="mt-6"
      >
        <Card className="border border-border p-4 md:p-6 bg-card/80">
          <h3 className="text-lg font-bold text-foreground mb-3">
            Past Predictions{" "}
            {user?.role === "admin" ? "(All Users)" : "(Your History)"}
          </h3>
          {historyItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No predictions found yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {historyItems.map((item, index) => (
                <div
                  key={`${item.createdAt ?? "na"}-${index}`}
                  className="rounded-lg border border-border/70 bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {String(item?.input?.productName ?? "Product")} -{" "}
                      {String(item?.input?.category ?? "Category")}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Predicted:{" "}
                    {Number(item?.output?.predictedSales ?? 0).toLocaleString()}{" "}
                    | Potential:{" "}
                    {String(item?.output?.salesPotentialCategory ?? "N/A")} |
                    Source: {String(item?.source ?? "N/A")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
