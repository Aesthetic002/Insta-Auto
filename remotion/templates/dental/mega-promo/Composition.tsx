import { AbsoluteFill, Img } from "remotion";
import { z } from "zod";
import { INTER } from "../../../fonts";
import { ClinicLogo } from "../ClinicLogo";

export const dentalMegaPromoSchema = z.object({
  imageUrl: z.string(),
  headlineLine1: z.string(), // "Dental"
  headlineLine2: z.string(), // "Care"
  tagline: z.string(),       // short italic-feeling supporting line
  service1: z.string(),
  service2: z.string(),
  service3: z.string(),
  service4: z.string(),
  clinicName: z.string(),
  phone: z.string(),
  logoUrl: z.string().optional(),
});

export type DentalMegaPromoProps = z.infer<typeof dentalMegaPromoSchema>;

const TEAL = "#3fb8b0";
const TEAL_DEEP = "#1f7d7a";
const TEAL_INK = "#0f4d4a";
const CREAM = "#fafffd";

function HalftoneDots() {
  const dots: { x: number; y: number; r: number; opacity: number }[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      dots.push({
        x: col * 24,
        y: row * 24,
        r: 4 + (col / 10) * 3,
        opacity: 0.16 + (col / 10) * 0.2,
      });
    }
  }
  return (
    <svg
      width="240"
      height="240"
      viewBox="0 0 240 240"
      style={{ pointerEvents: "none" }}
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="white" opacity={d.opacity} />
      ))}
    </svg>
  );
}

function CheckIcon() {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 38,
        backgroundColor: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4 4 10-10"
          stroke={TEAL_DEEP}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function DentalMegaPromo({
  imageUrl,
  headlineLine1,
  headlineLine2,
  tagline,
  service1,
  service2,
  service3,
  service4,
  clinicName,
  phone,
  logoUrl,
}: DentalMegaPromoProps) {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(155deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`,
        fontFamily: INTER,
      }}
    >
      {/* Logo top-left */}
      <div style={{ position: "absolute", top: 80, left: 80 }}>
        <ClinicLogo logoUrl={logoUrl} clinicName={clinicName} color="white" size={56} />
      </div>

      {/* Asymmetric photo cutout — middle/bottom-left, curved top-right edge */}
      <div
        style={{
          position: "absolute",
          top: 380,
          left: 0,
          width: 540,
          height: 800,
          overflow: "hidden",
          borderRadius: "0 60% 0 0 / 0 28% 0 0",
        }}
      >
        <Img
          src={imageUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Headline right side */}
      <div
        style={{
          position: "absolute",
          top: 220,
          right: 60,
          width: 460,
          color: "white",
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
          }}
        >
          {headlineLine1}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 140,
            fontWeight: 900,
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
          }}
        >
          {headlineLine2}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 24,
            fontWeight: 500,
            lineHeight: 1.35,
            color: CREAM,
            fontStyle: "italic",
            maxWidth: 440,
          }}
        >
          &ldquo;{tagline}&rdquo;
        </div>
      </div>

      {/* Services pill block right-side, below headline */}
      <div
        style={{
          position: "absolute",
          top: 720,
          right: 60,
          width: 460,
          color: "white",
        }}
      >
        <div
          style={{
            backgroundColor: TEAL_INK,
            color: "white",
            padding: "14px 28px",
            borderRadius: 999,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "0.08em",
            display: "inline-block",
            marginBottom: 16,
          }}
        >
          OUR SERVICES
        </div>
        {[service1, service2, service3, service4].map((s) => (
          <div
            key={s}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 24,
              fontWeight: 600,
              marginTop: 12,
              color: "white",
            }}
          >
            <CheckIcon />
            {s}
          </div>
        ))}
      </div>

      {/* Halftone behind contact strip */}
      <div style={{ position: "absolute", right: 0, bottom: 0 }}>
        <HalftoneDots />
      </div>

      {/* Contact strip bottom-left, pill-shaped */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 60,
          display: "flex",
          alignItems: "center",
          gap: 16,
          backgroundColor: TEAL_INK,
          padding: "16px 28px",
          borderRadius: 999,
          color: "white",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 56,
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M6.5 3a1 1 0 00-1 1.2C7 14 10 17 19.8 18.5a1 1 0 001.2-1V14a1 1 0 00-.8-1l-3-.6a1 1 0 00-1 .4l-.9 1.3c-2-1-3.5-2.5-4.5-4.5l1.3-.9a1 1 0 00.4-1L11.6 4a1 1 0 00-1-.8H6.5z"
              fill={TEAL_DEEP}
            />
          </svg>
        </div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.9 }}>
            Contact Us
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            {phone}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
