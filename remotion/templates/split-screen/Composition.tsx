import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

export const splitScreenSchema = z.object({
  topUrl: z.string(),
  bottomUrl: z.string(),
  headline: z.string(),
});

export type SplitScreenProps = z.infer<typeof splitScreenSchema>;

function Panel({
  src,
  from,
  height,
  top,
}: {
  src: string;
  from: "top" | "bottom";
  height: number;
  top: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 110, mass: 0.7 },
  });
  const offset = from === "top" ? -height : height;
  const translateY = interpolate(enter, [0, 1], [offset, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        width: "100%",
        height,
        overflow: "hidden",
        transform: `translateY(${translateY}px)`,
      }}
    >
      <OffthreadVideo
        src={src}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

export function SplitScreen({ topUrl, bottomUrl, headline }: SplitScreenProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Total composition is 1080×1920. Each panel 950px, leaving 20px gap.
  const PANEL_HEIGHT = 950;

  const textEnter = spring({
    frame: frame - 24,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Panel src={topUrl} from="top" height={PANEL_HEIGHT} top={0} />
      <Panel
        src={bottomUrl}
        from="bottom"
        height={PANEL_HEIGHT}
        top={1920 - PANEL_HEIGHT}
      />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            transform: `scale(${interpolate(textEnter, [0, 1], [0.7, 1])})`,
            opacity: textEnter,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 900,
            fontSize: 80,
            color: "white",
            textAlign: "center",
            padding: "16px 36px",
            backgroundColor: "#111",
            border: "4px solid white",
            borderRadius: 18,
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            maxWidth: 880,
          }}
        >
          {headline}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
