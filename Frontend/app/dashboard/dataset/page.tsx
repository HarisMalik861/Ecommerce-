"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Download,
  Loader2,
  FileSpreadsheet,
  Database,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { authFetch, getPublicBackendUrl } from "@/lib/auth-fetch";

const REQUIRED_COLUMNS = [
  "Product_Name",
  "Category",
  "Gender",
  "Color",
  "Sleeve_Type",
  "Material",
  "Combo_Item",
  "Is_Flash_Sale",
  "Price",
  "Discount_Pct",
  "Month",
  "Year",
  "City",
  "Sales",
];

interface DatasetItem {
  id: string;
  fileName: string;
  originalName: string;
  rows: number;
  sizeBytes: number;
  isBaseline: boolean;
  uploadedAt: string;
  isActive: boolean;
  hasCachedModel?: boolean;
}

interface PreviousDatasetPrompt {
  previousId: string;
  previousName: string;
  isBaseline: boolean;
}

export default function DatasetPage() {
  const [deduplicateOnUpload, setDeduplicateOnUpload] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<{
    status: string;
    progress: number;
    message?: string;
  } | null>(null);
  const [preprocessingReport, setPreprocessingReport] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [uploadError, setUploadError] = useState<{
    message: string;
    missingColumns?: string[];
    extraColumns?: string[];
    details?: string[];
    expectedColumns?: string[];
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState(false);
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    rows: number;
    totalRows?: number;
    fileName: string;
    newDatasetId?: string;
    previousDatasetId?: string;
    retrained: boolean;
    refreshed: boolean;
  } | null>(null);
  const [previousPrompt, setPreviousPrompt] =
    useState<PreviousDatasetPrompt | null>(null);

  const columnsPreview = useMemo(() => REQUIRED_COLUMNS.join(", "), []);

  /** Prefer direct Render calls for large CSVs (Vercel body limit ~4.5MB). */
  const datasetApi = useCallback((path: string) => {
    const backend = getPublicBackendUrl();
    if (backend) return `${backend}${path}`;
    // Local / fallback through Next.js BFF
    if (path.startsWith("/v1/admin/datasets/upload")) {
      return "/api/admin/dataset/upload";
    }
    if (path.startsWith("/v1/admin/jobs/")) {
      const jobId = path.split("/").pop() || "";
      return `/api/admin/dataset/upload?jobId=${encodeURIComponent(jobId)}`;
    }
    if (path === "/v1/admin/datasets") return "/api/admin/dataset/list";
    if (path.includes("/activate")) {
      return "/api/admin/dataset/active";
    }
    if (path.startsWith("/v1/admin/datasets/")) {
      const id = path.split("/").pop() || "";
      return `/api/admin/dataset/${encodeURIComponent(id)}`;
    }
    return path;
  }, []);

  const loadDatasets = useCallback(async (): Promise<DatasetItem[]> => {
    try {
      const response = await authFetch(datasetApi("/v1/admin/datasets"));
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load datasets");
      }
      const items = Array.isArray(payload.datasets)
        ? (payload.datasets as DatasetItem[])
        : [];
      setDatasets(items);
      setActiveId(payload.activeId ?? null);
      return items;
    } catch {
      toast.error("Could not load dataset list");
      return [];
    } finally {
      setDatasetsLoading(false);
    }
  }, [datasetApi]);

  const pollJobStatus = async (jobId: string) => {
    const response = await authFetch(
      datasetApi(`/v1/admin/jobs/${encodeURIComponent(jobId)}`),
    );
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || "Failed to fetch job status");
    }

    setJobStatus({
      status: String(payload.status ?? "queued"),
      progress: Number(payload.progress ?? 0),
      message: payload.message,
    });

    if (payload.status === "completed") {
      const result = payload?.result ?? {};
      const newDatasetId = result?.newDatasetId as string | undefined;
      const previousDatasetId = result?.previousDatasetId as string | undefined;
      const activatedId = result?.activeId as string | undefined;

      if (newDatasetId) {
        setUploadResult({
          rows: result?.rows ?? payload?.rows ?? 0,
          totalRows: result?.totalRows,
          fileName: payload?.fileName ?? "Uploaded CSV",
          newDatasetId,
          previousDatasetId,
          retrained: Boolean(result?.retrained),
          refreshed: Boolean(result?.predictionsRefreshed),
        });
        setPreprocessingReport(
          (result?.preprocessingReport as Record<string, unknown>) ?? null,
        );

        const refreshed = await loadDatasets();
        if (
          previousDatasetId &&
          newDatasetId &&
          previousDatasetId !== newDatasetId
        ) {
          const prev = refreshed.find((d) => d.id === previousDatasetId);
          setPreviousPrompt({
            previousId: previousDatasetId,
            previousName: prev?.originalName ?? previousDatasetId,
            isBaseline: Boolean(prev?.isBaseline),
          });
        }
        toast.success("Dataset registered and model retrained.");
      } else if (activatedId) {
        await loadDatasets();
        toast.success("Active dataset switched and model retrained.");
      } else {
        await loadDatasets();
        toast.success("Job completed.");
      }

      setActiveJobId(null);
      localStorage.removeItem("datasetUploadJobId");
      return true;
    }

    if (payload.status === "failed") {
      setUploadError({
        message: payload?.message || "Dataset job failed.",
      });
      setActiveJobId(null);
      localStorage.removeItem("datasetUploadJobId");
      toast.error(payload?.message || "Dataset job failed.");
      return true;
    }

    return false;
  };

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  useEffect(() => {
    const rememberedJob =
      typeof window !== "undefined"
        ? localStorage.getItem("datasetUploadJobId")
        : null;
    if (rememberedJob && !activeJobId) {
      setActiveJobId(rememberedJob);
    }
  }, [activeJobId]);

  useEffect(() => {
    if (!activeJobId) return;
    let stopped = false;
    const tick = async () => {
      try {
        const done = await pollJobStatus(activeJobId);
        if (done) stopped = true;
      } catch {
        setUploadError({ message: "Could not fetch background job status." });
      }
    };
    void tick();
    const interval = setInterval(() => {
      if (!stopped) void tick();
    }, 2500);
    return () => clearInterval(interval);
  }, [activeJobId]);

  const onUpload = async () => {
    if (!file) {
      toast.error("Please choose a CSV file first.");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setUploadError(null);
    setPreprocessingReport(null);
    setPreviousPrompt(null);

    try {
      const formData = new FormData();
      formData.append("dataset", file);
      formData.append("deduplicate", deduplicateOnUpload ? "true" : "false");

      // Upload straight to Render to avoid Vercel request size limits.
      const response = await authFetch(
        datasetApi("/v1/admin/datasets/upload"),
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        setUploadError({
          message: payload?.error || payload?.detail || "Upload failed",
          missingColumns: payload?.missingColumns,
          extraColumns: payload?.extraColumns,
          details: payload?.details,
          expectedColumns: payload?.expectedColumns,
        });
        toast.error(payload?.error || payload?.detail || "Upload failed");
        return;
      }

      const jobId = String(payload.jobId ?? "");
      if (!jobId) throw new Error("Missing job id from upload response");

      setActiveJobId(jobId);
      localStorage.setItem("datasetUploadJobId", jobId);
      setJobStatus({
        status: String(payload.status ?? "queued"),
        progress: Number(payload.progress ?? 0),
        message: payload.message,
      });
      toast.success("Upload accepted. Processing in background.");
    } catch {
      toast.error("Failed to upload dataset");
    } finally {
      setIsUploading(false);
    }
  };

  const onActivateDataset = async (datasetId: string) => {
    if (datasetId === activeId) return;
    setActivatingId(datasetId);
    try {
      const backend = getPublicBackendUrl();
      const response = await authFetch(
        backend
          ? `${backend}/v1/admin/datasets/${encodeURIComponent(datasetId)}/activate`
          : "/api/admin/dataset/active",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: backend ? undefined : JSON.stringify({ id: datasetId }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload?.error || payload?.detail || "Failed to activate dataset");
        return;
      }

      const jobId = String(payload.jobId ?? "");
      if (!jobId) {
        toast.error("Missing activation job id");
        return;
      }

      setActiveJobId(jobId);
      localStorage.setItem("datasetUploadJobId", jobId);
      setJobStatus({
        status: "queued",
        progress: 2,
        message: "Switching active dataset...",
      });
      toast.success("Switching dataset. Retraining in background...");
    } catch {
      toast.error("Failed to activate dataset");
    } finally {
      setActivatingId(null);
    }
  };

  const onDeleteDataset = async (datasetId: string) => {
    setDeletingId(datasetId);
    try {
      const response = await authFetch(
        datasetApi(`/v1/admin/datasets/${encodeURIComponent(datasetId)}`),
        { method: "DELETE" },
      );
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload?.error || payload?.detail || "Failed to delete dataset");
        return;
      }
      toast.success("Dataset deleted.");
      if (previousPrompt?.previousId === datasetId) {
        setPreviousPrompt(null);
      }
      await loadDatasets();
    } catch {
      toast.error("Failed to delete dataset");
    } finally {
      setDeletingId(null);
    }
  };

  const onDownloadSample = async () => {
    setIsDownloadingSample(true);
    try {
      const response = await authFetch("/api/admin/dataset/sample", {
        method: "GET",
      });
      if (!response.ok) {
        const payload = await response.json();
        toast.error(payload?.error || "Failed to download sample");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "dataset_sample.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Sample CSV downloaded.");
    } catch {
      toast.error("Failed to download sample CSV");
    } finally {
      setIsDownloadingSample(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full space-y-10 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-4"
      >
        <h1
          className="text-5xl font-black tracking-tighter"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Dataset <span className="gradient-text">Manager.</span>
        </h1>
        <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-3xl">
          Upload a CSV with the exact training columns. Each upload is saved as
          a separate dataset file. Choose which dataset is active for training
          and predictions — datasets are never merged automatically.
        </p>
      </motion.div>

      <Card className="glass-card border-border/70 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Database className="w-6 h-6 text-foreground" />
            Your Datasets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {datasetsLoading ? (
            <p className="text-sm text-muted-foreground">Loading datasets...</p>
          ) : datasets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No datasets found.</p>
          ) : (
            <div className="space-y-3">
              {datasets.map((ds) => (
                <div
                  key={ds.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground truncate">
                        {ds.originalName}
                      </p>
                      {ds.isActive && (
                        <Badge className="text-[10px] uppercase">Active</Badge>
                      )}
                      {ds.isBaseline && (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase"
                        >
                          Baseline
                        </Badge>
                      )}
                      {ds.hasCachedModel && (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase border-primary/40 text-primary"
                        >
                          Trained
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Number(ds.rows ?? 0).toLocaleString()} rows ·{" "}
                      {formatBytes(ds.sizeBytes ?? 0)}
                      {ds.uploadedAt &&
                        ` · ${new Date(ds.uploadedAt).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={ds.isActive ? "secondary" : "default"}
                      disabled={
                        ds.isActive ||
                        Boolean(activeJobId) ||
                        activatingId === ds.id
                      }
                      onClick={() => void onActivateDataset(ds.id)}
                    >
                      {activatingId === ds.id ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : ds.isActive ? (
                        <CheckCircle2 className="mr-2 h-3 w-3" />
                      ) : null}
                      {ds.isActive ? "Active" : "Set as Active"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        ds.isActive || ds.isBaseline || deletingId === ds.id
                      }
                      onClick={() => void onDeleteDataset(ds.id)}
                    >
                      {deletingId === ds.id ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-3 w-3" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-border/70 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileSpreadsheet className="w-6 h-6 text-foreground" />
            Upload New Dataset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Required columns (exact names and order):
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground wrap-break-word">
              {columnsPreview}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-border file:bg-foreground file:px-4 file:py-2 file:text-background hover:file:bg-foreground/90"
            />
            <Button
              onClick={onUpload}
              disabled={!file || isUploading || Boolean(activeJobId)}
              className="sm:w-auto"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Dataset
                </>
              )}
            </Button>
          </div>

          {activeJobId && jobStatus && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Background job ({jobStatus.status})
              </p>
              <Progress
                value={Math.max(0, Math.min(100, jobStatus.progress))}
              />
              <p className="text-xs text-muted-foreground">
                {jobStatus.message || "Processing..."}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Job ID: {activeJobId}
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={deduplicateOnUpload}
              onChange={(event) => setDeduplicateOnUpload(event.target.checked)}
              className="h-4 w-4 rounded border-border bg-card"
            />
            Remove duplicate rows from uploaded CSV before saving
          </label>

          <div className="border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={onDownloadSample}
              disabled={isDownloadingSample}
            >
              {isDownloadingSample ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Sample CSV
                </>
              )}
            </Button>
          </div>

          {uploadResult && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-foreground">
              Uploaded <strong>{uploadResult.fileName}</strong> with{" "}
              <strong>{uploadResult.rows}</strong> cleaned rows saved as a new
              separate dataset.
              {typeof uploadResult.totalRows === "number" && (
                <>
                  {" "}
                  Dataset size: <strong>{uploadResult.totalRows}</strong> rows.
                </>
              )}{" "}
              It is now the <strong>active</strong> dataset. Model retraining{" "}
              <strong>
                {uploadResult.retrained ? "completed" : "not run"}
              </strong>
              ; prediction refresh{" "}
              <strong>
                {uploadResult.refreshed ? "completed" : "not run"}
              </strong>
              .
            </div>
          )}

          {previousPrompt && !previousPrompt.isBaseline && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Your new dataset is now active. What should we do with the
                previous dataset (
                <strong>{previousPrompt.previousName}</strong>)?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingId === previousPrompt.previousId}
                  onClick={() =>
                    void onDeleteDataset(previousPrompt.previousId)
                  }
                >
                  {deletingId === previousPrompt.previousId ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-3 w-3" />
                  )}
                  Delete previous dataset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviousPrompt(null)}
                >
                  Keep previous dataset safe
                </Button>
              </div>
            </div>
          )}

          {preprocessingReport && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-foreground space-y-3">
              <p className="font-semibold">Preprocessing report</p>
              <p>
                Input rows:{" "}
                <strong>{String(preprocessingReport.inputRows ?? 0)}</strong>,
                rows after cleaning:{" "}
                <strong>
                  {String(preprocessingReport.rowsAfterCleaning ?? 0)}
                </strong>
                , duplicates detected:{" "}
                <strong>
                  {String(preprocessingReport.duplicateRowsDetected ?? 0)}
                </strong>
                .
              </p>
            </div>
          )}

          {uploadError && (
            <div className="rounded-lg border border-border bg-destructive/10 p-4 text-sm text-destructive space-y-3">
              <p className="font-semibold">{uploadError.message}</p>
              {(uploadError.missingColumns?.length ?? 0) > 0 && (
                <div>
                  <p className="font-semibold">Missing columns</p>
                  <p className="text-destructive/80">
                    {uploadError.missingColumns?.join(", ")}
                  </p>
                </div>
              )}
              {(uploadError.extraColumns?.length ?? 0) > 0 && (
                <div>
                  <p className="font-semibold">Unexpected columns</p>
                  <p className="text-destructive/80">
                    {uploadError.extraColumns?.join(", ")}
                  </p>
                </div>
              )}
              {(uploadError.details?.length ?? 0) > 0 && (
                <ul className="list-disc pl-5 space-y-1">
                  {uploadError.details?.map((detail, index) => (
                    <li key={`${detail}-${index}`}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
