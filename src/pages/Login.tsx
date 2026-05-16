import React, { useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";
import { API_BASE_URL } from "../config";

export function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.includes("@") && password.length > 0 && !loading, [email, password, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      setAuth(res.data.token, res.data.user.role, res.data.user.email);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520, marginTop: 60 }}>
      <div className="panel" style={{ padding: 16 }}>
        <h2 style={{ margin: 0, marginBottom: 12 }}>Sign in</h2>
        <div className="muted" style={{ marginBottom: 10 }}>
          API: {API_BASE_URL}
        </div>
        {error ? <div className="error" style={{ marginBottom: 10 }}>{error}</div> : null}
        <form onSubmit={onSubmit} className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Email</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label>
            <div className="muted" style={{ marginBottom: 6 }}>Password</div>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
          </label>
          <button className="btn primary" disabled={!canSubmit} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <div className="muted" style={{ fontSize: 13 }}>
            Create the first admin via `POST /auth/admin/register` (see README).
          </div>
        </form>
      </div>
    </div>
  );
}

