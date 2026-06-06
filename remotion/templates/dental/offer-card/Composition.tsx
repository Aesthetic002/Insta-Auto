import { AbsoluteFill, Img } from "remotion";
import { z } from "zod";

export const dentalOfferCardSchema = z.object({
  imageUrl: z.string(),
  offerLine: z.string(),       // e.g. "20% OFF"
  offerSubject: z.string(),    // e.g. "Teeth Cleaning"
  ctaLine: z.string(),         // e.g. "Book today"
  clinicName: z.string(),
  phone: z.string().optional(),
});

export type DentalOfferCardProps = z.infer<typeof dentalOfferCardSchema>;

const NAVY = "#0c1f3f";
const TEAL = "#15b8a6";
const CREAM = "#fef9f3";

export function DentalOfferCard({
  imageUrl,
  offerLine,
  offerSubject,
  ctaLine,
  clinicName,
  phone,
}: DentalOfferCardProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
      {/* Photo takes top 55% */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 740,
          overflow: "hidden",
        }}
      >
        <Img
          src={imageUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Bottom soft fade so text sits cleanly on cream */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, rgba(0,0,0,0) 70%, ${CREAM} 100%)`,
          }}
        />
      </div>

      {/* Teal accent stripe */}
      <div
        style={{
          position: "absolute",
          top: 740,
          left: 80,
          right: 80,
          height: 6,
          backgroundColor: TEAL,
          borderRadius: 3,
        }}
      />

      {/* Offer text block */}
      <div
        style={{
          position: "absolute",
          top: 800,
          left: 80,
          right: 80,
          fontFamily: "Inter, system-ui, sans-serif",
          color: NAVY,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: TEAL,
          }}
        >
          Limited time
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 144,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.03em",
          }}
        >
          {offerLine}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          {offerSubject}
        </div>
      </div>

      {/* CTA + clinic footer */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 80,
          right: 80,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          fontFamily: "Inter, system-ui, sans-serif",
          color: NAVY,
        }}
      >
        <div>
          <div
            style={{
              backgroundColor: NAVY,
              color: "white",
              padding: "20px 36px",
              borderRadius: 999,
              fontSize: 36,
              fontWeight: 700,
              boxShadow: "0 12px 32px rgba(12,31,63,0.25)",
            }}
          >
            {ctaLine}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{clinicName}</div>
          {phone && (
            <div
              style={{ marginTop: 4, fontSize: 24, opacity: 0.7, fontWeight: 500 }}
            >
              {phone}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
}
