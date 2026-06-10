import { AbsoluteFill, Img } from "remotion";
import { z } from "zod";
import { INTER } from "../../../fonts";
import { ClinicLogo } from "../ClinicLogo";

export const dentalTestimonialSchema = z.object({
  patientPhotoUrl: z.string(),
  patientName: z.string(),
  quote: z.string(),
  rating: z.number().int().min(1).max(5),
  clinicName: z.string(),
  logoUrl: z.string().optional(),
});

export type DentalTestimonialProps = z.infer<typeof dentalTestimonialSchema>;

const LAVENDER_BG = "#9aa5e8";
const LAVENDER_INK = "#3d4cb8";
const NAVY = "#1a2766";
const GOLD = "#fbbf24";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2.5l2.95 6.5 7.05.75-5.3 4.9 1.6 7.1-6.3-3.85L5.7 21.75l1.6-7.1L2 9.75 9.05 9 12 2.5z"
        fill={filled ? GOLD : "rgba(0,0,0,0.12)"}
      />
    </svg>
  );
}

export function DentalTestimonial({
  patientPhotoUrl,
  patientName,
  quote,
  rating,
  clinicName,
  logoUrl,
}: DentalTestimonialProps) {
  return (
    <AbsoluteFill
      style={{ backgroundColor: LAVENDER_BG, fontFamily: INTER }}
    >
      {/* Right-side patient photo with asymmetric curved left edge */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 60,
          bottom: 60,
          width: 540,
          // Subtle decorative outer border
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "260px 30px 30px 30px",
            overflow: "hidden",
            backgroundColor: "white",
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          }}
        >
          <Img
            src={patientPhotoUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      {/* Clinic logo top-right (small, sitting over photo edge) */}
      <div
        style={{
          position: "absolute",
          top: 90,
          right: 86,
          backgroundColor: "rgba(255,255,255,0.92)",
          padding: "10px 18px",
          borderRadius: 14,
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
        }}
      >
        <ClinicLogo
          logoUrl={logoUrl}
          clinicName={clinicName}
          color={LAVENDER_INK}
          size={36}
        />
      </div>

      {/* Left white card with quote */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          width: 380,
          bottom: 60,
          backgroundColor: "white",
          borderRadius: 28,
          padding: "60px 50px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Big quote mark */}
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 140,
            lineHeight: 0.6,
            color: LAVENDER_INK,
            fontWeight: 900,
            marginBottom: 12,
          }}
        >
          &ldquo;
        </div>

        <div
          style={{
            fontSize: 30,
            fontWeight: 500,
            lineHeight: 1.3,
            color: NAVY,
            letterSpacing: "-0.01em",
            flex: 1,
          }}
        >
          {quote}
        </div>

        {/* Stars */}
        <div style={{ display: "flex", gap: 4, marginTop: 20 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} filled={i <= rating} />
          ))}
        </div>

        {/* Patient name */}
        <div
          style={{
            marginTop: 14,
            fontSize: 28,
            fontWeight: 800,
            color: NAVY,
            letterSpacing: "-0.01em",
          }}
        >
          — {patientName}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 18,
            fontWeight: 600,
            color: LAVENDER_INK,
            opacity: 0.7,
          }}
        >
          Patient at {clinicName}
        </div>
      </div>
    </AbsoluteFill>
  );
}
