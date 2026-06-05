import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";

type Student = { _id: string; firstName: string; lastName?: string; classLevel: number };
type Plan = { _id: string; name: string; totalAmount: number };

type FeeInstallment = { label: string; dueDate: string; amount: number; status: string };
type Account = { _id: string; studentId: string; planId: string; startDate: string; installments?: FeeInstallment[] };

export function FeeAccountsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [installmentModalAccountId, setInstallmentModalAccountId] = useState<string | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState<Record<number, boolean>>({});
  const [paymentAmounts, setPaymentAmounts] = useState<Record<number, number>>({});

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [create, setCreate] = useState({ studentId: "", planId: "", startDate: todayStr });
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const canCreate = useMemo(() => create.studentId.length > 0 && create.planId.length > 0, [create]);

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
    setEditingAccountId(acc._id);
    setCreate({ studentId: acc.studentId, planId: acc.planId, startDate: acc.startDate });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function onCancelEdit() {
    setEditingAccountId(null);
    setCreate({ studentId: '', planId: '', startDate: todayStr });
    setStatusMessage(null);
    setError(null);
  }

  function openInstallmentModal(accountId: string) {
    setInstallmentModalAccountId(accountId);
    setSelectedInstallments({});
    setError(null);
    setStatusMessage(null);

    const account = accounts.find((acc) => acc._id === accountId);
    const initialAmounts: Record<number, number> = {};
    account?.installments?.forEach((inst, idx) => {
      initialAmounts[idx] = inst.amount;
    });
    setPaymentAmounts(initialAmounts);
  }

  function closeInstallmentModal() {
    setInstallmentModalAccountId(null);
    setSelectedInstallments({});
    setPaymentAmounts({});
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
        const paidAmount = Number(paymentAmounts[index] ?? inst.amount);
        if (Number.isNaN(paidAmount) || paidAmount < 0) {
          throw new Error("Invalid payment amount for selected installment.");
        }

        await api.post(`/fees/accounts/${account._id}/pay`, {
          installmentIndex: index,
          paidAmount,
          paymentMode: "CASH",
          reference: "Admin entry"
        });
      }
      setStatusMessage("Installment payment entries saved.");
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
          <select className="select" style={{ flex: 1, minWidth: 260 }} value={create.studentId} onChange={(e) => setCreate((s) => ({ ...s, studentId: e.target.value }))}>
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.firstName} {s.lastName ?? ""} (Class {s.classLevel})
              </option>
            ))}
          </select>
          <select className="select" style={{ flex: 1, minWidth: 260 }} value={create.planId} onChange={(e) => setCreate((s) => ({ ...s, planId: e.target.value }))}>
            <option value="">Select fee plan</option>
            {plans.map((p) => (
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
                    <th>Payment amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInstallmentAccount?.installments?.map((inst, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedInstallments[idx])}
                          onChange={(e) => setSelectedInstallments((s) => ({ ...s, [idx]: e.target.checked }))}
                          disabled={inst.status === 'PAID'}
                        />
                      </td>
                      <td>{inst.label}</td>
                      <td>{inst.dueDate}</td>
                      <td>
                        {inst.status === 'PAID' ? (
                          <>₹{inst.paidAmount ?? inst.amount}</>
                        ) : (
                          <input
                            className="input"
                            type="number"
                            min={0}
                            style={{ width: 120 }}
                            value={paymentAmounts[idx] ?? inst.amount}
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setPaymentAmounts((s) => ({ ...s, [idx]: value }));
                              setSelectedInstallments((s) => ({ ...s, [idx]: true }));
                            }}
                          />
                        )}
                      </td>
                      <td className="muted">{inst.status}</td>
                    </tr>
                  ))}
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
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Plan</th>
                <th>Start</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((a) => (
                <tr key={a._id}>
                  <td style={{ fontWeight: 800 }}>{(a as any).studentName}</td>
                  <td className="muted">{(a as any).classLevel}</td>
                  <td className="muted">{(a as any).planName}</td>
                  <td className="muted">{a.startDate}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn" onClick={() => onEditAccount(a)}>Edit</button>
                      <button className="btn" onClick={() => openInstallmentModal(a._id)}>Add Installment Entry</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

