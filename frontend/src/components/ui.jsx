import React from "react";

// ---- Status badge ----------------------------------------------------------
const STATUS_STYLES = {
  extracted: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0", label: "Extracted" },
  approved: { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0", label: "Approved" },
  processed: { bg: "#F5F3FF", text: "#5B21B6", border: "#DDD6FE", label: "Processed" },
  needs_review: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", label: "Needs Review" },
  missing: { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA", label: "Missing" },
  failed: { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA", label: "Failed" },
};

export function StatusBadge({ status, testId }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.processed;
  return (
    <span
      data-testid={testId}
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

// ---- Quality badge ---------------------------------------------------------
const QUALITY_STYLES = {
  high: { text: "#047857", label: "High" },
  medium: { text: "#B45309", label: "Medium" },
  low: { text: "#B91C1C", label: "Low" },
};

export function QualityBadge({ score, testId }) {
  const q = QUALITY_STYLES[score] || { text: "#4B5563", label: score || "—" };
  return (
    <span
      data-testid={testId}
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{ color: q.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: q.text }} />
      {q.label}
    </span>
  );
}

// ---- Extraction method tag -------------------------------------------------
const METHOD_LABELS = { text_pdf: "Text PDF", ocr: "OCR", failed: "Failed" };
export function MethodTag({ method }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-canvas-muted px-2.5 py-0.5 font-mono text-xs text-ink-soft">
      {METHOD_LABELS[method] || method || "—"}
    </span>
  );
}

// ---- Confidence indicator --------------------------------------------------
export function Confidence({ value, testId }) {
  const pct = Math.round((value || 0) * 100);
  let color = "#B91C1C";
  if (pct >= 90) color = "#16A34A";
  else if (pct >= 75) color = "#65A30D";
  else if (pct >= 70) color = "#CA8A04";
  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <div className="h-1.5 w-16 rounded-full bg-brand-soft overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-tabular text-xs font-semibold tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

// ---- Button ----------------------------------------------------------------
export function Button({ variant = "primary", className = "", children, ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand text-white shadow-soft hover:bg-brand-hover",
    outline: "border border-line-strong bg-white text-ink hover:bg-brand-softer hover:border-brand-soft",
    ghost: "text-ink-soft hover:bg-brand-softer hover:text-brand-ink",
    danger: "bg-[#B91C1C] text-white hover:bg-[#991B1B]",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ---- Card ------------------------------------------------------------------
export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white shadow-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ---- Icon badge (soft lavender square w/ violet icon) ----------------------
export function IconBadge({ icon: Icon, size = 40, iconSize = 18, className = "" }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand ${className}`}
      style={{ height: size, width: size }}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </div>
  );
}
