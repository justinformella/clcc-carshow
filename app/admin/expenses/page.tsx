"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { ShowExpense } from "@/types/database";

function fmtMoney(cents: number): string {
  const abs = Math.abs(cents);
  const str = `$${(abs / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return cents < 0 ? `(${str})` : str;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ShowExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ description: "", amount: "", memo: "", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  const fetchExpenses = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("show_expenses").select("*").order("date", { ascending: false });
    setExpenses((data as ShowExpense[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const resetForm = () => {
    setForm({ description: "", amount: "", memo: "", date: new Date().toISOString().split("T")[0] });
    setAdding(false);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) return;
    setSaving(true);
    const supabase = createClient();
    const amountCents = Math.round(parseFloat(form.amount) * 100);

    if (editId) {
      await supabase.from("show_expenses").update({
        description: form.description,
        amount_cents: amountCents,
        memo: form.memo || null,
        date: form.date,
        updated_at: new Date().toISOString(),
      }).eq("id", editId);
    } else {
      await supabase.from("show_expenses").insert({
        description: form.description,
        amount_cents: amountCents,
        memo: form.memo || null,
        date: form.date,
      });
    }

    resetForm();
    setSaving(false);
    fetchExpenses();
  };

  const handleEdit = (e: ShowExpense) => {
    setForm({
      description: e.description,
      amount: (e.amount_cents / 100).toFixed(2),
      memo: e.memo || "",
      date: e.date,
    });
    setEditId(e.id);
    setAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const supabase = createClient();
    await supabase.from("show_expenses").delete().eq("id", id);
    fetchExpenses();
  };

  const total = expenses.reduce((s, e) => s + e.amount_cents, 0);

  if (loading) {
    return <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>Loading...</p>;
  }

  const inputStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    fontSize: "0.9rem",
    border: "1px solid #ddd",
    fontFamily: "'Inter', sans-serif",
    width: "100%",
  };

  const smallBtnStyle: React.CSSProperties = {
    padding: "0.3rem 0.7rem",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    border: "1px solid #ddd",
    background: "var(--cream)",
    color: "var(--charcoal)",
    cursor: "pointer",
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "2rem",
            fontWeight: 400,
          }}
        >
          Show Expenses
        </h1>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            style={{
              padding: "0.6rem 1.5rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              background: "var(--gold)",
              color: "var(--charcoal)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Add Expense
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {adding && (
        <div
          style={{
            background: "var(--white)",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: "200px" }}>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)", marginBottom: "0.3rem" }}>Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Event insurance"
                style={inputStyle}
              />
            </div>
            <div style={{ minWidth: "120px" }}>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)", marginBottom: "0.3rem" }}>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
            <div style={{ minWidth: "150px" }}>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)", marginBottom: "0.3rem" }}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 2, minWidth: "200px" }}>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)", marginBottom: "0.3rem" }}>Memo</label>
              <input
                type="text"
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                placeholder="Optional notes"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleSave}
                disabled={saving || !form.description || !form.amount}
                style={{
                  padding: "0.5rem 1.2rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background: "var(--charcoal)",
                  color: "#fff",
                  border: "none",
                  cursor: saving || !form.description || !form.amount ? "not-allowed" : "pointer",
                  opacity: saving || !form.description || !form.amount ? 0.5 : 1,
                }}
              >
                {saving ? "Saving..." : editId ? "Update" : "Save"}
              </button>
              <button
                onClick={resetForm}
                style={{
                  padding: "0.5rem 1.2rem",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  background: "var(--white)",
                  color: "var(--charcoal)",
                  border: "1px solid #ddd",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary card */}
      <div
        style={{
          background: "var(--charcoal)",
          padding: "1.5rem 2rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--gold)", marginBottom: "0.25rem" }}>
            Total Expenses
          </p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#fff" }}>
            {fmtMoney(total)}
          </p>
        </div>
        <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Expense table */}
      <div
        style={{
          background: "var(--white)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "auto",
        }}
      >
        {expenses.length === 0 ? (
          <p style={{ color: "var(--text-light)", fontSize: "0.9rem", textAlign: "center", padding: "3rem" }}>
            No expenses recorded yet. Click &ldquo;Add Expense&rdquo; to get started.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                <th style={{ padding: "0.8rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)" }}>Date</th>
                <th style={{ padding: "0.8rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)" }}>Description</th>
                <th style={{ padding: "0.8rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)" }}>Memo</th>
                <th style={{ padding: "0.8rem 1rem", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "0.8rem 1rem", width: "100px" }} />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.8rem 1rem", color: "var(--text-light)", whiteSpace: "nowrap" }}>
                    {new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td style={{ padding: "0.8rem 1rem", fontWeight: 500 }}>{e.description}</td>
                  <td style={{ padding: "0.8rem 1rem", color: "var(--text-light)" }}>{e.memo || "—"}</td>
                  <td style={{ padding: "0.8rem 1rem", textAlign: "right", fontWeight: 600, color: "#c62828" }}>
                    {fmtMoney(e.amount_cents)}
                  </td>
                  <td style={{ padding: "0.8rem 1rem", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                      <button onClick={() => handleEdit(e)} style={smallBtnStyle}>Edit</button>
                      <button onClick={() => handleDelete(e.id)} style={{ ...smallBtnStyle, color: "#c62828" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #ddd" }}>
                <td />
                <td style={{ padding: "0.8rem 1rem", fontWeight: 600 }}>Total</td>
                <td />
                <td style={{ padding: "0.8rem 1rem", textAlign: "right", fontWeight: 600, color: "#c62828" }}>
                  {fmtMoney(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </>
  );
}
