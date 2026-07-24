import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Sparkles } from "lucide-react";
import { Card, Button } from "../components/ui";
import { getAiSettings, updateAiProvider, updateAiApiKey } from "../lib/api";

export default function Settings() {
  const [providers, setProviders] = useState([]);
  const [activeProvider, setActiveProvider] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await getAiSettings();
      setProviders(data.providers || []);
      setActiveProvider(data.provider);
      setSelectedProvider((prev) => prev || data.provider);
    } catch (e) {
      setError("Failed to load AI settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selected = providers.find((p) => p.key === selectedProvider);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (apiKey.trim()) {
        await updateAiApiKey(selectedProvider, apiKey.trim());
      }
      if (selectedProvider !== activeProvider) {
        await updateAiProvider(selectedProvider);
      }
      setApiKey("");
      await refresh();
      setMessage("Settings saved.");
    } catch (e) {
      const msg = e?.response?.data?.detail || "Failed to save settings.";
      setError(typeof msg === "string" ? msg : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    !saving &&
    selected?.available &&
    (apiKey.trim().length > 0 || selectedProvider !== activeProvider);

  return (
    <div className="app-fade-in space-y-8">
      <div>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-[#9CA3AF]">
          Settings
        </h2>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center p-10">
          <Loader2 className="animate-spin text-ink" size={24} />
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
              <Sparkles size={14} /> Model Provider
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {providers.map((p) => {
                const isSelected = p.key === selectedProvider;
                const isActive = p.key === activeProvider;
                return (
                  <button
                    key={p.key}
                    type="button"
                    disabled={!p.available}
                    onClick={() => p.available && setSelectedProvider(p.key)}
                    data-testid={`provider-option-${p.key}`}
                    className={`relative rounded-md border px-4 py-3 text-left transition-colors duration-150 ${
                      !p.available
                        ? "cursor-not-allowed border-line bg-canvas-subtle opacity-60"
                        : isSelected
                        ? "border-ink bg-canvas-muted"
                        : "border-line-strong bg-white hover:border-ink"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">{p.label}</span>
                      {isActive && (
                        <span className="rounded-sm border border-[#BFDBFE] bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1E40AF]">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-[#9CA3AF]">
                      {!p.available
                        ? "Coming soon"
                        : p.configured
                        ? "API key configured"
                        : "No API key set"}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
              <KeyRound size={14} /> API Key {selected ? `— ${selected.label}` : ""}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="password"
                autoComplete="off"
                placeholder={
                  selected?.configured
                    ? "•••••••••••••••• (leave blank to keep current key)"
                    : "Enter API key"
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={!selected?.available}
                data-testid="api-key-input"
                className="flex-1 rounded-sm border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-[#9CA3AF] disabled:cursor-not-allowed disabled:bg-canvas-subtle"
              />
            </div>
            <p className="mt-2 text-xs text-[#9CA3AF]">
              Keys are stored on the backend only and are never sent back to this page —
              once saved, this field always shows blank.
            </p>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={!canSave} data-testid="save-settings-btn">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              Save Settings
            </Button>
            {message && (
              <span className="text-sm font-medium text-[#166534]" data-testid="settings-success">
                {message}
              </span>
            )}
            {error && (
              <span className="text-sm font-medium text-[#991B1B]" data-testid="settings-error">
                {error}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
