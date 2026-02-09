import type { Registration } from "@/types/database";

export default function Placard({ registration }: { registration: Registration }) {
  const r = registration;
  return (
    <div className="placard">
      <div className="placard-header">
        <div className="placard-event">
          Crystal Lake Cars &amp; Caffeine &middot; May 17, 2026
        </div>
        <div className="placard-number">#{r.car_number}</div>
      </div>
      <div className="placard-vehicle">
        {r.vehicle_year} {r.vehicle_make} {r.vehicle_model}
      </div>
      <div className="placard-owner">
        {r.first_name} {r.last_name}
        {r.hometown && (
          <span className="placard-hometown"> &middot; {r.hometown}</span>
        )}
      </div>
      <div className="placard-category">{r.preferred_category}</div>

      <div className="placard-details">
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

      {r.story && (
        <div className="placard-story">
          <span className="placard-detail-label">The Story</span>
          <p>{r.story}</p>
        </div>
      )}

      <div className="placard-footer">
        4th Annual Charity Car Show &middot; Benefiting Crystal Lake Food Pantry
      </div>
    </div>
  );
}
