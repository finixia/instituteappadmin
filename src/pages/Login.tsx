import React, { useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";

export function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showRegister, setShowRegister] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.includes("@") && password.length > 0 && !loading, [email, password, loading]);
  const canRegister = useMemo(() => inviteCode.trim().length > 0 && regEmail.includes("@") && regPassword.length >= 8 && !regLoading, [inviteCode, regEmail, regPassword, regLoading]);

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

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);
    setRegLoading(true);
    try {
      const res = await api.post("/auth/admin/register", { inviteCode, email: regEmail, password: regPassword });
      setAuth(res.data.token, res.data.user.role, res.data.user.email);
    } catch (err: any) {
      setRegError(err?.response?.data?.error?.message ?? err?.message ?? "Register failed");
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="panel" style={{ width: 420, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: 'linear-gradient(180deg,#2f5fd7,#1d4ed8)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>IA</div>
          <div>
            <h2 style={{ margin: 0 }}>Institute Admin</h2>
            <div className="muted" style={{ fontSize: 13 }}>Sign in to your admin panel</div>
          </div>
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
        </form>

       

        {showRegister ? (
          <div style={{ marginTop: 12 }}>
            {regError ? <div className="error" style={{ marginBottom: 10 }}>{regError}</div> : null}
            <form onSubmit={onRegister} style={{ display: 'grid', gap: 8 }}>
              <label>
                <div className="muted" style={{ marginBottom: 6 }}>Invite Code</div>
                <input className="input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
              </label>
              <label>
                <div className="muted" style={{ marginBottom: 6 }}>Email</div>
                <input className="input" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} autoComplete="email" />
              </label>
              <label>
                <div className="muted" style={{ marginBottom: 6 }}>Password (min 8)</div>
                <input className="input" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} type="password" />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn primary" disabled={!canRegister} type="submit">{regLoading ? 'Creating...' : 'Create Admin'}</button>
                <button className="btn" type="button" onClick={() => { setShowRegister(false); setRegError(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

