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

export const dentalServiceExplainerSchema = z.object({
  clipUrl: z.string(),
  hookLine: z.string(),     // big top headline, ~3 words, e.g. "Why Invisalign?"
  point1: z.string(),       // benefit bullet, e.g. "Almost invisible"
  point2: z.string(),       // benefit bullet
  point3: z.string(),       // benefit bullet
  clinicName: z.string(),
});

export type DentalServiceExplainerProps = z.infer<
  typeof dentalServiceExplainerSchema
>;

const NAVY = "#0c1f3f";
const TEAL = "#15b8a6";

const HOOK_FRAMES = 60;
const BULLET_FRAMES = 90;

function Hook({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const translateY = interpolate(enter, [0, 1], [50, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
        textAlign: "center",
        backgroundColor: NAVY,
      }}
    >
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          opacity: enter,
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 900,
          fontSize: 144,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
        }}
      >
        {text}
      </div>
      <div
        style={{
          marginTop: 24,
          width: 120,
          height: 6,
          backgroundColor: TEAL,
          borderRadius: 3,
          opacity: enter,
        }}
      />
    </AbsoluteFill>
  );
}

function BulletPoint({
  number,
  text,
  delay,
}: {
  number: number;
  text: string;
  delay: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 110 },
  });
  const translateX = interpolate(enter, [0, 1], [-60, 0]);

  return (
    <div
      style={{
        transform: `translateX(${translateX}px)`,
        opacity: enter,
        display: "flex",
        alignItems: "center",
        gap: 24,
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: "20px 28px",
        borderRadius: 16,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          backgroundColor: TEAL,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 900,
          fontSize: 36,
        }}
      >
        {number}
      </div>
      <div
        style={{
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 40,
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
          filter: "brightness(0.7)",
        }}
      />
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          padding: 60,
          gap: 20,
        }}
      >
        <BulletPoint number={1} text={point1} delay={0} />
        <BulletPoint number={2} text={point2} delay={15} />
        <BulletPoint number={3} text={point3} delay={30} />
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: "0.02em",
          textShadow: "0 4px 16px rgba(0,0,0,0.7)",
        }}
      >
        {clinicName}
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
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Sequence from={0} durationInFrames={HOOK_FRAMES}>
        <Hook text={hookLine} />
      </Sequence>
      <Sequence
        from={HOOK_FRAMES}
        durationInFrames={BULLET_FRAMES * 3}
      >
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
