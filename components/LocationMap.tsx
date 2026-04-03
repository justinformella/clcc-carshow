"use client";

import { APIProvider, Map, Marker, ControlPosition } from "@vis.gl/react-google-maps";
import { useState, useEffect } from "react";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function LocationMap({
  address,
  lat,
  lng,
  height = "300px",
}: {
  address?: string;
  lat?: number | null;
  lng?: number | null;
  height?: string;
}) {
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );

  useEffect(() => {
    if (center || !address) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        setCenter({ lat: loc.lat(), lng: loc.lng() });
      }
    });
  }, [address, center]);

  if (!center) {
    return (
      <div style={{ width: "100%", height, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: "0.85rem" }}>
        Loading map…
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={center}
        defaultZoom={13}
        style={{ width: "100%", height }}
        gestureHandling="cooperative"
        disableDefaultUI={false}
        zoomControl={true}
        zoomControlOptions={{ position: ControlPosition.RIGHT_BOTTOM }}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
      >
        <Marker position={center} />
      </Map>
    </APIProvider>
  );
}
