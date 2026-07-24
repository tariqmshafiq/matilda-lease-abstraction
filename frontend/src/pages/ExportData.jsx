import React, { useEffect, useState } from "react";
import { Download, FileSpreadsheet, CheckCircle2, Inbox } from "lucide-react";
import { Card, Button } from "../components/ui";
import { getApprovedCount, exportExcelUrl, exportUrl } from "../lib/api";

const COLUMNS = [
  "File Name",
  "Upload Date",
  "Status",
  "Extraction Method",
  "Landlord / Property Owner Name",
  "Tenant / Business Name",
  "Guarantor Name(s)",
  "Mailing Addresses for all parties",
  "Contact Information",
  "Effective Date / Lease Start Date",
  "Lease End Date",
  "Lease Length",
  "Renewal Option Details",
  "Holdover Terms",
];

export default function ExportData() {
  const [count, setCount] = useState(null);
  const [format, setFormat] = useState("csv");

  useEffect(() => {
    getApprovedCount()
      .then((d) => setCount(d.approved))
      .catch(() => setCount(0));
  }, []);

  const hasApproved = count > 0;
  const isExcel = format === "excel";
  const selectedExportUrl = isExcel ? exportExcelUrl : exportUrl;
  const formatLabel = isExcel ? "Excel" : "CSV";

  return (
    <div className="app-fade-in space-y-8">
      <div>
        <h2 className="font-heading text-4xl tracking-tight text-ink">Export</h2>
      </div>

      <Card className="p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft">
              <FileSpreadsheet className="text-brand" size={24} />
            </div>
            <div>
              <p className="font-heading text-xl text-ink">
                Approved Lease Export
              </p>
              <p className="mt-1 text-sm text-[#4B5563]" data-testid="approved-count-label">
                {count === null
                  ? "Checking approved records…"
                  : hasApproved
                  ? `${count} approved record${count === 1 ? "" : "s"} ready for export.`
                  : "No approved lease records available for export."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="export-format">
              Export format
            </label>
            <select
              id="export-format"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="rounded-lg border border-line-strong bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-soft"
              data-testid="export-format-select"
            >
              <option value="csv">CSV (.csv)</option>
              <option value="excel">Excel (.xlsx)</option>
            </select>
            {hasApproved ? (
              <a href={selectedExportUrl} download data-testid="download-export-link">
                <Button data-testid="download-export-btn">
                  <Download size={16} /> Download Approved Lease {formatLabel}
                </Button>
              </a>
            ) : (
              <Button disabled data-testid="download-export-btn">
                <Download size={16} /> Download Approved Lease {formatLabel}
              </Button>
            )}
          </div>
        </div>

        {!hasApproved && count !== null && (
          <div
            data-testid="no-approved-message"
            className="mt-6 flex items-center gap-3 rounded-sm border border-line bg-canvas-subtle px-4 py-3 text-sm text-[#4B5563]"
          >
            <Inbox size={18} className="text-[#9CA3AF]" />
            No approved lease records available for export. Approve documents from the review
            page to include them here.
          </div>
        )}
      </Card>

      {/* Column reference */}
      <Card className="p-6">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand">
          <CheckCircle2 size={14} /> Export Columns
        </p>
        <div className="flex flex-wrap gap-2">
          {COLUMNS.map((c) => (
            <span
              key={c}
              className="rounded-full border border-line bg-canvas-muted px-3 py-1 font-mono text-xs text-ink-soft"
            >
              {c}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
