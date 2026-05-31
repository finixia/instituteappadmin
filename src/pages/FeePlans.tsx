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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [create, setCreate] = useState({
    name: "Class 8 - 2 Terms",
    classLevel: "8",
    termsCount: "2",
    totalAmount: "22000",
    installments: [
      { label: "Term 1", dueInMonths: 0, amount: 11000 },
      { label: "Term 2", dueInMonths: 4, amount: 11000 }
    ] as { label: string; dueInMonths: number; amount: number }[]
  });

  const canCreate = useMemo(() => create.name.trim().length > 0 && create.installments.length > 0, [create]);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      const installments = create.installments;
      if (editingId) {
        await api.put(`/fees/plans/${editingId}`, {
          name: create.name,
          classLevel: Number(create.classLevel),
          termsCount: Number(create.termsCount),
          totalAmount: Number(create.totalAmount),
          installments
        });
        setEditingId(null);
      } else {
        await api.post("/fees/plans", {
        name: create.name,
        classLevel: Number(create.classLevel),
        termsCount: Number(create.termsCount),
        totalAmount: Number(create.totalAmount),
        installments
        });
      }
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to create plan");
    }
  }

  async function onEdit(plan: Plan) {
    setEditingId(plan._id);
    setCreate({
      name: plan.name,
      classLevel: String(plan.classLevel),
      termsCount: String(plan.termsCount),
      totalAmount: String(plan.totalAmount),
      installments: plan.installments.map((it) => ({ ...it }))
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onDelete(planId: string) {
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    try {
      await api.delete(`/fees/plans/${planId}`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? 'Failed to delete');
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
            {editingId ? 'Save' : 'Create'}
          </button>
          <button className="btn" onClick={load}>
            Refresh
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ marginBottom: 8 }}>Installments</div>
          {create.installments.map((inst, idx) => (
            <div key={idx} className="row" style={{ gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input className="input" style={{ flex: 1, minWidth: 180 }} value={inst.label} onChange={(e) => setCreate((s) => ({ ...s, installments: s.installments.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)) }))} />
              <input className="input" style={{ width: 120 }} value={String(inst.dueInMonths)} onChange={(e) => setCreate((s) => ({ ...s, installments: s.installments.map((it, i) => (i === idx ? { ...it, dueInMonths: Number(e.target.value || 0) } : it)) }))} />
              <input className="input" style={{ width: 140 }} value={String(inst.amount)} onChange={(e) => setCreate((s) => ({ ...s, installments: s.installments.map((it, i) => (i === idx ? { ...it, amount: Number(e.target.value || 0) } : it)) }))} />
              <button className="btn" onClick={() => setCreate((s) => ({ ...s, installments: s.installments.filter((_, i) => i !== idx) }))} type="button">Remove</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn" onClick={() => setCreate((s) => ({ ...s, installments: [...s.installments, { label: `Term ${s.installments.length + 1}`, dueInMonths: 0, amount: 0 }] }))} type="button">Add installment</button>
            <div style={{ marginLeft: 'auto', alignSelf: 'center' }} className="muted">Sum: {create.installments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0)}</div>
          </div>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p._id}>
                  <td style={{ fontWeight: 800 }}>{p.name}</td>
                  <td className="muted">{p.classLevel}</td>
                  <td className="muted">{p.termsCount}</td>
                  <td className="muted">{p.totalAmount}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn" onClick={() => onEdit(p)} type="button">Edit</button>
                      <button className="btn" onClick={() => onDelete(p._id)} type="button">Delete</button>
                      <button className="btn" onClick={() => setExpanded((s) => ({ ...s, [p._id]: !s[p._id] }))} type="button">{expanded[p._id] ? 'Hide' : 'View'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {plans.map((p) => (
        expanded[p._id] ? (
          <div key={`details-${p._id}`} className="panel" style={{ marginTop: 12, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>{p.name} — Installments</div>
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Due (months)</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {p.installments.map((it, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{it.label}</td>
                    <td className="muted">{it.dueInMonths}</td>
                    <td className="muted">{it.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null
      ))}
    </div>
  );
}

