import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Files,
  Loader2,
  X,
  ScanText,
  Sparkles,
  ShieldCheck,
  Database,
  Circle,
} from "lucide-react";
import { Card, Button, StatusBadge, MethodTag } from "../components/ui";
import { getStats, listDocuments, uploadDocument } from "../lib/api";

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const PROCESSING_STAGES = [
  {
    key: "upload",
    label: "Uploading document",
    detail: "Sending the PDF to the server",
    icon: UploadCloud,
  },
  {
    key: "extract",
    label: "Extracting text",
    detail: "Reading embedded text from the PDF (pdfplumber)",
    icon: FileText,
  },
  {
    key: "ocr",
    label: "Checking scan quality",
    detail: "Falling back to OCR if the PDF is image-based",
    icon: ScanText,
  },
  {
    key: "ai",
    label: "Running AI abstraction",
    detail: "Gemini is extracting the 10 lease fields",
    icon: Sparkles,
  },
  {
    key: "validate",
    label: "Validating fields",
    detail: "Scoring confidence & flagging anything uncertain",
    icon: ShieldCheck,
  },
  {
    key: "save",
    label: "Saving record",
    detail: "Persisting the abstraction and preparing the review",
    icon: Database,
  },
];

// How long (ms) each simulated post-upload stage lingers before advancing.
// The pipeline runs as a single backend request, so stages after "upload"
// are timed estimates of real work (extraction -> OCR check -> AI -> save),
// capped one stage before the end until the actual response arrives.
const STAGE_INTERVAL_MS = 1400;

const SUMMARY = [
  { key: "total", label: "Total Uploaded", icon: Files, color: "#0A0A0A" },
  { key: "processed", label: "Documents Processed", icon: FileText, color: "#1E40AF" },
  { key: "needs_review", label: "Needs Review", icon: AlertTriangle, color: "#92400E" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "#166534" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, processed: 0, needs_review: 0, approved: 0 });
  const [docs, setDocs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const inputRef = useRef(null);
  const stageTimerRef = useRef(null);

  const clearStageTimer = useCallback(() => {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }, []);

  const startStageTimer = useCallback(() => {
    clearStageTimer();
    // Advance through the post-upload stages, but never past the
    // second-to-last one — the final stage is only shown once the
    // real backend response comes back.
    stageTimerRef.current = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, PROCESSING_STAGES.length - 2));
    }, STAGE_INTERVAL_MS);
  }, [clearStageTimer]);

  useEffect(() => clearStageTimer, [clearStageTimer]);

  const refresh = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([getStats(), listDocuments()]);
      setStats(s);
      setDocs(d);
    } catch (e) {
      setError("Failed to load dashboard data.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFiles = useCallback(
    async (files) => {
      setError("");
      const file = files && files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are accepted.");
        return;
      }
      setUploading(true);
      setProgress(0);
      setStageIndex(0);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadDocument(formData, (e) => {
          if (!e.total) return;
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
          if (pct >= 100) {
            setStageIndex(1);
            startStageTimer();
          }
        });
        clearStageTimer();
        setStageIndex(PROCESSING_STAGES.length - 1);
        await refresh();
        // navigate to review of the new doc
        if (result && result.id) navigate(`/review/${result.id}`);
      } catch (e) {
        const msg = e?.response?.data?.detail || "Upload failed. Please try again.";
        setError(typeof msg === "string" ? msg : "Upload failed.");
      } finally {
        clearStageTimer();
        setUploading(false);
        setProgress(0);
        setStageIndex(0);
      }
    },
    [navigate, refresh, startStageTimer, clearStageTimer]
  );

  const recent = docs.slice(0, 5);

  return (
    <div className="app-fade-in space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9CA3AF]">
          Overview
        </p>
        <h2 className="mt-1 font-heading text-3xl font-bold tracking-tight text-ink">
          Upload &amp; Dashboard
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[#4B5563]">
          Upload a commercial lease PDF to extract the 10 core abstraction fields with
          AI, then review and approve the record.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.key} className="p-6" data-testid={`stat-card-${c.key}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    {c.label}
                  </p>
                  <p
                    className="mt-3 font-heading text-4xl font-bold tabular-nums"
                    style={{ color: c.color }}
                    data-testid={`stat-value-${c.key}`}
                  >
                    {stats[c.key] ?? 0}
                  </p>
                </div>
                <Icon size={20} style={{ color: c.color }} strokeWidth={2} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Upload zone */}
      <div>
        <h3 className="mb-3 font-heading text-lg font-semibold text-ink">Upload a Lease</h3>
        <div
          data-testid="upload-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!uploading) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`rounded-md border-2 border-dashed bg-white text-center transition-colors duration-150 ${
            uploading
              ? "cursor-default px-6 py-10 border-line-strong"
              : `flex cursor-pointer flex-col items-center justify-center px-6 py-14 ${
                  dragOver ? "border-ink bg-canvas-muted" : "border-line-strong hover:border-ink"
                }`
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            data-testid="upload-file-input"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="mx-auto max-w-md" data-testid="upload-status">
              <p className="mb-5 text-center text-sm font-semibold text-ink">
                Processing document…
              </p>
              <ol className="space-y-3">
                {PROCESSING_STAGES.map((stage, i) => {
                  const Icon = stage.icon;
                  const isDone = i < stageIndex;
                  const isCurrent = i === stageIndex;
                  return (
                    <li key={stage.key} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                        {isDone ? (
                          <CheckCircle2 size={18} className="text-[#166534]" />
                        ) : isCurrent ? (
                          <Loader2 size={18} className="animate-spin text-ink" />
                        ) : (
                          <Circle size={16} className="text-[#D1D5DB]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <Icon
                            size={13}
                            className={
                              isDone ? "text-[#166534]" : isCurrent ? "text-ink" : "text-[#D1D5DB]"
                            }
                          />
                          <p
                            className={`text-sm font-medium ${
                              isDone
                                ? "text-[#166534]"
                                : isCurrent
                                ? "text-ink"
                                : "text-[#9CA3AF]"
                            }`}
                          >
                            {stage.label}
                            {isCurrent && stage.key === "upload" && progress > 0
                              ? ` (${progress}%)`
                              : ""}
                          </p>
                        </div>
                        {isCurrent && (
                          <p className="mt-0.5 text-xs text-[#9CA3AF]">{stage.detail}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-canvas-muted">
                <UploadCloud className="text-ink" size={26} />
              </div>
              <p className="mt-4 text-sm font-semibold text-ink">
                Drag &amp; drop a lease PDF here
              </p>
              <p className="mt-1 text-xs text-[#9CA3AF]">or click to browse · PDF only</p>
            </>
          )}
        </div>

        {error && (
          <div
            data-testid="upload-error"
            className="mt-3 flex items-center justify-between rounded-sm border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </span>
            <button onClick={() => setError("")} aria-label="dismiss">
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Recent uploads */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold text-ink">Recent Uploads</h3>
          <Button variant="ghost" onClick={() => navigate("/history")} data-testid="view-all-btn">
            View all
          </Button>
        </div>
        <Card className="overflow-hidden">
          {recent.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#9CA3AF]">
              No documents uploaded yet.
            </div>
          ) : (
            <table className="w-full text-left text-sm" data-testid="recent-uploads-table">
              <thead>
                <tr className="border-b border-line bg-canvas-subtle text-xs uppercase tracking-wide text-[#9CA3AF]">
                  <th className="px-4 py-3 font-semibold">File Name</th>
                  <th className="px-4 py-3 font-semibold">Uploaded</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-line last:border-0 transition-colors duration-150 hover:bg-canvas-subtle"
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      <span className="flex items-center gap-2">
                        <FileText size={15} className="text-[#9CA3AF]" />
                        {d.file_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#4B5563]">{fmtDate(d.upload_date)}</td>
                    <td className="px-4 py-3">
                      <MethodTag method={d.extraction_method} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => navigate(`/review/${d.id}`)}
                        data-testid={`open-review-${d.id}`}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
