import { AbsoluteFill, Img } from "remotion";
import { z } from "zod";

export const dentalTestimonialSchema = z.object({
  patientPhotoUrl: z.string(),
  patientName: z.string(),
  quote: z.string(),
  rating: z.number().int().min(1).max(5),
  clinicName: z.string(),
});

export type DentalTestimonialProps = z.infer<typeof dentalTestimonialSchema>;

const NAVY = "#0c1f3f";
const TEAL = "#15b8a6";
const GOLD = "#fbbf24";
const CREAM = "#fef9f3";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2.5l2.95 6.5 7.05.75-5.3 4.9 1.6 7.1-6.3-3.85L5.7 21.75l1.6-7.1L2 9.75 9.05 9 12 2.5z"
        fill={filled ? GOLD : "rgba(0,0,0,0.15)"}
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
}: DentalTestimonialProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
      {/* Decorative top stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 12,
          backgroundColor: TEAL,
        }}
      />

      {/* Giant quote mark */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          fontFamily: "Georgia, serif",
          fontSize: 280,
          fontWeight: 900,
          color: TEAL,
          opacity: 0.18,
          lineHeight: 1,
        }}
      >
        &ldquo;
      </div>

      {/* Quote text */}
      <div
        style={{
          position: "absolute",
          top: 180,
          left: 80,
          right: 80,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 56,
          fontWeight: 500,
          lineHeight: 1.25,
          color: NAVY,
          letterSpacing: "-0.01em",
        }}
      >
        {quote}
      </div>

      {/* Patient block */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 80,
          right: 80,
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 132,
            overflow: "hidden",
            border: `4px solid ${TEAL}`,
            backgroundColor: "white",
            flexShrink: 0,
            boxShadow: "0 12px 32px rgba(12,31,63,0.18)",
          }}
        >
          <Img
            src={patientPhotoUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div style={{ flex: 1, fontFamily: "Inter, system-ui, sans-serif" }}>
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 8,
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} filled={i <= rating} />
            ))}
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: NAVY,
              letterSpacing: "-0.01em",
            }}
          >
            {patientName}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 26,
              fontWeight: 500,
              color: NAVY,
              opacity: 0.6,
            }}
          >
            Patient at {clinicName}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
