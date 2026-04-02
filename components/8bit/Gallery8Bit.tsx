"use client";

/* eslint-disable @next/next/no-img-element */
import { COLORS, FONT, sectionStyle, sectionTitleStyle } from "./styles";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

type GalleryImage = {
  src: string;
  fallback: string;
  alt: string;
};

const GALLERY_IMAGES: GalleryImage[] = [
  {
    src: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/gallery-0.png`,
    fallback: "/images/PXL_20250831_173006625.jpg",
    alt: "Jaguar XK at the car show",
  },
  {
    src: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/gallery-1.png`,
    fallback: "/images/PXL_20250831_155840683-EFFECTS.jpg",
    alt: "Ferrari California convertible",
  },
  {
    src: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/gallery-2.png`,
    fallback: "/images/PXL_20250831_160335745.jpg",
    alt: "Classic hot rods lined up",
  },
  {
    src: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/gallery-3.png`,
    fallback: "/images/PXL_20250831_163407306.jpg",
    alt: "Mazda Miata convertible",
  },
  {
    src: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/gallery-4.png`,
    fallback: "/images/PXL_20250831_162703340.jpg",
    alt: "Downtown street view with classic cars",
  },
  {
    src: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/gallery-5.png`,
    fallback: "/images/PXL_20250831_161859398.jpg",
    alt: "Classic Corvette C1",
  },
  {
    src: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/gallery-6.png`,
    fallback: "/images/PXL_20250831_171624884.jpg",
    alt: "Convertible Chevy Blazer",
  },
  {
    src: `${SUPABASE_URL}/storage/v1/object/public/pixel-art/8bit/gallery-7.png`,
    fallback: "/images/PXL_20250831_172232318.jpg",
    alt: "Shelby GT350 Mustang",
  },
];

export default function Gallery8Bit() {
  return (
    <section style={sectionStyle(COLORS.bgMid)} id="gallery">
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h2 style={sectionTitleStyle()}>► GALLERY ◄</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
          }}
          className="gallery-8bit-grid"
        >
          {GALLERY_IMAGES.map((image, index) => (
            <GalleryCard key={index} image={image} />
          ))}
        </div>
      </div>

      {/* Responsive override via a style tag */}
      <style>{`
        @media (max-width: 640px) {
          .gallery-8bit-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}

function GalleryCard({ image }: { image: GalleryImage }) {
  return (
    <div
      style={{
        border: `2px solid ${COLORS.border}`,
        overflow: "hidden",
        backgroundColor: COLORS.bgDark,
        cursor: "default",
        transition: "border-color 0.2s",
        fontFamily: FONT,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = COLORS.borderGold;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = COLORS.border;
      }}
    >
      <img
        src={image.src}
        alt={image.alt}
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          objectFit: "cover",
          display: "block",
          imageRendering: "pixelated",
        }}
        onError={(e) => {
          const img = e.currentTarget;
          // Prevent infinite loop if fallback also fails
          if (img.src !== window.location.origin + image.fallback) {
            img.src = image.fallback;
            img.style.imageRendering = "pixelated";
          }
        }}
      />
      <div
        style={{
          padding: "0.5rem 0.6rem",
          fontFamily: FONT,
          fontSize: "0.35rem",
          color: COLORS.midGray,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          lineHeight: "1.8",
        }}
      >
        {image.alt}
      </div>
    </div>
  );
}
