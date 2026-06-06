import { AbsoluteFill, Img } from "remotion";
import { z } from "zod";
import { INTER } from "../../../fonts";

export const dentalOfferCardSchema = z.object({
  imageUrl: z.string(),
  headlineLine1: z.string(), // e.g. "Dental"
  headlineLine2: z.string(), // e.g. "Care"
  service1: z.string(),
  service2: z.string(),
  service3: z.string(),
  service4: z.string(),
  clinicName: z.string(),
  phone: z.string(),
});

export type DentalOfferCardProps = z.infer<typeof dentalOfferCardSchema>;

const NAVY = "#0a3a7a";
const NAVY_DEEP = "#082a5a";
const POWDER = "#b8d4f5";

function PlusPattern() {
  // Decorative subtle plus signs scattered behind everything.
  const items: { x: number; y: number; size: number; opacity: number }[] = [
    { x: 80, y: 980, size: 120, opacity: 0.12 },
    { x: 620, y: 540, size: 120, opacity: 0.1 },
    { x: 880, y: 740, size: 80, opacity: 0.16 },
    { x: 380, y: 1180, size: 100, opacity: 0.1 },
    { x: 220, y: 60, size: 70, opacity: 0.12 },
    { x: 920, y: 1180, size: 90, opacity: 0.1 },
  ];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {items.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <rect x="40" y="0" width="20" height="100" fill="white" />
            <rect x="0" y="40" width="100" height="20" fill="white" />
          </svg>
        </div>
      ))}
    </AbsoluteFill>
  );
}

function ToothMark() {
  // Stylized tooth glyph for the clinic logo.
  return (
    <svg width="68" height="68" viewBox="0 0 100 100" fill="none">
      <path
        d="M28 14C20 14 14 22 14 32c0 8 4 14 6 22 1 6 0 14 2 22 2 6 6 10 10 10 4 0 6-4 8-12 1-6 2-10 6-10s5 4 6 10c2 8 4 12 8 12 4 0 8-4 10-10 2-8 1-16 2-22 2-8 6-14 6-22 0-10-6-18-14-18-6 0-10 4-18 4S34 14 28 14z"
        fill="white"
      />
    </svg>
  );
}

function CheckCircle() {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 44,
        backgroundColor: POWDER,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4 4 10-10"
          stroke={NAVY}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function DentalOfferCard({
  imageUrl,
  headlineLine1,
  headlineLine2,
  service1,
  service2,
  service3,
  service4,
  clinicName,
  phone,
}: DentalOfferCardProps) {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(155deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
        fontFamily: INTER,
      }}
    >
      <PlusPattern />

      {/* Logo + clinic name top-left */}
      <div
        style={{
          position: "absolute",
          top: 86,
          left: 86,
          display: "flex",
          alignItems: "center",
          gap: 18,
          color: "white",
        }}
      >
        <ToothMark />
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontWeight: 900, fontSize: 38, letterSpacing: "0.06em" }}>
            {clinicName.toUpperCase().split(" ")[0]}
          </div>
          <div
            style={{
              fontWeight: 600,
              fontSize: 28,
              letterSpacing: "0.18em",
              opacity: 0.9,
            }}
          >
            CLINIC
          </div>
        </div>
      </div>

      {/* Right-side headline */}
      <div
        style={{
          position: "absolute",
          top: 90,
          right: 60,
          textAlign: "right",
          color: "white",
          fontFamily: INTER,
        }}
      >
        <div
          style={{
            fontSize: 180,
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            color: POWDER,
          }}
        >
          {headlineLine1}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 180,
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            color: "white",
          }}
        >
          {headlineLine2}
        </div>
        {/* Book Now pill */}
        <div
          style={{
            marginTop: 40,
            display: "inline-flex",
            backgroundColor: POWDER,
            color: NAVY,
            padding: "20px 48px",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: "0.1em",
          }}
        >
          BOOK NOW
        </div>
      </div>

      {/* Circular photo cutout on the left */}
      <div
        style={{
          position: "absolute",
          top: 460,
          left: 80,
          width: 480,
          height: 480,
          borderRadius: 480,
          overflow: "hidden",
          border: `8px solid ${POWDER}`,
          backgroundColor: "white",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        <Img
          src={imageUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Service list */}
      <div
        style={{
          position: "absolute",
          bottom: 110,
          left: 90,
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            marginBottom: 24,
          }}
        >
          Our Services
        </div>
        {[service1, service2, service3, service4].map((s) => (
          <div
            key={s}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginBottom: 16,
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            <CheckCircle />
            {s}
          </div>
        ))}
      </div>

      {/* Phone bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          right: 80,
          textAlign: "right",
          color: "white",
          fontFamily: INTER,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.8 }}>
          Contact Us:
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: "0.02em",
          }}
        >
          {phone}
        </div>
      </div>
    </AbsoluteFill>
  );
}
