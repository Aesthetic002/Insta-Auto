import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { INTER } from "../../../fonts";

export const dentalServiceExplainerSchema = z.object({
  clipUrl: z.string(),
  hookLine: z.string(),
  point1: z.string(),
  point2: z.string(),
  point3: z.string(),
  clinicName: z.string(),
});

export type DentalServiceExplainerProps = z.infer<
  typeof dentalServiceExplainerSchema
>;

const TEAL = "#3fb8b0";
const TEAL_DEEP = "#1f7d7a";
const CREAM = "#f7faf9";

const HOOK_FRAMES = 60;
const BULLET_FRAMES = 90;

function ToothMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M28 14C20 14 14 22 14 32c0 8 4 14 6 22 1 6 0 14 2 22 2 6 6 10 10 10 4 0 6-4 8-12 1-6 2-10 6-10s5 4 6 10c2 8 4 12 8 12 4 0 8-4 10-10 2-8 1-16 2-22 2-8 6-14 6-22 0-10-6-18-14-18-6 0-10 4-18 4S34 14 28 14z"
        fill="white"
      />
    </svg>
  );
}

function HalftoneDots() {
  // Decorative halftone pattern in bottom-right corner.
  const dots: { x: number; y: number; r: number; opacity: number }[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      dots.push({
        x: col * 28,
        y: row * 28,
        r: 5 + (col / 8) * 4,
        opacity: 0.18 + (col / 8) * 0.25,
      });
    }
  }
  return (
    <svg
      width="240"
      height="240"
      viewBox="0 0 220 220"
      style={{ pointerEvents: "none" }}
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="white" opacity={d.opacity} />
      ))}
    </svg>
  );
}

function Hook({ text, clinicName }: { text: string; clinicName: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const translateY = interpolate(enter, [0, 1], [50, 0]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(165deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        textAlign: "center",
        fontFamily: INTER,
      }}
    >
      {/* Clinic logo top-left */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 80,
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "white",
        }}
      >
        <ToothMark size={48} />
        <div style={{ lineHeight: 1.05 }}>
          <div style={{ fontWeight: 900, fontSize: 30, letterSpacing: "0.06em" }}>
            {clinicName.toUpperCase().split(" ")[0]}
          </div>
          <div
            style={{
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: "0.2em",
              opacity: 0.85,
            }}
          >
            CLINIC
          </div>
        </div>
      </div>

      {/* Halftone in corner */}
      <div style={{ position: "absolute", right: 60, bottom: 60 }}>
        <HalftoneDots />
      </div>

      <div
        style={{
          transform: `translateY(${translateY}px)`,
          opacity: enter,
          color: "white",
          fontWeight: 900,
          fontSize: 160,
          lineHeight: 1.0,
          letterSpacing: "-0.03em",
          maxWidth: 940,
        }}
      >
        {text}
      </div>
      <div
        style={{
          marginTop: 28,
          width: 140,
          height: 6,
          backgroundColor: "white",
          borderRadius: 3,
          opacity: enter,
        }}
      />
    </AbsoluteFill>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 56,
        backgroundColor: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4 4 10-10"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function BulletPoint({ text, delay }: { text: string; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 110 },
  });
  const translateX = interpolate(enter, [0, 1], [-80, 0]);

  return (
    <div
      style={{
        transform: `translateX(${translateX}px)`,
        opacity: enter,
        display: "flex",
        alignItems: "center",
        gap: 24,
        backgroundColor: "rgba(255,255,255,0.96)",
        padding: "22px 32px",
        borderRadius: 999,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
    >
      <CheckIcon color={TEAL} />
      <div
        style={{
          color: TEAL_DEEP,
          fontFamily: INTER,
          fontWeight: 700,
          fontSize: 44,
          letterSpacing: "-0.01em",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function ClipWithBullets({
  src,
  point1,
  point2,
  point3,
  clinicName,
}: {
  src: string;
  point1: string;
  point2: string;
  point3: string;
  clinicName: string;
}) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo
        src={src}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.6) saturate(1.05)",
        }}
      />
      {/* Teal wash overlay so text contrast holds */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(165deg, ${TEAL}33 0%, ${TEAL_DEEP}55 100%)`,
        }}
      />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          gap: 28,
        }}
      >
        <BulletPoint text={point1} delay={0} />
        <BulletPoint text={point2} delay={15} />
        <BulletPoint text={point3} delay={30} />
      </AbsoluteFill>

      {/* Clinic mark bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
          color: "white",
          fontFamily: INTER,
        }}
      >
        <ToothMark size={36} />
        <div
          style={{
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: "0.06em",
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          {clinicName.toUpperCase()}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function DentalServiceExplainer({
  clipUrl,
  hookLine,
  point1,
  point2,
  point3,
  clinicName,
}: DentalServiceExplainerProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM }}>
      <Sequence from={0} durationInFrames={HOOK_FRAMES}>
        <Hook text={hookLine} clinicName={clinicName} />
      </Sequence>
      <Sequence from={HOOK_FRAMES} durationInFrames={BULLET_FRAMES * 3}>
        <ClipWithBullets
          src={clipUrl}
          point1={point1}
          point2={point2}
          point3={point3}
          clinicName={clinicName}
        />
      </Sequence>
    </AbsoluteFill>
  );
}
