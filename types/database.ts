export type Registration = {
  id: string;
  car_number: number;
  // Owner info
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  // Vehicle info
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string | null;
  story: string | null;
  // Award (admin-assigned, null = no award)
  award_category: string | null;
  // Payment
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payment_status: "pending" | "paid" | "comped" | "refunded" | "archived";
  amount_paid: number;
  donation_cents: number;
  // Privacy
  hide_owner_details: boolean;
  // Check-in
  checked_in: boolean;
  checked_in_at: string | null;
  // AI image
  ai_image_url: string | null;
  // Geocoded location
  lat: number | null;
  lng: number | null;
  // UTM attribution
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  // Payment timestamp
  paid_at: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
};

export type RegistrationInsert = Omit<
  Registration,
  "id" | "car_number" | "created_at" | "updated_at" | "checked_in" | "checked_in_at" | "payment_status" | "amount_paid" | "ai_image_url" | "award_category" | "utm_source" | "utm_medium" | "utm_campaign"
> & {
  payment_status?: string;
  amount_paid?: number;
};

export const AWARD_CATEGORIES = [
  "Best Classic (Pre-2000)",
  "Best Modern (2000+)",
  "Best European",
  "Best Japanese",
  "Best Domestic",
  "Best Vanity Plate",
  "Best Interior",
  "Best Custom",
  "Best of Show",
] as const;

export type Admin = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "organizer";
  created_at: string;
  last_login_at: string | null;
};

export type EmailType =
  | "confirmation"
  | "admin_notification"
  | "announcement"
  | "sponsor_notification"
  | "help_request_confirmation"
  | "help_request_admin_notification"
  | "help_request_reply"
  | "email_reply";

export type EmailLog = {
  id: string;
  registration_id: string | null;
  email_type: EmailType;
  recipient_email: string;
  subject: string;
  sent_at: string;
  resend_id: string | null;
};

export type AuditLogEntry = {
  id: string;
  registration_id: string;
  changed_fields: Record<string, { old: unknown; new: unknown }>;
  actor_email: string | null;
  created_at: string;
};

export type StripePaymentDetails = {
  payment: {
    status: string;
    amount: number;
    currency: string;
    created: number;
  };
  card: {
    brand: string | null;
    last4: string | null;
    exp_month: number | null;
    exp_year: number | null;
    funding: string | null;
    country: string | null;
    network: string | null;
    wallet: string | null;
    checks: {
      cvc: string | null;
      address_line1: string | null;
      address_postal_code: string | null;
    };
  } | null;
  billing: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: {
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
  } | null;
  risk: {
    risk_level: string | null | undefined;
    risk_score: number | null | undefined;
    network_status: string | null | undefined;
    seller_message: string | null | undefined;
  } | null;
  fees: {
    stripe_fee: number;
    net: number;
  } | null;
  refunds: {
    id: string;
    amount: number;
    status: string | null;
    reason: string | null;
    created: number;
  }[];
  dispute: {
    id: string;
    status: string;
    reason: string;
    amount: number;
    created: number;
  } | null;
  links: {
    receipt_url: string | null;
    dashboard_url: string | null;
  };
  charge_id: string | null;
};

export type SponsorStatus = "prospect" | "inquired" | "engaged" | "paid" | "archived";

export type Sponsor = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  website: string | null;
  sponsorship_level: string;
  message: string | null;
  status: SponsorStatus;
  amount_paid: number;
  notes: string | null;
  assigned_to: string | null;
  logo_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SponsorAuditLogEntry = {
  id: string;
  sponsor_id: string;
  changed_fields: Record<string, { old: unknown; new: unknown }>;
  actor_email: string | null;
  created_at: string;
};

export const SPONSORSHIP_LEVELS = [
  "Presenting Sponsor ($2,500)",
  "Premier Sponsor ($1,000)",
  "Community Sponsor ($500)",
  "Other / Not Sure",
] as const;

export const DONATION_PRESETS = [500, 1000, 2500, 5000] as const;

export const MAX_REGISTRATIONS = 200;
export const MAX_VEHICLES_PER_CHECKOUT = 5;
export const REGISTRATION_PRICE_CENTS = 3000;
export const REGISTRATION_PRICE_DISPLAY = "$30";

export const AD_PLATFORMS = [
  "facebook",
  "instagram",
  "google",
  "tiktok",
  "other",
] as const;

export type AdCampaign = {
  id: string;
  platform: string;
  campaign_name: string;
  status: "active" | "paused" | "completed";
  budget_cents: number | null;
  spent_cents: number;
  impressions: number;
  clicks: number;
  utm_campaign: string | null;
  external_url: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Help Desk ───

export type HelpRequestStatus = "open" | "in_progress" | "waiting_on_submitter" | "resolved" | "closed";
export type HelpRequestCategory = "general" | "registration" | "sponsorship" | "event_day" | "website" | "other";
export type HelpRequestPriority = "low" | "normal" | "high";

export const HELP_REQUEST_STATUSES: { value: HelpRequestStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_submitter", label: "Waiting on Submitter" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const HELP_REQUEST_CATEGORIES: { value: HelpRequestCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "registration", label: "Registration" },
  { value: "sponsorship", label: "Sponsorship" },
  { value: "event_day", label: "Event Day" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];

export const HELP_REQUEST_PRIORITIES: { value: HelpRequestPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

export type HelpRequest = {
  id: string;
  request_number: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  category: HelpRequestCategory;
  status: HelpRequestStatus;
  priority: HelpRequestPriority;
  assigned_to: string | null;
  registration_id: string | null;
  internal_notes: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HelpRequestMessage = {
  id: string;
  help_request_id: string;
  sender_type: "submitter" | "admin";
  sender_name: string;
  sender_email: string;
  body: string;
  is_internal: boolean;
  created_at: string;
};

export type HelpRequestAuditLogEntry = {
  id: string;
  help_request_id: string;
  changed_fields: Record<string, { old: unknown; new: unknown }>;
  actor_email: string | null;
  created_at: string;
};

// ─── Marketing Email Outreach ───

export type MarketingProspect = {
  id: string;
  email: string;
  name: string | null;
  source: "manual" | "import";
  unsubscribed: boolean;
  created_at: string;
};

export type MarketingSend = {
  id: string;
  prospect_id: string;
  template_key: string;
  subject: string;
  status: "sent" | "failed";
  resend_id: string | null;
  error_message: string | null;
  sent_at: string;
};

export const MARKETING_TEMPLATES = [
  {
    key: "save_the_date_2026",
    label: "Save the Date — May 17, 2026",
    subject: "Save the Date: Crystal Lake Cars & Caffeine — May 17, 2026",
  },
  {
    key: "register_now_2026",
    label: "Register Now — May 17, 2026",
    subject: "Registration Is Open: Crystal Lake Cars & Caffeine — May 17, 2026",
  },
] as const;

export type MarketingTemplateKey = (typeof MARKETING_TEMPLATES)[number]["key"];
