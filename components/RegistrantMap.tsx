"use client";

import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap, ControlPosition } from "@vis.gl/react-google-maps";
import { useState, useEffect } from "react";

type MapPin = {
  lat: number;
  lng: number;
  label: string;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || pins.length === 0) return;

    if (pins.length === 1) {
      map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
      map.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const pin of pins) {
      bounds.extend({ lat: pin.lat, lng: pin.lng });
    }
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, pins]);

  return null;
}

export default function RegistrantMap({ pins }: { pins: MapPin[] }) {
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

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

  const avgLat = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
  const avgLng = pins.reduce((s, p) => s + p.lng, 0) / pins.length;

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={{ lat: avgLat, lng: avgLng }}
        defaultZoom={12}
        style={{ width: "100%", height: "450px" }}
        mapId="registrant-map"
        gestureHandling="cooperative"
        disableDefaultUI={false}
        zoomControl={true}
        zoomControlOptions={{ position: ControlPosition.RIGHT_BOTTOM }}
        mapTypeControl={true}
        streetViewControl={false}
        fullscreenControl={true}
      >
        <FitBounds pins={pins} />
        {pins.map((pin, i) => (
          <AdvancedMarker
            key={i}
            position={{ lat: pin.lat, lng: pin.lng }}
            onClick={() => setSelectedPin(pin)}
          >
            <div
              style={{
                width: "22px",
                height: "22px",
                background: "#dc2626",
                border: "3px solid #fff",
                borderRadius: "50%",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                cursor: "pointer",
              }}
            />
          </AdvancedMarker>
        ))}
        {selectedPin && (
          <InfoWindow
            position={{ lat: selectedPin.lat, lng: selectedPin.lng }}
            onCloseClick={() => setSelectedPin(null)}
            pixelOffset={[0, -14]}
          >
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 500, padding: "2px 4px" }}>
              {selectedPin.label}
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
