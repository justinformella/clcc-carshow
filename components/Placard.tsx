import type { Registration } from "@/types/database";

export default function Placard({ registration }: { registration: Registration }) {
  const r = registration;
  return (
    <div className="placard">
      {/* Top rule */}
      <div className="placard-top-rule" />

      {/* Car number, large */}
      <div className="placard-number">#{r.car_number}</div>

      {/* Vehicle name */}
      <div className="placard-vehicle">
        {r.vehicle_year} {r.vehicle_make} {r.vehicle_model}
      </div>

      {/* Owner + location */}
      <div className="placard-owner">
        {r.first_name} {r.last_name}
        {(r.address_city || r.address_state) && (
          <span className="placard-hometown"> &mdash; {[r.address_city, r.address_state].filter(Boolean).join(", ")}</span>
        )}
      </div>

      {/* Divider */}
      <div className="placard-divider" />

      {/* Category (only if award assigned) */}
      {r.award_category && (
        <div className="placard-category">{r.award_category}</div>
      )}

      {/* Details */}

      {/* Story */}
      {r.story && (
        <div className="placard-story">
          <p>{r.story}</p>
        </div>
      )}

    </div>
  );
}
