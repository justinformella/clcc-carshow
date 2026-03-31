"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapPin = {
  lat: number;
  lng: number;
  label: string;
};

export default function RegistrantMap({ pins }: { pins: MapPin[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || pins.length === 0) return;

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    // Gold marker icon
    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width: 12px;
        height: 12px;
        background: #c9a84c;
        border: 2px solid #2c2c2c;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const markers = pins.map((pin) =>
      L.marker([pin.lat, pin.lng], { icon }).addTo(map).bindPopup(
        `<div style="font-family:'Inter',sans-serif;font-size:13px;font-weight:500;">${pin.label}</div>`
      )
    );

    // Fit bounds to show all markers
    if (markers.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 11);
    } else {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [pins]);

  if (pins.length === 0) {
    return (
      <div
        style={{
          background: "var(--cream)",
          padding: "2rem",
          textAlign: "center",
          color: "var(--text-light)",
          fontSize: "0.85rem",
        }}
      >
        No geocoded registrations yet. New registrations will appear on the map automatically.
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "450px",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    />
  );
}
