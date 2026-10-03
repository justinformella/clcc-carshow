"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type NonprofitDoc = {
  file: string;
  slug: string;
  number: string | null;
  title: string;
  status: "Overview" | "Draft" | "Template" | "Guide";
  body: string;
};

const STATUS_COLORS: Record<NonprofitDoc["status"], { bg: string; fg: string }> = {
  Overview: { bg: "#1C1C1C", fg: "#D4A44A" },
  Draft: { bg: "#fff4e0", fg: "#a8650a" },
  Template: { bg: "#e8f0fe", fg: "#1a56b8" },
  Guide: { bg: "#e8f5e9", fg: "#2e7d32" },
};

export default function NonprofitReader({ docs }: { docs: NonprofitDoc[] }) {
  const [activeSlug, setActiveSlug] = useState(docs[0]?.slug);

  // Keep the selected document in the URL hash so links can be shared.
  useEffect(() => {
    const fromHash = () => {
      const slug = window.location.hash.slice(1);
      if (docs.some((d) => d.slug === slug)) setActiveSlug(slug);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [docs]);

  const select = (slug: string) => {
    setActiveSlug(slug);
    history.replaceState(null, "", `#${slug}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const active = docs.find((d) => d.slug === activeSlug) ?? docs[0];
  const byFile = new Map(docs.map((d) => [d.file, d]));

  const download = () => {
    const blob = new Blob([active.body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = active.file;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{css}</style>

      <div className="np-header">
        <div>
          <p className="np-eyebrow">Crystal Lake Cars and Caffeine NFP</p>
          <h1>501(c)(3) Formation</h1>
          <p className="np-sub">
            Formation packet for board review &middot; {docs.length - 1} documents &middot; Nothing has been filed yet
          </p>
        </div>
        <div className="np-actions">
          <button onClick={() => window.print()} className="np-btn">Print</button>
          <button onClick={download} className="np-btn">Download .md</button>
        </div>
      </div>

      <div className="np-grid">
        <nav className="np-rail" aria-label="Formation documents">
          {docs.map((d) => {
            const isActive = d.slug === active.slug;
            const color = STATUS_COLORS[d.status];
            return (
              <button
                key={d.slug}
                onClick={() => select(d.slug)}
                className={`np-rail-item${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="np-num">{d.number ?? "—"}</span>
                <span className="np-rail-text">
                  <span className="np-rail-title">{d.title}</span>
                  <span className="np-badge" style={{ background: color.bg, color: color.fg }}>
                    {d.status}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <article className="np-doc">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Turn references like `05-form-1023-ez-filing-guide.md` into links to that doc.
              code: ({ children, className }) => {
                const text = String(children);
                const target = byFile.get(text);
                if (target && !className) {
                  return (
                    <a
                      href={`#${target.slug}`}
                      onClick={(e) => { e.preventDefault(); select(target.slug); }}
                      className="np-doclink"
                    >
                      {target.title}
                    </a>
                  );
                }
                return <code className={className}>{children}</code>;
              },
              table: ({ children }) => (
                <div className="np-table-wrap"><table>{children}</table></div>
              ),
            }}
          >
            {active.body}
          </ReactMarkdown>

          <div className="np-pager">
            {(() => {
              const i = docs.findIndex((d) => d.slug === active.slug);
              const prev = docs[i - 1];
              const next = docs[i + 1];
              return (
                <>
                  {prev ? (
                    <button onClick={() => select(prev.slug)} className="np-pager-btn">
                      <span>&larr; Previous</span>{prev.title}
                    </button>
                  ) : <span />}
                  {next && (
                    <button onClick={() => select(next.slug)} className="np-pager-btn next">
                      <span>Next &rarr;</span>{next.title}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </article>
      </div>
    </>
  );
}

const css = `
  .np-header {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;
  }
  .np-eyebrow {
    font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.12em; color: var(--gold);
  }
  .np-header h1 { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 400; }
  .np-sub { color: var(--text-light); font-size: 0.85rem; margin-top: 0.25rem; }
  .np-actions { display: flex; gap: 0.5rem; }
  .np-btn {
    padding: 0.5rem 1rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; border: 1px solid #ddd; background: var(--white);
    color: var(--charcoal); cursor: pointer;
  }
  .np-btn:hover { border-color: var(--gold); }

  .np-grid { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 1.5rem; align-items: start; }
  .np-rail {
    position: sticky; top: 1.5rem; background: var(--white);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column;
  }
  .np-rail-item {
    display: flex; gap: 0.75rem; align-items: flex-start; text-align: left;
    padding: 0.8rem 1rem; border: none; border-left: 3px solid transparent;
    border-bottom: 1px solid #eee; background: none; cursor: pointer; color: var(--text-dark);
  }
  .np-rail-item:last-child { border-bottom: none; }
  .np-rail-item:hover { background: var(--cream); }
  .np-rail-item.active { background: var(--cream); border-left-color: var(--gold); }
  .np-num {
    font-family: 'Playfair Display', serif; font-size: 1.1rem; color: var(--gold);
    min-width: 1.4rem; line-height: 1.2;
  }
  .np-rail-text { display: flex; flex-direction: column; gap: 0.3rem; }
  .np-rail-title { font-size: 0.85rem; font-weight: 500; line-height: 1.3; }
  .np-badge {
    align-self: flex-start; font-size: 0.6rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; padding: 0.1rem 0.45rem;
  }

  .np-doc {
    background: var(--white); box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    padding: 2.5rem 3rem; max-width: 860px; font-size: 0.95rem; line-height: 1.7; color: var(--text-dark);
  }
  .np-doc h1 {
    font-family: 'Playfair Display', serif; font-weight: 400; font-size: 1.9rem;
    line-height: 1.25; margin-bottom: 0.25rem;
  }
  .np-doc h2 {
    font-family: 'Playfair Display', serif; font-weight: 400; font-size: 1.35rem;
    margin: 2rem 0 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid #eee;
  }
  .np-doc h1 + h2 { border: none; margin-top: 0; padding: 0; color: var(--text-light); font-size: 1.1rem; }
  .np-doc h3 { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin: 1.5rem 0 0.5rem; }
  .np-doc p, .np-doc ul, .np-doc ol, .np-doc blockquote, .np-table-wrap { margin-bottom: 1rem; }
  .np-doc ul, .np-doc ol { padding-left: 1.5rem; }
  .np-doc li { margin-bottom: 0.35rem; }
  .np-doc li.task-list-item { list-style: none; margin-left: -1.5rem; }
  .np-doc li.task-list-item input { margin-right: 0.5rem; accent-color: var(--gold); }
  .np-doc strong { font-weight: 600; }
  .np-doc hr { border: none; border-top: 1px solid #eee; margin: 2rem 0; }
  .np-doc blockquote {
    background: #fdf8ee; border-left: 3px solid var(--gold);
    padding: 0.75rem 1rem; font-size: 0.875rem;
  }
  .np-doc blockquote p { margin-bottom: 0.35rem; }
  .np-doc blockquote p:last-child { margin-bottom: 0; }
  .np-doc code { font-size: 0.85em; background: var(--cream); padding: 0.1rem 0.3rem; }
  .np-doclink { color: #a8650a; font-weight: 500; text-decoration: underline; text-underline-offset: 2px; }
  .np-table-wrap { overflow-x: auto; }
  .np-doc table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .np-doc th {
    background: var(--cream); text-align: left; padding: 0.6rem 0.8rem; font-size: 0.7rem;
    text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-light);
  }
  .np-doc td { padding: 0.6rem 0.8rem; border-bottom: 1px solid #eee; vertical-align: top; }

  .np-pager {
    display: flex; justify-content: space-between; gap: 1rem;
    margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid #eee;
  }
  .np-pager-btn {
    display: flex; flex-direction: column; gap: 0.2rem; text-align: left; background: none;
    border: 1px solid #eee; padding: 0.75rem 1rem; cursor: pointer; font-size: 0.9rem;
    color: var(--charcoal); max-width: 50%;
  }
  .np-pager-btn.next { text-align: right; margin-left: auto; }
  .np-pager-btn:hover { border-color: var(--gold); }
  .np-pager-btn span {
    font-size: 0.65rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--text-light);
  }

  @media (max-width: 899px) {
    .np-grid { grid-template-columns: 1fr; }
    .np-rail { position: static; }
    .np-doc { padding: 1.5rem 1.25rem; }
  }

  @media print {
    .admin-sidebar, .admin-mobile-bar, .np-header, .np-rail, .np-pager { display: none !important; }
    .admin-content { margin-left: 0 !important; background: #fff !important; }
    .admin-content > * { padding: 0 !important; }
    .np-grid { display: block; }
    .np-doc { box-shadow: none; padding: 0; max-width: none; font-size: 11pt; }
  }
`;
