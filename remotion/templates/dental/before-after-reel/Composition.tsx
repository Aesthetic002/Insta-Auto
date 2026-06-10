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
import { ClinicLogo } from "../ClinicLogo";

export const dentalBeforeAfterSchema = z.object({
  beforeUrl: z.string(),
  afterUrl: z.string(),
  treatment: z.string(),
  clinicName: z.string(),
  logoUrl: z.string().optional(),
});

export type DentalBeforeAfterProps = z.infer<typeof dentalBeforeAfterSchema>;

const NAVY = "#0a3a7a";
const NAVY_DEEP = "#082a5a";
const POWDER = "#b8d4f5";
const TEAL = "#15b8a6";

const BEFORE_FRAMES = 90;
const SWIPE_FRAMES = 12;
const AFTER_FRAMES = 108;

function PlusPattern() {
  const items: { x: number; y: number; size: number }[] = [
    { x: 60, y: 760, size: 100 },
    { x: 880, y: 320, size: 90 },
    { x: 760, y: 1500, size: 120 },
    { x: 220, y: 1640, size: 80 },
    { x: 920, y: 1100, size: 70 },
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
            opacity: 0.14,
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


function Tag({
  text,
  color,
  textColor,
}: {
  text: string;
  color: string;
  textColor: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const translateY = interpolate(enter, [0, 1], [-30, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: 100,
        right: 60,
        transform: `translateY(${translateY}px)`,
        opacity: enter,
        backgroundColor: color,
        color: textColor,
        fontFamily: INTER,
        fontWeight: 900,
        fontSize: 64,
        letterSpacing: "0.16em",
        padding: "16px 36px",
        borderRadius: 999,
        boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
      }}
    >
      {text}
    </div>
  );
}

function Footer({
  clinicName,
  treatment,
  logoUrl,
}: {
  clinicName: string;
  treatment: string;
  logoUrl?: string;
}) {
  return (
    <>
      {/* Clinic logo bottom-left */}
      <div style={{ position: "absolute", bottom: 80, left: 80 }}>
        <ClinicLogo
          logoUrl={logoUrl}
          clinicName={clinicName}
          color="white"
          size={44}
          showText
        />
      </div>

      {/* Treatment bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 80,
          color: "white",
          fontFamily: INTER,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: "0.04em",
          textShadow: "0 4px 12px rgba(0,0,0,0.6)",
        }}
      >
        {treatment}
      </div>
    </>
  );
}

function ClipPanel({
  src,
  tag,
  tagColor,
  tagTextColor,
  treatment,
  clinicName,
  logoUrl,
}: {
  src: string;
  tag: string;
  tagColor: string;
  tagTextColor: string;
  treatment: string;
  clinicName: string;
  logoUrl?: string;
}) {
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY_DEEP }}>
      {/* Background blue */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
        }}
      />
      <PlusPattern />

      {/* Video clip in a rounded portrait container, vertically centered */}
      <div
        style={{
          position: "absolute",
          top: 260,
          left: 80,
          right: 80,
          height: 1320,
          borderRadius: 36,
          overflow: "hidden",
          border: `6px solid ${POWDER}`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          backgroundColor: "black",
        }}
      >
        <OffthreadVideo
          src={src}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <Tag text={tag} color={tagColor} textColor={tagTextColor} />
      <Footer treatment={treatment} clinicName={clinicName} logoUrl={logoUrl} />
    </AbsoluteFill>
  );
}

function Swipe() {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, SWIPE_FRAMES], [-1300, 1300]);
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${x}px) skewX(-10deg)`,
        backgroundColor: POWDER,
        pointerEvents: "none",
      }}
    />
  );
}

export function DentalBeforeAfter({
  beforeUrl,
  afterUrl,
  treatment,
  clinicName,
  logoUrl,
}: DentalBeforeAfterProps) {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={BEFORE_FRAMES + SWIPE_FRAMES}>
        <ClipPanel
          src={beforeUrl}
          tag="BEFORE"
          tagColor={POWDER}
          tagTextColor={NAVY_DEEP}
          treatment={treatment}
          clinicName={clinicName}
          logoUrl={logoUrl}
        />
      </Sequence>
      <Sequence from={BEFORE_FRAMES} durationInFrames={SWIPE_FRAMES}>
        <Swipe />
      </Sequence>
      <Sequence
        from={BEFORE_FRAMES + SWIPE_FRAMES}
        durationInFrames={AFTER_FRAMES}
      >
        <ClipPanel
          src={afterUrl}
          tag="AFTER"
          tagColor={TEAL}
          tagTextColor="white"
          treatment={treatment}
          clinicName={clinicName}
          logoUrl={logoUrl}
        />
      </Sequence>
    </AbsoluteFill>
  );
}
