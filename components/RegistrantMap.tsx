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

    // Gold map pin marker
    const icon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:30px;height:42px;">
        <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#c9a84c"/>
          <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="url(#grad)"/>
          <circle cx="15" cy="14" r="6" fill="#2c2c2c"/>
          <circle cx="15" cy="14" r="4" fill="#c9a84c"/>
          <defs><linearGradient id="grad" x1="15" y1="0" x2="15" y2="42"><stop offset="0" stop-color="#fff" stop-opacity="0.25"/><stop offset="1" stop-color="#000" stop-opacity="0.15"/></linearGradient></defs>
        </svg>
        <div style="position:absolute;top:38px;left:50%;transform:translateX(-50%);width:14px;height:4px;background:rgba(0,0,0,0.2);border-radius:50%;filter:blur(2px);"></div>
      </div>`,
      iconSize: [30, 46],
      iconAnchor: [15, 42],
      popupAnchor: [0, -36],
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
