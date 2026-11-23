import { createServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import SponsorPaymentForm from "./SponsorPaymentForm";

export default async function SponsorPayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServerClient();

  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("*")
    .eq("payment_token", token)
    .single();

  if (!sponsor) notFound();

  // Tiers and show year come from the sponsor's own event
  const [{ data: tiers }, { data: event }] = await Promise.all([
    supabase
      .from("sponsorship_tiers")
      .select("*")
      .eq("event_id", sponsor.event_id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("events")
      .select("year")
      .eq("id", sponsor.event_id)
      .maybeSingle(),
  ]);

  return (
    <SponsorPaymentForm
      sponsor={sponsor}
      tiers={tiers || []}
      token={token}
      eventYear={event?.year ?? null}
    />
  );
}
