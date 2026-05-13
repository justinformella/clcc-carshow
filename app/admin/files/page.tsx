"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type FileEntry = {
  name: string;
  size: number;
  created_at: string;
  url: string;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    const res = await fetch("/api/files");
    const data = await res.json();
    setFiles(data.files || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Upload failed");
      } else {
        fetchFiles();
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone and will break any shared links.`)) return;
    const res = await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      fetchFiles();
    } else {
      alert("Delete failed");
    }
  };

  const handleCopy = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>Loading...</p>;
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 400 }}>
            Files
          </h1>
          <p style={{ color: "var(--text-light)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            {files.length} file{files.length !== 1 ? "s" : ""} &middot; Publicly accessible via URL
          </p>
        </div>
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "0.6rem 1.5rem",
              background: uploading ? "#ccc" : "var(--gold)",
              color: "var(--charcoal)",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "Uploading..." : "Upload File"}
          </button>
          <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleUpload} />
        </div>
      </div>

      {files.length === 0 ? (
        <div style={{ background: "var(--white)", padding: "3rem", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>No files uploaded yet. Click &ldquo;Upload File&rdquo; to get started.</p>
        </div>
      ) : (
        <div style={{ background: "var(--white)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                <th style={thStyle}>File</th>
                <th style={thStyle}>Size</th>
                <th style={thStyle}>URL</th>
                <th style={{ ...thStyle, width: "140px" }} />
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.name} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.8rem 1rem", fontWeight: 500 }}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--charcoal)", textDecoration: "none" }}>
                      {f.name}
                    </a>
                  </td>
                  <td style={{ padding: "0.8rem 1rem", color: "var(--text-light)" }}>
                    {formatBytes(f.size)}
                  </td>
                  <td style={{ padding: "0.8rem 1rem" }}>
                    <code style={{ fontSize: "0.75rem", color: "var(--text-light)", wordBreak: "break-all" }}>
                      {f.url}
                    </code>
                  </td>
                  <td style={{ padding: "0.8rem 1rem", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleCopy(f.url, f.name)}
                        style={btnStyle}
                      >
                        {copied === f.name ? "Copied!" : "Copy URL"}
                      </button>
                      <button
                        onClick={() => handleDelete(f.name)}
                        style={{ ...btnStyle, color: "#c62828" }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
  fontWeight: 600,
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-light)",
  whiteSpace: "nowrap",
};

const btnStyle: React.CSSProperties = {
  padding: "0.25rem 0.6rem",
  fontSize: "0.65rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  border: "1px solid #ddd",
  background: "var(--cream)",
  color: "var(--charcoal)",
  cursor: "pointer",
};
