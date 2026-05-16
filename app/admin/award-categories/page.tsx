"use client";

import { useEffect, useState } from "react";
import type { AwardCategory } from "@/types/database";

type Form = {
  name: string;
  display_order: string;
  is_active: boolean;
};

const emptyForm: Form = { name: "", display_order: "0", is_active: true };

const inputStyle: React.CSSProperties = {
  padding: "0.6rem 1rem",
  border: "1px solid #ddd",
  fontSize: "0.9rem",
  fontFamily: "'Inter', sans-serif",
  width: "100%",
};

const goldButtonStyle: React.CSSProperties = {
  padding: "0.6rem 1.5rem",
  background: "var(--gold)",
  color: "var(--charcoal)",
  border: "none",
  fontSize: "0.8rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-light)",
  marginBottom: "0.4rem",
};

export default function AwardCategoriesAdminPage() {
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const res = await fetch("/api/award-categories");
    const data = await res.json();
    setCategories(data.categories || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (isNew: boolean) => {
    if (!form.name.trim()) return;
    setSaving(true);
    const body = {
      ...(isNew ? {} : { id: editingId }),
      name: form.name.trim(),
      display_order: parseInt(form.display_order || "0", 10),
      is_active: form.is_active,
    };
    await fetch("/api/award-categories", {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setAdding(false);
    setEditingId(null);
    setForm(emptyForm);
    setSaving(false);
    setLoading(true);
    await fetchData();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Any vehicle currently holding this award will be unassigned.`)) return;
    await fetch(`/api/award-categories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setLoading(true);
    await fetchData();
  };

  const startEdit = (cat: AwardCategory) => {
    setAdding(false);
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      display_order: cat.display_order.toString(),
      is_active: cat.is_active,
    });
  };

  const cancelEdit = () => {
    setAdding(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400 }}>
            Award Categories
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginTop: "0.25rem" }}>
            Active categories appear on the homepage and are used by AI recommendations and award assignment.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            const nextOrder = categories.length
              ? Math.max(...categories.map((c) => c.display_order)) + 10
              : 10;
            setForm({ ...emptyForm, display_order: nextOrder.toString() });
            setAdding(true);
          }}
          style={goldButtonStyle}
        >
          Add Category
        </button>
      </div>

      {adding && (
        <div
          style={{
            background: "var(--white)",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem" }}>
            New Category
          </h3>
          <FormFields form={form} setForm={setForm} />
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button onClick={() => handleSave(true)} disabled={saving} style={goldButtonStyle}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              style={{
                padding: "0.6rem 1.5rem",
                background: "transparent",
                color: "var(--text-light)",
                border: "1px solid #ddd",
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {categories.map((cat) => {
          const isEditing = editingId === cat.id;
          return (
            <div
              key={cat.id}
              style={{
                background: cat.is_active ? "var(--white)" : "var(--cream)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                padding: "1rem 1.25rem",
                opacity: cat.is_active ? 1 : 0.7,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-light)", minWidth: "2.5rem" }}>
                    #{cat.display_order}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.05rem",
                    }}
                  >
                    {cat.name}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.2rem 0.6rem",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      background: cat.is_active ? "#e8f5e9" : "#f5f5f5",
                      color: cat.is_active ? "#2e7d32" : "#757575",
                    }}
                  >
                    {cat.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <button
                    onClick={() => (isEditing ? cancelEdit() : startEdit(cat))}
                    style={{
                      padding: "0.4rem 1rem",
                      background: isEditing ? "transparent" : "var(--gold)",
                      color: isEditing ? "var(--text-light)" : "var(--charcoal)",
                      border: isEditing ? "1px solid #ddd" : "none",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                    }}
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
                    style={{
                      padding: "0.4rem 1rem",
                      background: "var(--white)",
                      color: "#c62828",
                      border: "1px solid #ddd",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {isEditing && (
                <div style={{ borderTop: "1px solid #eee", marginTop: "1rem", paddingTop: "1rem" }}>
                  <FormFields form={form} setForm={setForm} />
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                    <button onClick={() => handleSave(false)} disabled={saving} style={goldButtonStyle}>
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {categories.length === 0 && (
          <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
            No categories yet. Click &ldquo;Add Category&rdquo; to create the first one.
          </p>
        )}
      </div>
    </>
  );
}

function FormFields({
  form,
  setForm,
}: {
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: "200px" }}>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Best in Show"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1, minWidth: "120px" }}>
          <label style={labelStyle}>Display Order</label>
          <input
            type="number"
            value={form.display_order}
            onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
            min="0"
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "0.3rem", gap: "0.5rem" }}>
          <label style={{ ...labelStyle, margin: 0 }}>Active</label>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            style={{
              width: "44px",
              height: "24px",
              borderRadius: "12px",
              border: "none",
              background: form.is_active ? "#2e7d32" : "#ccc",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <span
              style={{
                display: "block",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: "3px",
                left: form.is_active ? "23px" : "3px",
                transition: "left 0.2s",
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
