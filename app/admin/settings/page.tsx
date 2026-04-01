"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { MAX_REGISTRATIONS } from "@/types/database";
import {
  confirmationEmail,
  adminNotificationEmail,
  announcementEmail,
  helpRequestConfirmationEmail,
  helpRequestAdminNotificationEmail,
  helpRequestReplyNotificationEmail,
} from "@/lib/email-templates";
import type { Registration, HelpRequest } from "@/types/database";

type Tab = "configuration" | "emails";

const sampleReg: Registration = {
  id: "sample",
  car_number: 42,
  first_name: "John",
  last_name: "Smith",
  email: "john@example.com",
  phone: null,
  address_street: "123 Main St",
  address_city: "Crystal Lake",
  address_state: "IL",
  address_zip: "60014",
  vehicle_year: 1967,
  vehicle_make: "Ford",
  vehicle_model: "Mustang",
  vehicle_color: "Red",
  story: null,
  award_category: null,
  stripe_session_id: null,
  stripe_payment_intent_id: null,
  payment_status: "paid",
  amount_paid: 3000,
  donation_cents: 0,
  hide_owner_details: false,
  checked_in: false,
  checked_in_at: null,
  ai_image_url: null,
  lat: null,
  lng: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  paid_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const sampleHelpRequest: HelpRequest = {
  id: "sample-help",
  request_number: 7,
  name: "Jane Doe",
  email: "jane@example.com",
  phone: null,
  subject: "Can I change my vehicle after registering?",
  category: "general",
  status: "open",
  priority: "normal",
  assigned_to: null,
  registration_id: null,
  internal_notes: null,
  resolved_at: null,
  closed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const sampleConfirmationHtml = confirmationEmail(sampleReg).html;
const sampleAdminHtml = adminNotificationEmail(sampleReg, "#").html;
const sampleAnnouncementHtml = announcementEmail(
  "Parking Update for May 17th",
  "We wanted to let you know about updated parking arrangements for the show. Please arrive by 8:00 AM to ensure you get your assigned spot.\n\nGates open at 7:30 AM and we'll have volunteers directing traffic. Look for the signs marked with your car number.",
  "John"
).html;

const sampleHelpConfirmationHtml = helpRequestConfirmationEmail(
  "Jane",
  7,
  "Can I change my vehicle after registering?"
).html;

const sampleHelpAdminHtml = helpRequestAdminNotificationEmail(
  sampleHelpRequest,
  "Hi, I registered my 2019 Civic but I'd like to bring my 1970 Chevelle instead. Is it possible to swap the vehicle on my registration?",
  "#"
).html;

const sampleHelpReplyHtml = helpRequestReplyNotificationEmail(
  "Jane",
  7,
  "Can I change my vehicle after registering?",
  "Hi Jane! Absolutely — we can update your vehicle info. I've swapped it to the 1970 Chevelle. You're all set!",
  "Mike"
).html;

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("configuration");
  const [maxRegs, setMaxRegs] = useState<number>(MAX_REGISTRATIONS);
  const [savedMax, setSavedMax] = useState<number>(MAX_REGISTRATIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [adminNotifs, setAdminNotifs] = useState(true);
  const [togglingNotifs, setTogglingNotifs] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["max_registrations", "admin_notification_emails"]);

      if (data) {
        for (const row of data) {
          if (row.key === "max_registrations") {
            const val = parseInt(row.value, 10);
            if (!isNaN(val)) {
              setMaxRegs(val);
              setSavedMax(val);
            }
          }
          if (row.key === "admin_notification_emails") {
            setAdminNotifs(row.value === "true");
          }
        }
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (maxRegs === savedMax) return;
    setSaving(true);
    setSaveMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("app_settings")
      .update({ value: String(maxRegs), updated_at: new Date().toISOString() })
      .eq("key", "max_registrations");

    if (error) {
      setSaveMessage("Failed to save. Please try again.");
    } else {
      setSavedMax(maxRegs);
      setSaveMessage("Saved");
      setTimeout(() => setSaveMessage(null), 2000);
    }
    setSaving(false);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "configuration", label: "Configuration" },
    { key: "emails", label: "Email Templates" },
  ];

  if (loading) {
    return (
      <p style={{ color: "var(--text-light)", textAlign: "center", padding: "3rem" }}>
        Loading...
      </p>
    );
  }

  return (
    <>
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem",
          fontWeight: 400,
          marginBottom: "1.5rem",
        }}
      >
        Settings
      </h1>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0",
          borderBottom: "2px solid rgba(0,0,0,0.08)",
          marginBottom: "1.5rem",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.6rem 1.5rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
              marginBottom: "-2px",
              color: tab === t.key ? "var(--charcoal)" : "var(--text-light)",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "configuration" && (
        <div
          style={{
            background: "var(--white)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            padding: "1.5rem 2rem",
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.1rem",
              fontWeight: 400,
              marginBottom: "1.25rem",
              paddingBottom: "0.5rem",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              color: "var(--charcoal)",
            }}
          >
            Event Settings
          </h2>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <label
              htmlFor="max_registrations"
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--charcoal)",
                minWidth: "140px",
              }}
            >
              Max Registrations
            </label>
            <input
              id="max_registrations"
              type="number"
              min={1}
              max={9999}
              value={maxRegs}
              onChange={(e) => setMaxRegs(parseInt(e.target.value, 10) || 0)}
              style={{
                width: "100px",
                padding: "0.4rem 0.6rem",
                fontSize: "0.9rem",
                border: "1px solid rgba(0,0,0,0.15)",
                textAlign: "center",
              }}
            />
            <button
              onClick={handleSave}
              disabled={saving || maxRegs === savedMax}
              style={{
                padding: "0.4rem 1.2rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: maxRegs === savedMax ? "#eee" : "var(--charcoal)",
                color: maxRegs === savedMax ? "#999" : "var(--gold)",
                border: "none",
                cursor: maxRegs === savedMax ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {saveMessage && (
              <span
                style={{
                  fontSize: "0.8rem",
                  color: saveMessage === "Saved" ? "#2e7d32" : "#c62828",
                  fontWeight: 500,
                }}
              >
                {saveMessage}
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-light)",
              marginTop: "0.75rem",
            }}
          >
            Controls the cap shown on the registration page and enforced at checkout.
          </p>

          <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", marginTop: "1.5rem", paddingTop: "1.5rem" }}>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.1rem",
                fontWeight: 400,
                marginBottom: "1.25rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                color: "var(--charcoal)",
              }}
            >
              Notifications
            </h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--charcoal)", marginBottom: "0.25rem" }}>
                  Admin registration emails
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                  Email all admins when a new registration comes in
                </p>
              </div>
              <button
                onClick={async () => {
                  setTogglingNotifs(true);
                  const newVal = !adminNotifs;
                  const supabase = createClient();
                  await supabase
                    .from("app_settings")
                    .update({ value: String(newVal), updated_at: new Date().toISOString() })
                    .eq("key", "admin_notification_emails");
                  setAdminNotifs(newVal);
                  setTogglingNotifs(false);
                }}
                disabled={togglingNotifs}
                style={{
                  position: "relative",
                  width: "48px",
                  height: "26px",
                  borderRadius: "13px",
                  border: "none",
                  background: adminNotifs ? "var(--gold)" : "#ccc",
                  cursor: togglingNotifs ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: adminNotifs ? "25px" : "3px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "emails" && (
        <div
          style={{
            background: "var(--white)",
            padding: "1.5rem 2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.1rem",
              fontWeight: 400,
              marginBottom: "1rem",
              paddingBottom: "0.5rem",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              color: "var(--charcoal)",
            }}
          >
            Automatic Email Templates
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            <TemplateRow
              name="Registration Confirmation"
              description="Sent automatically to the registrant after successful Stripe payment. Includes car number, vehicle info, category, and event date."
              previewHtml={sampleConfirmationHtml}
            />
            <TemplateRow
              name="Admin Notification"
              description="Sent automatically to all configured admins when a new paid registration comes in. Includes registrant name, email, vehicle, and a link to their admin detail page."
              previewHtml={sampleAdminHtml}
            />
            <TemplateRow
              name="Announcement"
              description="Sent from Marketing > Announcements tab. Freeform subject and body, sent to selected paid registrants."
              previewHtml={sampleAnnouncementHtml}
            />
            <TemplateRow
              name="Help Request Confirmation"
              description="Sent automatically to the submitter after they submit a contact form request. Includes request number and subject."
              previewHtml={sampleHelpConfirmationHtml}
            />
            <TemplateRow
              name="Help Request Admin Notification"
              description="Sent automatically to admins when a new help request is submitted. Includes submitter info, subject, and message."
              previewHtml={sampleHelpAdminHtml}
            />
            <TemplateRow
              name="Help Request Reply"
              description="Sent to the submitter when an admin replies to their help request from the admin help desk."
              previewHtml={sampleHelpReplyHtml}
            />
          </div>
        </div>
      )}
    </>
  );
}

function TemplateRow({ name, description, previewHtml }: { name: string; description: string; previewHtml: string }) {
  const [open, setOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (open && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [open, previewHtml]);

  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          padding: "0.75rem 0",
        }}
      >
        <span
          style={{
            minWidth: "200px",
            fontWeight: 600,
            fontSize: "0.85rem",
            color: "var(--charcoal)",
          }}
        >
          {name}
        </span>
        <span style={{ fontSize: "0.85rem", color: "var(--text-light)", lineHeight: 1.5, flex: 1 }}>
          {description}
        </span>
        <button
          onClick={() => setOpen(!open)}
          style={{
            background: "transparent",
            border: "1px solid #ddd",
            padding: "0.3rem 0.8rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            cursor: "pointer",
            color: "var(--charcoal)",
            whiteSpace: "nowrap",
          }}
        >
          {open ? "Hide Preview" : "Preview"}
        </button>
      </div>
      {open && (
        <div style={{ padding: "0 0 1rem", display: "flex", justifyContent: "center" }}>
          <iframe
            ref={iframeRef}
            style={{
              width: "640px",
              height: "480px",
              border: "1px solid #ddd",
              background: "#f5f5f5",
            }}
            title={`${name} preview`}
          />
        </div>
      )}
    </div>
  );
}
