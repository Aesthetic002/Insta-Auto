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

export const dentalBeforeAfterSchema = z.object({
  beforeUrl: z.string(),
  afterUrl: z.string(),
  treatment: z.string(),
  clinicName: z.string(),
});

export type DentalBeforeAfterProps = z.infer<typeof dentalBeforeAfterSchema>;

const BEFORE_FRAMES = 90;
const SWIPE_FRAMES = 12;
const AFTER_FRAMES = 108;

const NAVY = "#0c1f3f";
const TEAL = "#15b8a6";

function Tag({ text, color }: { text: string; color: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const translateY = interpolate(enter, [0, 1], [-30, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: 120,
        left: 60,
        transform: `translateY(${translateY}px)`,
        opacity: enter,
        backgroundColor: color,
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 800,
        fontSize: 56,
        letterSpacing: "0.06em",
        padding: "12px 32px",
        borderRadius: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
      }}
    >
      {text}
    </div>
  );
}

function Footer({ clinicName, treatment }: { clinicName: string; treatment: string }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        right: 0,
        textAlign: "center",
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 36,
          letterSpacing: "0.02em",
          textShadow: "0 4px 16px rgba(0,0,0,0.7)",
        }}
      >
        {treatment}
      </div>
      <div
        style={{
          marginTop: 8,
          fontWeight: 500,
          fontSize: 26,
          opacity: 0.9,
          textShadow: "0 4px 12px rgba(0,0,0,0.7)",
        }}
      >
        {clinicName}
      </div>
    </div>
  );
}

function ClipPanel({
  src,
  tag,
  color,
  treatment,
  clinicName,
}: {
  src: string;
  tag: string;
  color: string;
  treatment: string;
  clinicName: string;
}) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo
        src={src}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.7) 100%)",
        }}
      />
      <Tag text={tag} color={color} />
      <Footer treatment={treatment} clinicName={clinicName} />
    </AbsoluteFill>
  );
}

function Swipe() {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, SWIPE_FRAMES], [-1200, 1200]);
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${x}px) skewX(-10deg)`,
        backgroundColor: "white",
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
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Sequence from={0} durationInFrames={BEFORE_FRAMES + SWIPE_FRAMES}>
        <ClipPanel
          src={beforeUrl}
          tag="BEFORE"
          color={NAVY}
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
          color={TEAL}
          treatment={treatment}
          clinicName={clinicName}
        />
      </Sequence>
    </AbsoluteFill>
  );
}
