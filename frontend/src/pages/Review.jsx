import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Download,
  AlertTriangle,
  Info,
  ShieldAlert,
  ChevronRight,
  FileSearch,
  FileText,
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

// ---- Evidence → source-text matching ---------------------------------------
// The AI returns verbatim evidence snippets, but whitespace, line breaks and
// quote characters rarely survive extraction identically. We match on a
// normalized copy of the text and keep an index map back to the original.

function normalizeChar(c) {
  if (c === "‘" || c === "’") return "'";
  if (c === "“" || c === "”") return '"';
  return c.toLowerCase();
}

function buildNormalized(text) {
  const chars = [];
  const map = []; // normalized index -> original index
  let prevSpace = true; // leading whitespace is dropped
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/\s/.test(c)) {
      if (!prevSpace) {
        chars.push(" ");
        map.push(i);
        prevSpace = true;
      }
    } else {
      chars.push(normalizeChar(c));
      map.push(i);
      prevSpace = false;
    }
  }
  // trim trailing collapsed space
  if (chars.length && chars[chars.length - 1] === " ") {
    chars.pop();
    map.pop();
  }
  return { norm: chars.join(""), map };
}

/**
 * Locate each field's evidence inside rawText. Returns:
 *  groups: [{ start, end, fieldNames: [] }] sorted, non-overlapping
 *  byField: { fieldName: groupIndex }
 */
function computeEvidenceGroups(rawText, fields) {
  const empty = { groups: [], byField: {} };
  if (!rawText) return empty;
  const { norm, map } = buildNormalized(rawText);

  const ranges = [];
  for (const f of fields) {
    const evidence = (f.evidence || "").trim();
    if (!evidence || evidence === "Not found in extracted text" || evidence.startsWith("(")) continue;
    const { norm: evNorm } = buildNormalized(evidence);
    if (evNorm.length < 4) continue;
    const idx = norm.indexOf(evNorm);
    if (idx === -1) continue;
    const start = map[idx];
    const end = map[idx + evNorm.length - 1] + 1;
    ranges.push({ start, end, fieldName: f.fieldName });
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  const groups = [];
  const byField = {};
  for (const r of ranges) {
    const last = groups[groups.length - 1];
    if (last && r.start < last.end) {
      // overlapping evidence → share one highlight
      last.end = Math.max(last.end, r.end);
      last.fieldNames.push(r.fieldName);
      byField[r.fieldName] = groups.length - 1;
    } else {
      groups.push({ start: r.start, end: r.end, fieldNames: [r.fieldName] });
      byField[r.fieldName] = groups.length - 1;
    }
  }
  return { groups, byField };
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
  const [expanded, setExpanded] = useState(new Set());
  const [activeGroup, setActiveGroup] = useState(null);
  const docScrollRef = useRef(null);

  const toggleField = (name) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const evidenceIndex = useMemo(
    () => computeEvidenceGroups(doc?.raw_text || "", fields),
    [doc, fields]
  );

  // Field → document: highlight + scroll the source panel to the evidence.
  const jumpToSource = (fieldName) => {
    const groupIdx = evidenceIndex.byField[fieldName];
    if (groupIdx === undefined) return;
    setActiveGroup(groupIdx);
    const container = docScrollRef.current;
    const mark = document.getElementById(`evidence-mark-${groupIdx}`);
    if (container && mark) {
      const contRect = container.getBoundingClientRect();
      const markRect = mark.getBoundingClientRect();
      container.scrollTo({
        top: container.scrollTop + (markRect.top - contRect.top) - container.clientHeight / 2,
        behavior: "smooth",
      });
    }
  };

  // Document → field: expand the field and scroll the page to it.
  const jumpToField = (groupIdx) => {
    const group = evidenceIndex.groups[groupIdx];
    if (!group) return;
    setActiveGroup(groupIdx);
    setExpanded((prev) => {
      const next = new Set(prev);
      group.fieldNames.forEach((n) => next.add(n));
      return next;
    });
    const fieldId = group.fieldNames[0].replace(/[^a-zA-Z]+/g, "-");
    // wait a tick so the expanded row exists before scrolling
    setTimeout(() => {
      document
        .getElementById(`field-row-${fieldId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  // Split raw text into plain/highlighted segments for rendering.
  const docSegments = useMemo(() => {
    const text = doc?.raw_text || "";
    const segs = [];
    let cursor = 0;
    evidenceIndex.groups.forEach((g, i) => {
      if (g.start > cursor) segs.push({ text: text.slice(cursor, g.start) });
      segs.push({ text: text.slice(g.start, g.end), group: i });
      cursor = g.end;
    });
    if (cursor < text.length) segs.push({ text: text.slice(cursor) });
    return segs;
  }, [doc, evidenceIndex]);

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
                  {sectionFields.map((f) => {
                    const fieldId = f.fieldName.replace(/[^a-zA-Z]+/g, "-");
                    const isOpen = expanded.has(f.fieldName);
                    const locatable = evidenceIndex.byField[f.fieldName] !== undefined;
                    return (
                      <div key={f.fieldName} id={`field-row-${fieldId}`}>
                        <button
                          type="button"
                          onClick={() => toggleField(f.fieldName)}
                          data-testid={`field-toggle-${fieldId}`}
                          className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-canvas-subtle"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <ChevronRight
                              size={15}
                              className={`shrink-0 text-[#9CA3AF] transition-transform duration-150 ${
                                isOpen ? "rotate-90" : ""
                              }`}
                            />
                            <span className="shrink-0 text-sm font-semibold text-ink">
                              {f.fieldName}
                            </span>
                            {!isOpen && (
                              <span className="truncate text-sm text-[#9CA3AF]">
                                {f.value ? `— ${f.value}` : ""}
                              </span>
                            )}
                          </div>
                          <StatusBadge
                            status={f.status}
                            testId={`field-status-${fieldId}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-5">
                            <textarea
                              rows={f.value && f.value.length > 60 ? 2 : 1}
                              value={f.value}
                              disabled={isApproved}
                              onChange={(e) => updateField(f.fieldName, e.target.value)}
                              placeholder="—"
                              data-testid={`field-input-${fieldId}`}
                              className="w-full resize-y rounded-lg border border-line-strong bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-canvas-muted disabled:text-[#4B5563]"
                            />
                            <div className="mt-2 flex items-center justify-between gap-4">
                              <Confidence value={f.confidence} testId={`field-confidence-${fieldId}`} />
                              {locatable ? (
                                <button
                                  type="button"
                                  onClick={() => jumpToSource(f.fieldName)}
                                  data-testid={`locate-btn-${fieldId}`}
                                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-brand transition-colors hover:bg-brand-softer"
                                >
                                  <FileSearch size={13} /> Locate in document
                                </button>
                              ) : (
                                <span className="text-xs text-[#9CA3AF]">No source location</span>
                              )}
                            </div>
                            <div
                              onClick={locatable ? () => jumpToSource(f.fieldName) : undefined}
                              className={`mt-2 border-l-2 bg-canvas-subtle px-3 py-2 ${
                                locatable
                                  ? "cursor-pointer border-brand-soft transition-colors hover:bg-brand-softer"
                                  : "border-line-strong"
                              }`}
                            >
                              <p className="text-xs italic text-[#4B5563]">
                                <span className="not-italic font-semibold text-[#9CA3AF]">Evidence: </span>
                                {f.evidence}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Right rail: needs review + source document */}
        <div className="xl:col-span-1">
          <div className="sticky top-8 space-y-6">
          <Card className="overflow-hidden" data-testid="needs-review-panel">
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

          {/* Source document viewer */}
          <Card className="overflow-hidden" data-testid="source-document-panel">
            <div className="flex items-center justify-between gap-2 border-b border-line bg-canvas-subtle px-5 py-3">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-brand" />
                <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">
                  Source Document
                </h3>
              </div>
              <MethodTag method={doc.extraction_method} />
            </div>
            {doc.raw_text ? (
              <>
                <div className="border-b border-line px-5 py-2.5 text-xs text-[#9CA3AF]">
                  {doc.extraction_method === "ocr"
                    ? "Text recreated from the scanned PDF via OCR — highlights mark where each field was found."
                    : "Text extracted from the uploaded PDF — highlights mark where each field was found."}
                </div>
                <div
                  ref={docScrollRef}
                  data-testid="source-document-text"
                  className="max-h-[60vh] overflow-y-auto px-5 py-4"
                >
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-ink-soft">
                    {docSegments.map((seg, i) =>
                      seg.group === undefined ? (
                        <React.Fragment key={i}>{seg.text}</React.Fragment>
                      ) : (
                        <mark
                          key={i}
                          id={`evidence-mark-${seg.group}`}
                          onClick={() => jumpToField(seg.group)}
                          title={evidenceIndex.groups[seg.group].fieldNames.join(", ")}
                          className={`cursor-pointer rounded-sm px-0.5 transition-colors ${
                            activeGroup === seg.group
                              ? "bg-brand text-white"
                              : "bg-brand-soft text-brand-ink hover:bg-[#DDD6FE]"
                          }`}
                        >
                          {seg.text}
                        </mark>
                      )
                    )}
                  </pre>
                </div>
              </>
            ) : (
              <div className="px-5 py-8 text-center text-xs text-[#9CA3AF]">
                No text could be extracted from this document, so there is no source to display.
              </div>
            )}
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
