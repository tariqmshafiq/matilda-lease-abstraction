import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowUpRight } from "lucide-react";
import { Card, Button, StatusBadge, MethodTag, QualityBadge } from "../components/ui";
import { listDocuments } from "../lib/api";

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

export default function History() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-fade-in space-y-8">
      <div>
        <h2 className="font-heading text-4xl tracking-tight text-ink">History</h2>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm" data-testid="history-table">
          <thead>
            <tr className="border-b border-line bg-canvas-subtle text-xs uppercase tracking-wide text-[#9CA3AF]">
              <th className="px-4 py-3 font-semibold">File Name</th>
              <th className="px-4 py-3 font-semibold">Upload Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Method</th>
              <th className="px-4 py-3 font-semibold">Text Quality</th>
              <th className="px-4 py-3 font-semibold text-right">Review</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#9CA3AF]">
                  Loading…
                </td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#9CA3AF]">
                  No documents found.
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-line last:border-0 transition-colors duration-150 hover:bg-canvas-subtle"
                  data-testid={`history-row-${d.id}`}
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    <span className="flex items-center gap-2">
                      <FileText size={15} className="text-[#9CA3AF]" />
                      {d.file_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">{fmtDate(d.upload_date)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3">
                    <MethodTag method={d.extraction_method} />
                  </td>
                  <td className="px-4 py-3">
                    <QualityBadge score={d.text_quality_score} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => navigate(`/review/${d.id}`)}
                      data-testid={`history-open-${d.id}`}
                    >
                      Open <ArrowUpRight size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
