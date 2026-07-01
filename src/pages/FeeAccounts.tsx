import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";

type Student = { _id: string; firstName: string; lastName?: string; classLevel: number };
type Plan = { _id: string; name: string; classLevel: number; totalAmount: number };

type FeeInstallment = { label: string; dueDate: string; amount: number; status: string; paidAmount?: number; paymentMode?: string };
type Account = { _id: string; studentId: string; planId: string; startDate: string; installments?: FeeInstallment[] };
const CLASS_LEVELS = [6, 7, 8, 9, 10];

type InstallmentEdit = {
  status: string;
  amount: number;
  paidAmount: number;
  paymentMode: string;
};

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function FeeAccountsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [installmentModalAccountId, setInstallmentModalAccountId] = useState<string | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<Record<number, boolean>>({});
  const [installmentEdits, setInstallmentEdits] = useState<Record<number, InstallmentEdit>>({});

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [create, setCreate] = useState({ classLevel: "", studentId: "", planId: "", startDate: todayStr });
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const canCreate = useMemo(() => create.classLevel.length > 0 && create.studentId.length > 0 && create.planId.length > 0, [create]);

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const [sRes, pRes, aRes] = await Promise.all([api.get("/students"), api.get("/fees/plans"), api.get("/fees/accounts")]);
        setStudents(sRes.data.students ?? []);
        setPlans(pRes.data.plans ?? []);
        setAccounts(aRes.data.accounts ?? []);
      } catch (e: any) {
        setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to load");
      }
    })();
  }, []);

  const studentsForCreateClass = useMemo(() => {
    if (!create.classLevel) return [];
    return students.filter((student) => String(student.classLevel) === create.classLevel);
  }, [create.classLevel, students]);

  const plansForCreateClass = useMemo(() => {
    if (!create.classLevel) return [];
    return plans.filter((plan) => String(plan.classLevel) === create.classLevel);
  }, [create.classLevel, plans]);

  async function onCreate() {
    setError(null);
    setStatusMessage(null);
    try {
      if (editingAccountId) {
        await api.put(`/fees/accounts/${editingAccountId}`, {
          planId: create.planId,
          startDate: create.startDate || undefined
        });
        setEditingAccountId(null);
        setStatusMessage("Fee account updated.");
      } else {
        await api.post("/fees/accounts", {
          studentId: create.studentId,
          planId: create.planId,
          startDate: create.startDate || undefined
        });
        setStatusMessage("Fee account created. Open student in mobile parent view to see installments.");
      }
      // refresh accounts list
      const aRes = await api.get("/fees/accounts");
      setAccounts(aRes.data.accounts ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to create fee account");
    }
  }

  function onEditAccount(acc: Account) {
    const student = students.find((s) => s._id === String(acc.studentId));
    const plan = plans.find((p) => p._id === String(acc.planId));
    setEditingAccountId(acc._id);
    setCreate({ classLevel: String(student?.classLevel ?? plan?.classLevel ?? ""), studentId: acc.studentId, planId: acc.planId, startDate: acc.startDate });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onCancelEdit() {
    setEditingAccountId(null);
    setCreate({ classLevel: '', studentId: '', planId: '', startDate: todayStr });
    setStatusMessage(null);
    setError(null);
  }

  async function onDeleteAccount(acc: Account & { studentName: string; planName: string }) {
    const paidCount = (acc.installments ?? []).filter((inst) => inst.status === "PAID").length;
    const message = paidCount > 0
      ? `Delete fee account for ${acc.studentName}? This account has ${paidCount} paid installment entr${paidCount === 1 ? "y" : "ies"}.`
      : `Delete fee account for ${acc.studentName}?`;
    if (!confirm(message)) return;

    setError(null);
    setStatusMessage(null);
    try {
      await api.delete(`/fees/accounts/${acc._id}`);
      if (editingAccountId === acc._id) onCancelEdit();
      const aRes = await api.get("/fees/accounts");
      setAccounts(aRes.data.accounts ?? []);
      setStatusMessage("Fee account deleted.");
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to delete fee account");
    }
  }

  function openInstallmentModal(accountId: string) {
    setInstallmentModalAccountId(accountId);
    setSelectedInstallments({});
    setError(null);
    setStatusMessage(null);

    const account = accounts.find((acc) => acc._id === accountId);
    const initialEdits: Record<number, InstallmentEdit> = {};
    account?.installments?.forEach((inst, idx) => {
      initialEdits[idx] = {
        status: inst.status,
        amount: inst.amount,
        paidAmount: inst.paidAmount ?? inst.amount,
        paymentMode: inst.paymentMode ?? "CASH"
      };
    });
    setInstallmentEdits(initialEdits);
  }

  function closeInstallmentModal() {
    setInstallmentModalAccountId(null);
    setSelectedInstallments({});
    setInstallmentEdits({});
  }

  function getInstallmentEdit(idx: number, inst: FeeInstallment): InstallmentEdit {
    return installmentEdits[idx] ?? {
      status: inst.status,
      amount: inst.amount,
      paidAmount: inst.paidAmount ?? inst.amount,
      paymentMode: inst.paymentMode ?? "CASH"
    };
  }

  async function onSaveInstallments() {
    if (!installmentModalAccountId) return;
    const account = enrichedAccounts.find((acc) => acc._id === installmentModalAccountId);
    if (!account) {
      setError("Selected account not found.");
      return;
    }

    const selectedIndexes = Object.entries(selectedInstallments)
      .filter(([, checked]) => checked)
      .map(([index]) => Number(index))
      .sort((a, b) => a - b);

    if (selectedIndexes.length === 0) {
      setError("Please tick at least one installment.");
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      for (const index of selectedIndexes) {
        const inst = account.installments?.[index];
        if (!inst) continue;
        const edit = getInstallmentEdit(index, inst);
        if (edit.amount < 0 || edit.paidAmount < 0) {
          throw new Error("Invalid installment amount.");
        }

        await api.put(`/fees/accounts/${account._id}/installments/${index}`, {
          status: edit.status,
          amount: edit.amount,
          paidAmount: edit.status === "PAID" ? edit.paidAmount : undefined,
          paymentMode: edit.status === "PAID" ? edit.paymentMode : edit.paymentMode,
          reference: "Admin entry"
        });
      }
      setStatusMessage("Installment entries updated.");
      closeInstallmentModal();
      const aRes = await api.get("/fees/accounts");
      setAccounts(aRes.data.accounts ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? e?.message ?? "Failed to save installment entries");
    }
  }

  const enrichedAccounts = useMemo(() => {
    return accounts.map((acc) => {
      const student = students.find((s) => s._id === String(acc.studentId));
      const plan = plans.find((p) => p._id === String(acc.planId));
      return {
        ...acc,
        studentName: student ? `${student.firstName} ${student.lastName ?? ""}`.trim() : "(deleted)",
        classLevel: student?.classLevel ?? null,
        planName: plan?.name ?? "(deleted)"
      } as Account & { studentName: string; classLevel: number | null; planName: string };
    });
  }, [accounts, students, plans]);

  const filteredAccounts = useMemo(() => {
    return enrichedAccounts.filter((acc) => {
      if (classFilter) {
        if (String(acc.classLevel) !== String(classFilter)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          acc.studentName.toLowerCase().includes(q) ||
          acc.planName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedAccounts, search, classFilter]);

  const activeInstallmentAccount = enrichedAccounts.find((acc) => acc._id === installmentModalAccountId) ?? null;

  return (
    <div>
      <h2 style={{ marginTop: 18 }}>Fee Accounts</h2>
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Create fee account</div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <select
            className="select"
            style={{ flex: 1, minWidth: 180 }}
            value={create.classLevel}
            onChange={(e) => setCreate((s) => ({ ...s, classLevel: e.target.value, studentId: "", planId: "" }))}
            disabled={Boolean(editingAccountId)}
          >
            <option value="">Select class</option>
            {CLASS_LEVELS.map((classLevel) => (
              <option key={classLevel} value={classLevel}>
                Class {classLevel}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ flex: 1, minWidth: 260 }}
            value={create.studentId}
            onChange={(e) => setCreate((s) => ({ ...s, studentId: e.target.value }))}
            disabled={!create.classLevel || Boolean(editingAccountId)}
          >
            <option value="">{create.classLevel ? "Select student" : "Select class first"}</option>
            {studentsForCreateClass.map((s) => (
              <option key={s._id} value={s._id}>
                {s.firstName} {s.lastName ?? ""}
              </option>
            ))}
          </select>
          <select className="select" style={{ flex: 1, minWidth: 260 }} value={create.planId} onChange={(e) => setCreate((s) => ({ ...s, planId: e.target.value }))} disabled={!create.classLevel}>
            <option value="">{create.classLevel ? "Select fee plan" : "Select class first"}</option>
            {plansForCreateClass.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} (₹{p.totalAmount})
              </option>
            ))}
          </select>
          <div style={{ display: 'inline-block' }} onClick={() => { (dateInputRef.current as any)?.showPicker?.() || dateInputRef.current?.focus(); }}>
            <input ref={dateInputRef} className="input" style={{ width: 160 }} type="date" value={create.startDate} onChange={(e) => setCreate((s) => ({ ...s, startDate: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" disabled={!canCreate} onClick={onCreate}>
              {editingAccountId ? 'Save' : 'Create'}
            </button>
            {editingAccountId ? (
              <button className="btn" onClick={onCancelEdit}>Cancel</button>
            ) : null}
          </div>
        </div>
        {error ? (
          <div style={{ marginTop: 10 }} className="error">
            {error}
          </div>
        ) : null}
        {statusMessage ? (
          <div style={{ marginTop: 10 }} className="muted">
            {statusMessage}
          </div>
        ) : null}
        <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          Next: add list/search of accounts, mark installment paid, and automated reminders.
        </div>
      </div>

      {installmentModalAccountId ? (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 760, background: '#fff', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.18)', padding: 24, position: 'relative' }}>
            <button
              type="button"
              className="btn"
              style={{ position: 'absolute', top: 16, right: 16 }}
              onClick={closeInstallmentModal}
            >
              Close
            </button>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Installments for {activeInstallmentAccount?.studentName ?? 'student'}</div>
            <div className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
              Underpayments move the remaining due to the next unpaid installment; overpayments reduce the next unpaid installment amount.
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 16 }}>
              <table className="table" style={{ width: '100%', marginBottom: 0 }}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Label</th>
                    <th>Due date</th>
                    <th>Amount</th>
                    <th>Payment mode</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInstallmentAccount?.installments?.map((inst, idx) => {
                    const edit = getInstallmentEdit(idx, inst);
                    return (
                      <tr key={idx}>
                        <td>
                          <input
                            type="checkbox"
                            checked={Boolean(selectedInstallments[idx])}
                            onChange={(e) => setSelectedInstallments((s) => ({ ...s, [idx]: e.target.checked }))}
                          />
                        </td>
                        <td>{inst.label}</td>
                        <td>{inst.dueDate}</td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            style={{ width: 120 }}
                            value={edit.amount}
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setInstallmentEdits((s) => ({
                                ...s,
                                [idx]: { ...edit, amount: value }
                              }));
                              setSelectedInstallments((s) => ({ ...s, [idx]: true }));
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <select
                              className="select"
                              style={{ width: 140 }}
                              value={edit.paymentMode}
                              onChange={(e) => {
                                setInstallmentEdits((s) => ({
                                  ...s,
                                  [idx]: { ...edit, paymentMode: e.target.value }
                                }));
                                setSelectedInstallments((s) => ({ ...s, [idx]: true }));
                              }}
                            >
                              <option value="CASH">Cash</option>
                              <option value="UPI">UPI</option>
                              <option value="CARD">Card</option>
                              <option value="BANK_TRANSFER">Bank transfer</option>
                              <option value="OTHER">Other</option>
                            </select>
                            {edit.status === 'PAID' ? (
                              <input
                                className="input"
                                type="number"
                                min={0}
                                style={{ width: 100 }}
                                value={edit.paidAmount}
                                onChange={(e) => {
                                  const value = Number(e.target.value || 0);
                                  setInstallmentEdits((s) => ({
                                    ...s,
                                    [idx]: { ...edit, paidAmount: value }
                                  }));
                                  setSelectedInstallments((s) => ({ ...s, [idx]: true }));
                                }}
                              />
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <select
                            className="select"
                            style={{ width: 120 }}
                            value={edit.status}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInstallmentEdits((s) => ({
                                ...s,
                                [idx]: { ...edit, status: value }
                              }));
                              setSelectedInstallments((s) => ({ ...s, [idx]: true }));
                            }}
                          >
                            <option value="DUE">DUE</option>
                            <option value="PAID">PAID</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn" type="button" onClick={closeInstallmentModal}>Cancel</button>
              <button className="btn primary" type="button" onClick={onSaveInstallments}>Save</button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ height: 20 }} />

      <div className="panel" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Assigned fee accounts</div>
        <div className="row" style={{ gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <input className="input" placeholder="Search student or plan" style={{ flex: 1 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" style={{ width: 160 }} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">All classes</option>
            {[6,7,8,9,10].map((c) => (
              <option key={c} value={String(c)}>Class {c}</option>
            ))}
          </select>
          <button className="btn" onClick={() => { setSearch(''); setClassFilter(''); }}>Clear</button>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="muted">No accounts found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Plan</th>
                  <th>Start</th>
                  <th>Payment details</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((a) => {
                  const installments = a.installments ?? [];
                  const totalAmount = installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
                  const paidAmount = installments.reduce((sum, inst) => {
                    if (inst.status !== "PAID") return sum;
                    return sum + (Number(inst.paidAmount ?? inst.amount) || 0);
                  }, 0);
                  const dueAmount = Math.max(totalAmount - paidAmount, 0);
                  const paidCount = installments.filter((inst) => inst.status === "PAID").length;

                  return (
                    <tr key={a._id} style={{ verticalAlign: "top" }}>
                      <td style={{ fontWeight: 800 }}>{(a as any).studentName}</td>
                      <td className="muted">{(a as any).classLevel}</td>
                      <td className="muted">{(a as any).planName}</td>
                      <td className="muted">{a.startDate}</td>
                      <td style={{ minWidth: 420 }}>
                        {installments.length === 0 ? (
                          <div className="muted">No installments generated.</div>
                        ) : (
                          <div>
                            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                              <span className="muted" style={{ fontWeight: 800 }}>
                                Paid {formatCurrency(paidAmount)}
                              </span>
                              <span className="muted">Due {formatCurrency(dueAmount)}</span>
                              <span className="muted">
                                {paidCount}/{installments.length} installments paid
                              </span>
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              {installments.map((inst, idx) => {
                                const isPaid = inst.status === "PAID";
                                const paidValue = Number(inst.paidAmount ?? inst.amount) || 0;
                                return (
                                  <div
                                    key={`${a._id}-${idx}`}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "minmax(120px, 1.2fr) minmax(96px, 0.8fr) minmax(96px, 0.8fr) minmax(90px, 0.7fr)",
                                      gap: 8,
                                      alignItems: "center",
                                      padding: "8px 10px",
                                      border: "1px solid #e6eaf2",
                                      borderRadius: 12,
                                      background: isPaid ? "#f0fdf4" : "#fff7ed"
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 800 }}>{inst.label}</div>
                                      <div className="muted" style={{ fontSize: 12 }}>
                                        Due {inst.dueDate}
                                      </div>
                                    </div>
                                    <div className="muted">{formatCurrency(Number(inst.amount) || 0)}</div>
                                    <div className="muted">
                                      {isPaid ? `${formatCurrency(paidValue)} · ${inst.paymentMode ?? "—"}` : "Not paid"}
                                    </div>
                                    <div style={{ fontWeight: 900, color: isPaid ? "#15803d" : "#b45309" }}>{inst.status}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: "wrap" }}>
                          <button className="btn" onClick={() => onEditAccount(a)}>Edit</button>
                          <button className="btn" onClick={() => openInstallmentModal(a._id)}>Add Installment Entry</button>
                          <button className="btn danger" onClick={() => onDeleteAccount(a)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
