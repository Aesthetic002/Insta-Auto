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

export const beforeAfterSchema = z.object({
  beforeUrl: z.string(),
  afterUrl: z.string(),
});

export type BeforeAfterProps = z.infer<typeof beforeAfterSchema>;

const BEFORE_FRAMES = 75;
const SWIPE_FRAMES = 15;
const AFTER_FRAMES = 90;

function Tag({ text, color }: { text: string; color: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 12, stiffness: 110 } });
  const scale = interpolate(enter, [0, 1], [0.6, 1]);

  return (
    <div
      style={{
        position: "absolute",
        top: 140,
        left: 60,
        transform: `scale(${scale})`,
        opacity: enter,
        transformOrigin: "left center",
        backgroundColor: color,
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 900,
        fontSize: 64,
        letterSpacing: "0.08em",
        padding: "14px 36px",
        borderRadius: 16,
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
      }}
    >
      {text}
    </div>
  );
}

function ClipBox({ src, tag, tagColor }: { src: string; tag: string; tagColor: string }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo
        src={src}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <Tag text={tag} color={tagColor} />
    </AbsoluteFill>
  );
}

function Swipe() {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, SWIPE_FRAMES], [-1200, 1200]);
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${x}px) skewX(-12deg)`,
        backgroundColor: "white",
        pointerEvents: "none",
      }}
    />
  );
}

export function BeforeAfter({ beforeUrl, afterUrl }: BeforeAfterProps) {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Sequence from={0} durationInFrames={BEFORE_FRAMES + SWIPE_FRAMES}>
        <ClipBox src={beforeUrl} tag="BEFORE" tagColor="#ef4444" />
      </Sequence>
      <Sequence from={BEFORE_FRAMES} durationInFrames={SWIPE_FRAMES}>
        <Swipe />
      </Sequence>
      <Sequence
        from={BEFORE_FRAMES + SWIPE_FRAMES}
        durationInFrames={AFTER_FRAMES}
      >
        <ClipBox src={afterUrl} tag="AFTER" tagColor="#10b981" />
      </Sequence>
    </AbsoluteFill>
  );
}
