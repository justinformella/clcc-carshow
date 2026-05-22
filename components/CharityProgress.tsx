"use client";

import { useEffect, useState } from "react";

export default function CharityProgress() {
  const [raised, setRaised] = useState<number | null>(null);
  const [goal, setGoal] = useState(1000000);

  useEffect(() => {
    fetch("/api/charity/progress")
      .then((res) => res.json())
      .then((data) => {
        setRaised(data.raised_cents);
        setGoal(data.goal_cents);
      })
      .catch(() => {});
  }, []);

  if (raised === null) return null;

  const pct = Math.min(100, (raised / goal) * 100);
  const raisedDollars = Math.floor(raised / 100);
  const goalDollars = Math.floor(goal / 100);

  return (
    <div className="charity-progress">
      <style>{`
        .charity-progress {
          width: 100%;
          margin-top: auto;
          padding: 2rem 1.5rem;
          background: linear-gradient(transparent, rgba(0,0,0,0.75));
        }
        .charity-progress-inner {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 1.8rem;
        }
        .charity-progress-label {
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--gold);
          white-space: nowrap;
          font-weight: 600;
        }
        .charity-progress-bar {
          flex: 1;
          height: 16px;
          background: rgba(255,255,255,0.15);
          border-radius: 9px;
          overflow: hidden;
        }
        .charity-progress-bar-fill {
          width: ${pct}%;
          height: 100%;
          background: linear-gradient(90deg, var(--gold), var(--gold-light));
          border-radius: 9px;
          box-shadow: 0 0 18px rgba(212,164,74,0.45);
          transition: width 1.5s ease;
        }
        .charity-progress-amount {
          font-family: 'Playfair Display', serif;
          font-size: 1.4rem;
          color: var(--gold);
          white-space: nowrap;
        }
        .charity-progress-amount-goal {
          font-size: 0.95rem;
          color: rgba(255,255,255,0.5);
        }
        @media (max-width: 600px) {
          .charity-progress {
            background: rgba(0,0,0,0.6);
            padding: 1.5rem 1.25rem;
            margin-top: 1.75rem;
          }
          .charity-progress-inner {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            text-align: center;
          }
          .charity-progress-label {
            font-size: 0.7rem;
            letter-spacing: 0.2em;
          }
          .charity-progress-amount {
            font-size: 1rem;
            white-space: nowrap;
          }
          .charity-progress-amount-goal {
            font-size: 0.85rem;
          }
        }
      `}</style>
      <div className="charity-progress-inner">
        <span className="charity-progress-label">Raised for the Food Pantry</span>
        <div className="charity-progress-bar">
          <div className="charity-progress-bar-fill" />
        </div>
        <span className="charity-progress-amount">
          ${raisedDollars.toLocaleString()}{" "}
          <span className="charity-progress-amount-goal">
            of ${goalDollars.toLocaleString()} Goal
          </span>
        </span>
      </div>
    </div>
  );
}
