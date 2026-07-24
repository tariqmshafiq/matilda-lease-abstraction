import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Download,
  AlertTriangle,
  Info,
  ShieldAlert,
} from "lucide-react";
import { Card, Button, StatusBadge, MethodTag, QualityBadge, Confidence } from "../components/ui";
import { getDocument, saveDraft, approveDocument, exportUrl } from "../lib/api";

const SECTIONS = ["Parties", "Contact & Address", "Lease Dates", "Options & Terms"];

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Banner({ tone, icon: Icon, children, testId }) {
  const tones = {
    amber: "border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]",
    red: "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
    green: "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]",
  };
  return (
    <div
      data-testid={testId}
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${tones[tone]}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDocument(id)
      .then((d) => {
        if (!active) return;
        setDoc(d);
        setFields(d.fields || []);
      })
      .catch(() => active && setDoc(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const updateField = (name, value) => {
    setFields((prev) =>
      prev.map((f) => (f.fieldName === name ? { ...f, value } : f))
    );
  };

  const isApproved = doc?.status === "approved";

  const needsReview = useMemo(
    () =>
      fields.filter(
        (f) =>
          f.status === "missing" ||
          f.status === "needs_review" ||
          (Number(f.confidence) || 0) < 0.75
      ),
    [fields]
  );

  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2500);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const updated = await saveDraft(id, fields.map((f) => ({
        fieldName: f.fieldName,
        value: f.value,
      })));
      setDoc(updated);
      setFields(updated.fields);
      showFlash("Draft saved.");
    } catch (e) {
      showFlash(e?.response?.data?.detail || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const updated = await approveDocument(id, fields.map((f) => ({
        fieldName: f.fieldName,
        value: f.value,
      })));
      setDoc(updated);
      setFields(updated.fields);
      showFlash("Record approved.");
    } catch (e) {
      showFlash(e?.response?.data?.detail || "Failed to approve.");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-[#9CA3AF]">Loading document…</div>;
  }
  if (!doc) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#991B1B]">Document not found.</p>
        <Button variant="outline" onClick={() => navigate("/history")}>
          <ArrowLeft size={16} /> Back to History
        </Button>
      </div>
    );
  }

  return (
    <div className="app-fade-in space-y-8">
      {/* Header / meta */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <button
            onClick={() => navigate("/history")}
            data-testid="back-to-history-btn"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#4B5563] hover:text-ink"
          >
            <ArrowLeft size={14} /> Back to History
          </button>
          <h2 className="font-heading text-3xl tracking-tight text-ink" data-testid="review-doc-name">
            {doc.file_name}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#4B5563]">
            <span>Uploaded {fmtDate(doc.upload_date)}</span>
            <span className="flex items-center gap-2">Status <StatusBadge status={doc.status} testId="review-status-badge" /></span>
            <span className="flex items-center gap-2">Method <MethodTag method={doc.extraction_method} /></span>
            <span className="flex items-center gap-2">Quality <QualityBadge score={doc.text_quality_score} /></span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSaveDraft} variant="outline" disabled={saving || isApproved} data-testid="save-draft-btn">
          <Save size={16} /> {saving ? "Saving…" : "Save Draft"}
        </Button>
        <Button onClick={handleApprove} disabled={approving || isApproved} data-testid="approve-record-btn">
          <CheckCircle2 size={16} /> {isApproved ? "Approved" : approving ? "Approving…" : "Approve Record"}
        </Button>
        <a href={exportUrl} target="_blank" rel="noreferrer" data-testid="export-approved-link">
          <Button variant="ghost">
            <Download size={16} /> Export Approved Data
          </Button>
        </a>
        {flash && (
          <span className="flex items-center text-sm font-medium text-[#166534]" data-testid="review-flash">
            {flash}
          </span>
        )}
      </div>

      {/* Warning banners */}
      <div className="space-y-3">
        {doc.extraction_method === "ocr" && (
          <Banner tone="amber" icon={ShieldAlert} testId="ocr-warning">
            OCR was used. Please review extracted values carefully.
          </Banner>
        )}
        {doc.extraction_method === "failed" && (
          <Banner tone="red" icon={AlertTriangle} testId="failed-warning">
            Text extraction failed. This document needs manual review.
          </Banner>
        )}
        {isApproved && (
          <Banner tone="green" icon={CheckCircle2}>
            This record has been approved and is included in CSV exports. It is now read-only.
          </Banner>
        )}
      </div>

      {/* Summary */}
      <Card className="p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand">
          Document Summary
        </p>
        <p className="text-sm leading-relaxed text-ink" data-testid="review-summary">
          {doc.summary || "No summary available."}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        {/* Extraction table (sections) */}
        <div className="space-y-6 xl:col-span-2">
          {SECTIONS.map((section) => {
            const sectionFields = fields.filter((f) => f.section === section);
            if (sectionFields.length === 0) return null;
            return (
              <Card key={section} className="overflow-hidden" data-testid={`section-${section.replace(/[^a-zA-Z]+/g, "-")}`}>
                <div className="border-b border-line bg-canvas-subtle px-6 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">
                    {section}
                  </h3>
                </div>
                <div className="divide-y divide-line">
                  {sectionFields.map((f) => (
                    <div key={f.fieldName} className="px-6 py-5">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-semibold text-ink">{f.fieldName}</label>
                        <StatusBadge status={f.status} testId={`field-status-${f.fieldName.replace(/[^a-zA-Z]+/g, "-")}`} />
                      </div>
                      <textarea
                        rows={f.value && f.value.length > 60 ? 2 : 1}
                        value={f.value}
                        disabled={isApproved}
                        onChange={(e) => updateField(f.fieldName, e.target.value)}
                        placeholder="—"
                        data-testid={`field-input-${f.fieldName.replace(/[^a-zA-Z]+/g, "-")}`}
                        className="mt-2 w-full resize-y rounded-lg border border-line-strong bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-canvas-muted disabled:text-[#4B5563]"
                      />
                      <div className="mt-2 flex items-center justify-between gap-4">
                        <Confidence value={f.confidence} testId={`field-confidence-${f.fieldName.replace(/[^a-zA-Z]+/g, "-")}`} />
                      </div>
                      <div className="mt-2 border-l-2 border-line-strong bg-canvas-subtle px-3 py-2">
                        <p className="text-xs italic text-[#4B5563]">
                          <span className="not-italic font-semibold text-[#9CA3AF]">Evidence: </span>
                          {f.evidence}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Needs Review panel */}
        <div className="xl:col-span-1">
          <Card className="sticky top-24 overflow-hidden" data-testid="needs-review-panel">
            <div className="flex items-center gap-2 border-b border-line bg-[#FFFBEB] px-5 py-3">
              <AlertTriangle size={16} className="text-[#B45309]" />
              <h3 className="text-sm font-semibold text-[#B45309]">
                Needs Review ({needsReview.length})
              </h3>
            </div>
            <div className="p-5">
              {needsReview.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-[#166534]">
                  <CheckCircle2 size={16} /> All fields look good.
                </p>
              ) : (
                <ul className="space-y-3">
                  {needsReview.map((f) => (
                    <li key={f.fieldName} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium text-ink">{f.fieldName}</p>
                        <p className="text-xs text-[#9CA3AF]">
                          {f.status === "missing"
                            ? "Not found in text"
                            : `Low confidence (${Math.round((f.confidence || 0) * 100)}%)`}
                        </p>
                      </div>
                      <StatusBadge status={f.status} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-5 flex items-start gap-2 rounded-sm bg-canvas-subtle p-3 text-xs text-[#4B5563]">
                <Info size={14} className="mt-0.5 shrink-0" />
                Edit any value above, then Save Draft or Approve. Missing values are left blank —
                the assistant never invents data.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
