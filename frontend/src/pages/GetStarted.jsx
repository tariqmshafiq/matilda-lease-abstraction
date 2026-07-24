import React from "react";
import {
  UploadCloud,
  ScanText,
  Sparkles,
  ShieldCheck,
  Database,
  Download,
  ArrowRight,
} from "lucide-react";
import { Card } from "../components/ui";

const STEPS = [
  {
    icon: UploadCloud,
    title: "1. Upload",
    body: (
      <>
        A commercial lease is uploaded as a PDF via the Dashboard. The backend
        rejects anything that isn't a non-empty <code>.pdf</code> file before any
        processing begins.
      </>
    ),
  },
  {
    icon: ScanText,
    title: "2. Text Extraction",
    body: (
      <>
        The file is first run through <code>pdfplumber</code> to pull embedded
        text directly from the PDF. If that yields fewer than{" "}
        <strong>500 characters</strong> — typically a scanned or image-based
        lease — the system falls back to OCR using <code>pytesseract</code> and{" "}
        <code>pdf2image</code>, which renders each page to an image and reads
        the text off it. If both approaches come up empty, the document is
        marked <code>extraction_method: "failed"</code> and still stored, just
        flagged for manual review. A rough quality score (high / medium / low)
        is derived from the resulting character count.
      </>
    ),
  },
  {
    icon: Sparkles,
    title: "3. AI Field Abstraction",
    body: (
      <>
        The extracted text is sent to an LLM (Gemini <code>2.5-flash</code> by
        default, selected via the <code>AI_PROVIDER</code> env var — a Claude
        implementation is stubbed in and ready to swap) with a strict system
        prompt: act as a lease abstraction assistant, return{" "}
        <strong>JSON only</strong>, and never invent a value that isn't in the
        text. The model is asked to extract exactly 10 canonical fields, and
        for each one to return a <code>value</code>, a <code>confidence</code>{" "}
        score (0–1), a verbatim <code>evidence</code> snippet from the source
        text, and a <code>status</code> of <code>extracted</code>,{" "}
        <code>missing</code>, or <code>needs_review</code>.
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "4. Normalize & Validate",
    body: (
      <>
        The raw model response is defensively parsed — markdown code fences are
        stripped, and malformed JSON never crashes the app, it just downgrades
        to a "needs review" result. Every document is then normalized so all 10
        fields are always present exactly once: confidence is clamped to
        [0, 1], and any field the model left out or returned empty becomes a{" "}
        <code>missing</code> field with{" "}
        <em>"Not found in extracted text"</em> as its evidence.
      </>
    ),
  },
  {
    icon: Database,
    title: "5. Status & Storage",
    body: (
      <>
        A document is auto-flagged <code>needs_review</code> if text
        extraction failed, the AI call failed, any field is{" "}
        <code>missing</code>/<code>needs_review</code>, or any field's
        confidence is below <strong>75%</strong>. Otherwise it's marked{" "}
        <code>processed</code>. The full record — raw text, extraction method,
        AI summary, all 10 fields with their evidence and confidence, and any
        warnings — is persisted to MongoDB.
      </>
    ),
  },
  {
    icon: Download,
    title: "6. Review & Export",
    body: (
      <>
        On the Review page, a human checks each extracted value against its
        evidence snippet and can correct or approve it. Once reviewed, data
        across all leases can be exported to CSV or Excel for downstream use.
      </>
    ),
  },
];

const FIELDS_BY_SECTION = {
  Parties: ["Landlord / Property Owner Name", "Tenant / Business Name", "Guarantor Name(s)"],
  "Contact & Address": ["Mailing Addresses for all parties", "Contact Information"],
  "Lease Dates": ["Effective Date / Lease Start Date", "Lease End Date", "Lease Length"],
  "Options & Terms": ["Renewal Option Details", "Holdover Terms"],
};

export default function GetStarted() {
  return (
    <div className="app-fade-in space-y-10">
      <div>
        <h2 className="font-heading text-4xl tracking-tight text-ink">Start Here</h2>
      </div>

      {/* Pipeline */}
      <div>
        <h3 className="mb-3 font-heading text-2xl text-ink">The Pipeline</h3>
        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="p-5">
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                    <Icon size={18} className="text-brand" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="font-heading text-lg text-ink">{s.title}</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#4B5563]">{s.body}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mt-4 flex justify-center text-[#D1D5DB]">
                    <ArrowRight size={14} className="rotate-90" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fields extracted */}
      <div>
        <h3 className="mb-3 font-heading text-2xl text-ink">
          The 10 Fields Extracted
        </h3>
        <p className="mb-4 max-w-2xl text-sm text-[#4B5563]">
          Every lease is abstracted against the same fixed schema, grouped into
          four sections. The AI never adds fields beyond this list.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.entries(FIELDS_BY_SECTION).map(([section, names]) => (
            <Card key={section} className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                {section}
              </p>
              <ul className="mt-3 space-y-2">
                {names.map((n) => (
                  <li key={n} className="text-sm text-ink">
                    {n}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>

      {/* Design principles */}
      <div>
        <h3 className="mb-3 font-heading text-2xl text-ink">
          Why It's Built This Way
        </h3>
        <Card className="p-6">
          <ul className="space-y-3 text-sm text-[#4B5563]">
            <li>
              <strong className="text-ink">The AI never guesses.</strong> The
              prompt explicitly forbids inventing values — anything not
              explicitly present in the lease text comes back as{" "}
              <code>missing</code>, never fabricated.
            </li>
            <li>
              <strong className="text-ink">Every value is traceable.</strong>{" "}
              Each extracted field carries a verbatim evidence snippet, so a
              reviewer can verify it against the source text rather than
              trusting the model blindly.
            </li>
            <li>
              <strong className="text-ink">Low confidence is surfaced, not hidden.</strong>{" "}
              Anything below 75% confidence, or any field the model flagged as
              ambiguous, automatically routes the whole document to{" "}
              <code>needs_review</code> instead of being silently accepted.
            </li>
            <li>
              <strong className="text-ink">Failures degrade gracefully.</strong>{" "}
              A corrupt PDF, an OCR failure, or an unparseable AI response
              never crashes the app — the document is simply stored with a{" "}
              <code>needs_review</code> status and a clear reason.
            </li>
            <li>
              <strong className="text-ink">The AI provider is swappable.</strong>{" "}
              Extraction and AI abstraction are isolated services behind a
              provider switch (<code>AI_PROVIDER</code>), so moving from Gemini
              to Claude or another model means implementing one function
              against the same JSON schema.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
