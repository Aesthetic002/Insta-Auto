import { Img } from "remotion";

// Shared brand mark for dental templates. Renders the clinic's uploaded logo
// (fit inside a fixed box, aspect ratio preserved) when `logoUrl` is provided;
// otherwise falls back to a clean tooth glyph + the clinic name as text.
//
// `color` controls the tooth glyph + text color so each template can match
// its palette (white on blue/teal, navy on cream, etc.).

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
  if (logoUrl) {
    // Logo provided: render it fit-in-box, no text (most uploaded logos
    // already include the clinic name as a wordmark).
    return (
      <div
        style={{
          height: size + 24,
          maxWidth: 360,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Img
          src={logoUrl}
          style={{
            height: "100%",
            width: "auto",
            maxWidth: 360,
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  // Fallback: tooth glyph + clinic name text.
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, color }}>
      <ToothMark size={size} color={color} />
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
            CLINIC
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
