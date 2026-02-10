"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const encodedLink = searchParams.get("link");
  const inviteLink = encodedLink ? decodeURIComponent(atob(encodedLink)) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--charcoal)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "var(--white)",
          padding: "3rem",
          maxWidth: "400px",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.8rem",
            fontWeight: 400,
            color: "var(--charcoal)",
            marginBottom: "0.5rem",
          }}
        >
          Welcome
        </h1>
        <p
          style={{
            color: "var(--text-light)",
            fontSize: "0.9rem",
            marginBottom: "2rem",
            lineHeight: 1.6,
          }}
        >
          You&apos;ve been invited to join the Crystal Lake Cars &amp; Coffee admin team.
        </p>

        {inviteLink ? (
          <a
            href={inviteLink}
            style={{
              display: "inline-block",
              padding: "0.8rem 2rem",
              background: "var(--gold)",
              color: "var(--charcoal)",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            Set Your Password
          </a>
        ) : (
          <div
            style={{
              background: "#fee",
              border: "1px solid #c00",
              color: "#c00",
              padding: "0.8rem",
              fontSize: "0.85rem",
            }}
          >
            This invite link is invalid. Please ask an admin to resend your invite.
          </div>
        )}
      </div>
    </div>
  );
}
