"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { fetchEvents, type ShowEvent } from "@/lib/events";

type AdminEventState = {
  /** All shows, newest first. */
  events: ShowEvent[];
  /** The show the admin is currently viewing. Null until loaded. */
  event: ShowEvent | null;
  /** The show marked current (where new registrations go). */
  currentEvent: ShowEvent | null;
  /** True when viewing a past show: pages must not offer edits. */
  readOnly: boolean;
  loading: boolean;
  error: string | null;
  setEventId: (id: string) => void;
};

const AdminEventContext = createContext<AdminEventState | null>(null);

const STORAGE_KEY = "clcc-admin-event-id";

export function AdminEventProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<ShowEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEvents(createClient())
      .then((list) => {
        if (cancelled) return;
        setEvents(list);
        let saved: string | null = null;
        try {
          saved = window.localStorage.getItem(STORAGE_KEY);
        } catch {
          // storage unavailable (private mode etc.): fall back to current
        }
        const current = list.find((e) => e.is_current) ?? list[0] ?? null;
        const valid = saved && list.some((e) => e.id === saved) ? saved : current?.id ?? null;
        setSelectedId(valid);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const setEventId = useCallback((id: string) => {
    setSelectedId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AdminEventState>(() => {
    const event = events.find((e) => e.id === selectedId) ?? null;
    const currentEvent = events.find((e) => e.is_current) ?? null;
    return {
      events,
      event,
      currentEvent,
      readOnly: !!event && !event.is_current,
      loading,
      error,
      setEventId,
    };
  }, [events, selectedId, loading, error, setEventId]);

  return <AdminEventContext.Provider value={value}>{children}</AdminEventContext.Provider>;
}

/**
 * The show the admin is viewing. Every query on an event-scoped table must
 * filter with `.eq("event_id", event.id)` and wait until `event` is set.
 */
export function useAdminEvent(): AdminEventState {
  const ctx = useContext(AdminEventContext);
  if (!ctx) throw new Error("useAdminEvent must be used inside AdminEventProvider (app/admin/layout.tsx)");
  return ctx;
}

/** Sidebar control for switching years. */
export function AdminEventSwitcher({ onChange }: { onChange?: () => void }) {
  const { events, event, setEventId } = useAdminEvent();
  if (events.length === 0) return null;
  return (
    <label style={{ display: "block", padding: "0 1.25rem 0.75rem" }}>
      <span
        style={{
          display: "block",
          fontSize: "0.55rem",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "rgba(255,255,255,0.35)",
          marginBottom: "0.3rem",
        }}
      >
        Show year
      </span>
      <select
        value={event?.id ?? ""}
        onChange={(e) => {
          setEventId(e.target.value);
          onChange?.();
        }}
        aria-label="Show year"
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.08)",
          color: "var(--gold)",
          border: "1px solid rgba(255,255,255,0.2)",
          padding: "0.4rem 0.5rem",
          fontSize: "0.85rem",
          cursor: "pointer",
        }}
      >
        {events.map((e) => (
          <option key={e.id} value={e.id} style={{ color: "#000" }}>
            {e.year}
            {e.is_current ? " (current)" : " (read only)"}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Banner shown above every admin page while viewing a past show. */
export function AdminReadOnlyBanner() {
  const { event, currentEvent, readOnly, setEventId, error } = useAdminEvent();
  if (error) {
    return (
      <div role="alert" style={{ background: "#fdecea", color: "#8a1c1c", padding: "0.75rem 1rem", marginBottom: "1.25rem", fontSize: "0.85rem" }}>
        Couldn&apos;t load show years: {error}
      </div>
    );
  }
  if (!readOnly || !event) return null;
  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        background: "#fff8e6",
        border: "1px solid var(--gold)",
        color: "var(--charcoal)",
        padding: "0.75rem 1rem",
        marginBottom: "1.25rem",
        fontSize: "0.85rem",
      }}
    >
      <span>
        <strong>Viewing {event.year} — read only.</strong> Past shows can&apos;t be edited here.
      </span>
      {currentEvent && (
        <button
          onClick={() => setEventId(currentEvent.id)}
          style={{
            background: "var(--charcoal)",
            color: "var(--gold)",
            border: "none",
            padding: "0.4rem 0.9rem",
            cursor: "pointer",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Switch to {currentEvent.year}
        </button>
      )}
    </div>
  );
}
