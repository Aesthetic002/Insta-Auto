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

export const beatDrop3ClipSchema = z.object({
  clip1Url: z.string(),
  clip2Url: z.string(),
  clip3Url: z.string(),
  headline: z.string(),
});

export type BeatDrop3ClipProps = z.infer<typeof beatDrop3ClipSchema>;

const SLOT_FRAMES = 60;

function Slot({ src, isLast = false }: { src: string; isLast?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.6 },
    from: 1.15,
    to: 1,
  });

  const flashOpacity = interpolate(frame, [0, 4], [1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <OffthreadVideo
          src={src}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      {!isLast ? null : null}
      <AbsoluteFill
        style={{
          backgroundColor: "white",
          opacity: flashOpacity,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}

function Headline({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.5 },
  });
  const translateY = interpolate(enter, [0, 1], [60, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 180,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          opacity: enter,
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 900,
          fontSize: 96,
          lineHeight: 1.05,
          color: "white",
          textAlign: "center",
          padding: "24px 40px",
          backgroundColor: "rgba(0,0,0,0.55)",
          borderRadius: 24,
          maxWidth: 900,
          textShadow: "0 6px 24px rgba(0,0,0,0.5)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}

export function BeatDrop3Clip({
  clip1Url,
  clip2Url,
  clip3Url,
  headline,
}: BeatDrop3ClipProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Sequence from={0} durationInFrames={SLOT_FRAMES}>
        <Slot src={clip1Url} />
      </Sequence>
      <Sequence from={SLOT_FRAMES} durationInFrames={SLOT_FRAMES}>
        <Slot src={clip2Url} />
      </Sequence>
      <Sequence from={SLOT_FRAMES * 2} durationInFrames={SLOT_FRAMES}>
        <Slot src={clip3Url} isLast />
      </Sequence>
      <Sequence from={SLOT_FRAMES * 2}>
        <Headline text={headline} />
      </Sequence>
    </AbsoluteFill>
  );
}
