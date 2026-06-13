import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

type Settings = {
  supportEmail: string;
  supportPhone: string;
};

const defaultSettings: Settings = {
  supportEmail: "support@instituteapp.com",
  supportPhone: "+1-234-567-890"
};

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/settings");
        setSettings(res.data.settings ?? defaultSettings);
      } catch (e: any) {
        setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canSave = useMemo(
    () => settings.supportEmail.includes("@") && settings.supportPhone.trim().length >= 6 && !saving,
    [saving, settings.supportEmail, settings.supportPhone]
  );

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        supportEmail: settings.supportEmail.trim(),
        supportPhone: settings.supportPhone.trim()
      };
      const res = await api.put("/settings", payload);
      setSettings(res.data.settings ?? payload);
      setMessage("Contact details updated for the website footer and mobile Contact Us page.");
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? err?.message ?? "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-subtitle">Manage contact details shown on the website footer and the mobile app Contact Us screen.</div>
        </div>
      </div>

      <form className="panel settings-panel" onSubmit={saveSettings}>
        {loading ? <div className="muted">Loading settings...</div> : null}
        {error ? <div className="error">{error}</div> : null}
        {message ? <div className="success">{message}</div> : null}

        <label>
          <div className="form-label">Support email</div>
          <input
            className="input"
            type="email"
            value={settings.supportEmail}
            onChange={(e) => setSettings((current) => ({ ...current, supportEmail: e.target.value }))}
            placeholder="support@example.com"
          />
        </label>

        <label>
          <div className="form-label">Contact number</div>
          <input
            className="input"
            value={settings.supportPhone}
            onChange={(e) => setSettings((current) => ({ ...current, supportPhone: e.target.value }))}
            placeholder="+91 98765 43210"
          />
        </label>

        <div className="settings-preview">
          <div>
            <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Preview
            </div>
            <strong>{settings.supportEmail || "support@example.com"}</strong>
            <span>{settings.supportPhone || "+91 98765 43210"}</span>
          </div>
        </div>

        <div className="row">
          <button className="btn primary" disabled={!canSave || loading} type="submit">
            {saving ? "Saving..." : "Save contact details"}
          </button>
        </div>
      </form>
    </div>
  );
}
