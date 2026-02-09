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
  // Event info
  preferred_category: string;
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
  // Timestamps
  created_at: string;
  updated_at: string;
};

export type RegistrationInsert = Omit<
  Registration,
  "id" | "car_number" | "created_at" | "updated_at" | "checked_in" | "checked_in_at" | "payment_status" | "amount_paid" | "ai_image_url"
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
  role: string;
  created_at: string;
};

export type EmailType = "confirmation" | "admin_notification" | "announcement";

export type EmailLog = {
  id: string;
  registration_id: string | null;
  email_type: EmailType;
  recipient_email: string;
  subject: string;
  sent_at: string;
  resend_id: string | null;
};

export const MAX_REGISTRATIONS = 200;
export const REGISTRATION_PRICE_CENTS = 3000;
export const REGISTRATION_PRICE_DISPLAY = "$30";
