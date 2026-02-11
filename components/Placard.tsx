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

      {/* Owner + hometown */}
      <div className="placard-owner">
        {r.first_name} {r.last_name}
        {r.hometown && (
          <span className="placard-hometown"> &mdash; {r.hometown}</span>
        )}
      </div>

      {/* Divider */}
      <div className="placard-divider" />

      {/* Category (only if award assigned) */}
      {r.award_category && (
        <div className="placard-category">{r.award_category}</div>
      )}

      {/* Details */}
      {(r.engine_specs || r.modifications || r.vehicle_color) && (
        <div className="placard-details">
          {r.vehicle_color && (
            <div className="placard-detail">
              <span className="placard-detail-label">Color</span>
              <span>{r.vehicle_color}</span>
            </div>
          )}
          {r.engine_specs && (
            <div className="placard-detail">
              <span className="placard-detail-label">Engine</span>
              <span>{r.engine_specs}</span>
            </div>
          )}
          {r.modifications && (
            <div className="placard-detail">
              <span className="placard-detail-label">Modifications</span>
              <span>{r.modifications}</span>
            </div>
          )}
        </div>
      )}

      {/* Story */}
      {r.story && (
        <div className="placard-story">
          <p>{r.story}</p>
        </div>
      )}

    </div>
  );
}
