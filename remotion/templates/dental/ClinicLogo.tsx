import { Img } from "remotion";

// Shared brand mark for dental templates: an icon (the clinic's uploaded logo
// when present, otherwise a tooth glyph) next to the clinic name. Both the
// icon AND the name always show — an uploaded logo replaces only the tooth
// glyph, never the clinic name text.
//
// `color` controls the tooth glyph + text color so each template can match
// its palette (white on blue/teal, navy on cream, etc.).
//
// Set `showText={false}` for tight spots where only the icon should appear.

export function ClinicLogo({
  logoUrl,
  clinicName,
  color = "white",
  size = 56,
  showText = true,
}: {
  logoUrl?: string | null;
  clinicName: string;
  color?: string;
  size?: number;
  showText?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, color }}>
      {logoUrl ? (
        <div
          style={{
            height: size,
            width: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Img
            src={logoUrl}
            style={{
              maxHeight: size,
              maxWidth: size,
              width: "auto",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>
      ) : (
        <ToothMark size={size} color={color} />
      )}

      {showText && (
        <div style={{ lineHeight: 1.05 }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: size * 0.55,
              letterSpacing: "0.06em",
            }}
          >
            {clinicName.toUpperCase().split(" ")[0]}
          </div>
          <div
            style={{
              fontWeight: 600,
              fontSize: size * 0.34,
              letterSpacing: "0.2em",
              opacity: 0.9,
            }}
          >
            {clinicName.toUpperCase().split(" ").slice(1).join(" ") || "CLINIC"}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToothMark({
  size = 56,
  color = "white",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M28 14C20 14 14 22 14 32c0 8 4 14 6 22 1 6 0 14 2 22 2 6 6 10 10 10 4 0 6-4 8-12 1-6 2-10 6-10s5 4 6 10c2 8 4 12 8 12 4 0 8-4 10-10 2-8 1-16 2-22 2-8 6-14 6-22 0-10-6-18-14-18-6 0-10 4-18 4S34 14 28 14z"
        fill={color}
      />
    </svg>
  );
}
