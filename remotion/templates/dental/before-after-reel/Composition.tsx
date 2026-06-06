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

export const dentalBeforeAfterSchema = z.object({
  beforeUrl: z.string(),
  afterUrl: z.string(),
  treatment: z.string(),
  clinicName: z.string(),
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

function ToothMark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M28 14C20 14 14 22 14 32c0 8 4 14 6 22 1 6 0 14 2 22 2 6 6 10 10 10 4 0 6-4 8-12 1-6 2-10 6-10s5 4 6 10c2 8 4 12 8 12 4 0 8-4 10-10 2-8 1-16 2-22 2-8 6-14 6-22 0-10-6-18-14-18-6 0-10 4-18 4S34 14 28 14z"
        fill="white"
      />
    </svg>
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
}: {
  clinicName: string;
  treatment: string;
}) {
  return (
    <>
      {/* Clinic logo bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 80,
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "white",
          fontFamily: INTER,
        }}
      >
        <ToothMark size={44} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 900, fontSize: 26, letterSpacing: "0.06em" }}>
            {clinicName.toUpperCase()}
          </div>
        </div>
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
}: {
  src: string;
  tag: string;
  tagColor: string;
  tagTextColor: string;
  treatment: string;
  clinicName: string;
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
      <Footer treatment={treatment} clinicName={clinicName} />
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
        />
      </Sequence>
    </AbsoluteFill>
  );
}
