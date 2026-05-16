import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

type Plan = {
  _id: string;
  name: string;
  classLevel: number;
  termsCount: number;
  totalAmount: number;
  installments: { label: string; dueInMonths: number; amount: number }[];
};

export function FeePlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [create, setCreate] = useState({
    name: "Class 8 - 2 Terms",
    classLevel: "8",
    termsCount: "2",
    totalAmount: "22000",
    installmentsJson: JSON.stringify(
      [
        { label: "Term 1", dueInMonths: 0, amount: 11000 },
        { label: "Term 2", dueInMonths: 4, amount: 11000 }
      ],
      null,
      2
    )
  });

  const canCreate = useMemo(() => create.name.trim().length > 0 && create.installmentsJson.trim().startsWith("["), [create]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/fees/plans");
      setPlans(res.data.plans ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate() {
    setError(null);
    try {
      const installments = JSON.parse(create.installmentsJson);
      await api.post("/fees/plans", {
        name: create.name,
        classLevel: Number(create.classLevel),
        termsCount: Number(create.termsCount),
        totalAmount: Number(create.totalAmount),
        installments
      });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to create plan");
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 18 }}>Fee Plans</h2>
      <div className="panel" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Create plan</div>
        <div className="row" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
          <input className="input" style={{ flex: 1, minWidth: 220 }} value={create.name} onChange={(e) => setCreate((s) => ({ ...s, name: e.target.value }))} />
          <select className="select" style={{ width: 140 }} value={create.classLevel} onChange={(e) => setCreate((s) => ({ ...s, classLevel: e.target.value }))}>
            {[6, 7, 8, 9, 10].map((c) => (
              <option key={c} value={String(c)}>
                Class {c}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 140 }} value={create.termsCount} onChange={(e) => setCreate((s) => ({ ...s, termsCount: e.target.value }))}>
            {[1, 2, 3, 4].map((t) => (
              <option key={t} value={String(t)}>
                {t} term
              </option>
            ))}
          </select>
          <input className="input" style={{ width: 160 }} value={create.totalAmount} onChange={(e) => setCreate((s) => ({ ...s, totalAmount: e.target.value }))} />
          <button className="btn primary" disabled={!canCreate} onClick={onCreate}>
            Create
          </button>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ marginBottom: 6 }}>
            Installments (JSON)
          </div>
          <textarea className="textarea" rows={8} value={create.installmentsJson} onChange={(e) => setCreate((s) => ({ ...s, installmentsJson: e.target.value }))} />
        </div>
        {error ? <div className="error" style={{ marginTop: 10 }}>{error}</div> : null}
      </div>

      <div className="panel">
        {loading ? (
          <div className="muted" style={{ padding: 16 }}>
            Loading...
          </div>
        ) : plans.length === 0 ? (
          <div className="muted" style={{ padding: 16 }}>
            No plans yet.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Class</th>
                <th>Terms</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p._id}>
                  <td style={{ fontWeight: 800 }}>{p.name}</td>
                  <td className="muted">{p.classLevel}</td>
                  <td className="muted">{p.termsCount}</td>
                  <td className="muted">{p.totalAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

