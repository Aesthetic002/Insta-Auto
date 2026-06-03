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

export const countdownSchema = z.object({
  clip1Url: z.string(),
  clip2Url: z.string(),
  clip3Url: z.string(),
  headline: z.string(),
});

export type CountdownProps = z.infer<typeof countdownSchema>;

const SLOT_FRAMES = 60;

function NumberOverlay({ n }: { n: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 8, stiffness: 200, mass: 0.5 } });
  const scale = interpolate(enter, [0, 1], [0.2, 1]);

  // Fade out near end of the slot.
  const exitOpacity = interpolate(
    frame,
    [SLOT_FRAMES - 10, SLOT_FRAMES],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity: exitOpacity,
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 900,
          fontSize: 520,
          lineHeight: 1,
          color: "white",
          WebkitTextStroke: "8px black",
          textShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {n}
      </div>
    </AbsoluteFill>
  );
}

function Slot({ src, number }: { src: string; number: number }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <OffthreadVideo
        src={src}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.85)" }}
      />
      <NumberOverlay n={number} />
    </AbsoluteFill>
  );
}

function FinalHeadline({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const translateY = interpolate(enter, [0, 1], [60, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          opacity: enter,
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 900,
          fontSize: 112,
          color: "white",
          textAlign: "center",
          padding: "24px 48px",
          backgroundColor: "rgba(0,0,0,0.6)",
          borderRadius: 28,
          maxWidth: 900,
          textShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}

export function Countdown({ clip1Url, clip2Url, clip3Url, headline }: CountdownProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Sequence from={0} durationInFrames={SLOT_FRAMES}>
        <Slot src={clip1Url} number={3} />
      </Sequence>
      <Sequence from={SLOT_FRAMES} durationInFrames={SLOT_FRAMES}>
        <Slot src={clip2Url} number={2} />
      </Sequence>
      <Sequence from={SLOT_FRAMES * 2} durationInFrames={SLOT_FRAMES}>
        <Slot src={clip3Url} number={1} />
      </Sequence>
      <Sequence from={SLOT_FRAMES * 2 + 30}>
        <FinalHeadline text={headline} />
      </Sequence>
    </AbsoluteFill>
  );
}
