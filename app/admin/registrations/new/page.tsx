"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { MAX_VEHICLES_PER_CHECKOUT } from "@/types/database";

type VehicleForm = {
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  story: string;
};

const emptyVehicle = (): VehicleForm => ({
  vehicle_year: "",
  vehicle_make: "",
  vehicle_model: "",
  vehicle_color: "",
  story: "",
});

export default function NewRegistrationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [owner, setOwner] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    hide_owner_details: false,
  });

  const [vehicles, setVehicles] = useState<VehicleForm[]>([emptyVehicle()]);

  const handleOwnerChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setOwner({ ...owner, [e.target.name]: e.target.value });
  };

  const handleVehicleChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const updated = [...vehicles];
    updated[index] = { ...updated[index], [e.target.name]: e.target.value };
    setVehicles(updated);
  };

  const addVehicle = () => {
    if (vehicles.length < MAX_VEHICLES_PER_CHECKOUT) {
      setVehicles([...vehicles, emptyVehicle()]);
    }
  };

  const removeVehicle = (index: number) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const rows = vehicles.map((v) => ({
      first_name: owner.first_name,
      last_name: owner.last_name,
      email: owner.email,
      phone: owner.phone || null,
      address_street: owner.address_street || null,
      address_city: owner.address_city || null,
      address_state: owner.address_state || null,
      address_zip: owner.address_zip || null,
      hide_owner_details: owner.hide_owner_details,
      vehicle_year: parseInt(v.vehicle_year),
      vehicle_make: v.vehicle_make,
      vehicle_model: v.vehicle_model,
      vehicle_color: v.vehicle_color || null,
      story: v.story || null,
      payment_status: "pending",
      amount_paid: 0,
    }));

    const supabase = createClient();

    if (rows.length === 1) {
      const { data, error: insertError } = await supabase
        .from("registrations")
        .insert(rows[0])
        .select()
        .single();

      setSaving(false);
      if (insertError || !data) {
        setError(insertError?.message || "Failed to create registration");
        return;
      }
      router.push(`/admin/registrations/${data.id}`);
    } else {
      const { error: insertError } = await supabase
        .from("registrations")
        .insert(rows);

      setSaving(false);
      if (insertError) {
        setError(insertError.message || "Failed to create registrations");
        return;
      }
      router.push("/admin/registrations");
    }
  };

  return (
    <>
      <button
        onClick={() => router.push("/admin/registrations")}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-light)",
          cursor: "pointer",
          fontSize: "0.85rem",
          padding: 0,
          marginBottom: "1.5rem",
        }}
      >
        &larr; Back to Registrations
      </button>

      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2rem",
          fontWeight: 400,
          marginBottom: "0.5rem",
        }}
      >
        Add Registration
      </h1>
      <p style={{ color: "var(--text-light)", fontSize: "0.9rem", marginBottom: "2rem" }}>
        Manually add a registration (e.g. staff, VIPs). No payment required.
      </p>

      {error && (
        <div
          style={{
            background: "#fee",
            border: "1px solid #c00",
            color: "#c00",
            padding: "0.8rem",
            marginBottom: "1.5rem",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--white)",
          padding: "2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div className="sponsor-form" style={{ maxWidth: "100%", margin: 0 }}>
          <SectionHeading>Owner Information</SectionHeading>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input type="text" id="first_name" name="first_name" value={owner.first_name} onChange={handleOwnerChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input type="text" id="last_name" name="last_name" value={owner.last_name} onChange={handleOwnerChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input type="email" id="email" name="email" value={owner.email} onChange={handleOwnerChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input type="tel" id="phone" name="phone" value={owner.phone} onChange={handleOwnerChange} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="address_street">Street Address</label>
            <input type="text" id="address_street" name="address_street" value={owner.address_street} onChange={handleOwnerChange} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="address_city">City</label>
              <input type="text" id="address_city" name="address_city" value={owner.address_city} onChange={handleOwnerChange} />
            </div>
            <div className="form-group">
              <label htmlFor="address_state">State</label>
              <input type="text" id="address_state" name="address_state" value={owner.address_state} onChange={handleOwnerChange} maxLength={2} />
            </div>
          </div>
          <div className="form-group" style={{ maxWidth: "200px" }}>
            <label htmlFor="address_zip">ZIP Code</label>
            <input type="text" id="address_zip" name="address_zip" value={owner.address_zip} onChange={handleOwnerChange} maxLength={10} />
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
              color: "var(--charcoal)",
              cursor: "pointer",
              marginTop: "0.5rem",
            }}
          >
            <input
              type="checkbox"
              checked={owner.hide_owner_details}
              onChange={(e) =>
                setOwner({ ...owner, hide_owner_details: e.target.checked })
              }
              style={{ width: "auto", margin: 0 }}
            />
            Hide owner details from placard
          </label>

          {vehicles.map((vehicle, index) => (
            <div key={index}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "2rem",
                  marginBottom: "1.5rem",
                  paddingBottom: "0.5rem",
                  borderBottom: "1px solid rgba(0,0,0,0.1)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.3rem",
                    margin: 0,
                  }}
                >
                  {vehicles.length > 1 ? `Vehicle ${index + 1}` : "Vehicle Information"}
                </h3>
                {vehicles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVehicle(index)}
                    style={{
                      background: "none",
                      border: "1px solid #c00",
                      color: "#c00",
                      padding: "0.3rem 0.8rem",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={`vehicle_year_${index}`}>Year *</label>
                  <input type="number" id={`vehicle_year_${index}`} name="vehicle_year" value={vehicle.vehicle_year} onChange={(e) => handleVehicleChange(index, e)} min="1900" max="2027" required />
                </div>
                <div className="form-group">
                  <label htmlFor={`vehicle_make_${index}`}>Make *</label>
                  <input type="text" id={`vehicle_make_${index}`} name="vehicle_make" value={vehicle.vehicle_make} onChange={(e) => handleVehicleChange(index, e)} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={`vehicle_model_${index}`}>Model *</label>
                  <input type="text" id={`vehicle_model_${index}`} name="vehicle_model" value={vehicle.vehicle_model} onChange={(e) => handleVehicleChange(index, e)} required />
                </div>
                <div className="form-group">
                  <label htmlFor={`vehicle_color_${index}`}>Color</label>
                  <input type="text" id={`vehicle_color_${index}`} name="vehicle_color" value={vehicle.vehicle_color} onChange={(e) => handleVehicleChange(index, e)} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor={`story_${index}`}>Car&apos;s Story (optional)</label>
                <textarea id={`story_${index}`} name="story" value={vehicle.story} onChange={(e) => handleVehicleChange(index, e)} />
              </div>
            </div>
          ))}

          {vehicles.length < MAX_VEHICLES_PER_CHECKOUT && (
            <button
              type="button"
              onClick={addVehicle}
              style={{
                marginTop: "1.5rem",
                width: "100%",
                padding: "0.8rem",
                background: "var(--cream)",
                border: "2px dashed rgba(0,0,0,0.15)",
                color: "var(--charcoal)",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              + Add Another Vehicle
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "2rem" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.6rem 1.5rem",
              background: "var(--gold)",
              color: "var(--charcoal)",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving
              ? "Creating..."
              : vehicles.length > 1
              ? `Create ${vehicles.length} Registrations`
              : "Create Registration"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/registrations")}
            style={{
              padding: "0.6rem 1.5rem",
              background: "var(--white)",
              color: "var(--charcoal)",
              border: "1px solid #ddd",
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "1.3rem",
        marginBottom: "1.5rem",
        marginTop: "2rem",
        paddingBottom: "0.5rem",
        borderBottom: "1px solid rgba(0,0,0,0.1)",
      }}
    >
      {children}
    </h3>
  );
}
