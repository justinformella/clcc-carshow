import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured." },
        { status: 500 }
      );
    }

    const supabase = createServerClient();

    // Fetch the ticket and its messages in parallel
    const [ticketResult, messagesResult] = await Promise.all([
      supabase
        .from("help_requests")
        .select("*")
        .eq("id", id)
        .single(),
      supabase
        .from("help_request_messages")
        .select("*")
        .eq("help_request_id", id)
        .eq("is_internal", false)
        .order("created_at", { ascending: true }),
    ]);

    if (ticketResult.error || !ticketResult.data) {
      return NextResponse.json(
        { error: "Ticket not found." },
        { status: 404 }
      );
    }

    const ticket = ticketResult.data;
    const messages = messagesResult.data || [];

    // Build conversation history for GPT
    const conversationLines = messages.map(
      (m) =>
        `[${m.sender_type === "admin" ? "Admin" : "Customer"} — ${m.sender_name}]: ${m.body}`
    );

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You are a friendly, helpful support agent for Crystal Lake Cars & Caffeine (CLCC), a charity car show benefiting the Crystal Lake Food Pantry held on May 17, 2026 in downtown Crystal Lake, Illinois. Registration is $30 per vehicle.

Draft a concise, warm reply to this help desk ticket. Be helpful and specific. Do not include a subject line — just the reply body. Do not use placeholder brackets like [Name]. Keep it to 2-4 short paragraphs.`,
        },
        {
          role: "user",
          content: `Ticket #${ticket.request_number}
Subject: ${ticket.subject}
Category: ${ticket.category}
From: ${ticket.name} (${ticket.email})

Conversation:
${conversationLines.length > 0 ? conversationLines.join("\n\n") : "(No messages yet — this is a new ticket.)"}

Draft a reply from the admin team:`,
        },
      ],
    });

    const suggestion =
      completion.choices[0]?.message?.content?.trim() || "";

    if (!suggestion) {
      return NextResponse.json(
        { error: "No suggestion generated." },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestion });
  } catch (err) {
    console.error("Suggest error:", err);
    return NextResponse.json(
      { error: "Failed to generate suggestion." },
      { status: 500 }
    );
  }
}
