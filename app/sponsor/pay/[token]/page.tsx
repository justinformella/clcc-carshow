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

  const { data: tiers } = await supabase
    .from("sponsorship_tiers")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return <SponsorPaymentForm sponsor={sponsor} tiers={tiers || []} token={token} />;
}
