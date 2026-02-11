export type Registration = {
  id: string;
  car_number: number;
  // Owner info
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  hometown: string | null;
  // Vehicle info
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string | null;
  engine_specs: string | null;
  modifications: string | null;
  story: string | null;
  // Award (admin-assigned, null = no award)
  award_category: string | null;
  // Payment
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payment_status: "pending" | "paid" | "refunded" | "archived";
  amount_paid: number;
  // Check-in
  checked_in: boolean;
  checked_in_at: string | null;
  // AI image
  ai_image_url: string | null;
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
] as const;

export type Admin = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "organizer";
  created_at: string;
  last_login_at: string | null;
};

export type EmailType = "confirmation" | "admin_notification" | "announcement" | "sponsor_notification";

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

export type SponsorStatus = "prospect" | "inquired" | "engaged" | "paid";

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
  "Platinum Sponsor ($2,000)",
  "Gold Sponsor ($500)",
  "Other / Not Sure",
] as const;

export const MAX_REGISTRATIONS = 200;
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
