import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

export const slowZoomSchema = z.object({
  clipUrl: z.string(),
  headline: z.string(),
  subtitle: z.string(),
});

export type SlowZoomProps = z.infer<typeof slowZoomSchema>;

export function SlowZoom({ clipUrl, headline, subtitle }: SlowZoomProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Ken Burns: scale from 1 → 1.18 over the whole duration, slow pan up.
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.18]);
  const translateY = interpolate(frame, [0, durationInFrames], [0, -40]);

  const textEnter = spring({
    frame: frame - 18,
    fps,
    config: { damping: 14, stiffness: 90, mass: 0.6 },
  });
  const textY = interpolate(textEnter, [0, 1], [40, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translateY(${translateY}px)`,
          transformOrigin: "center",
        }}
      >
        <OffthreadVideo
          src={clipUrl}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 55%)",
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 220,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            transform: `translateY(${textY}px)`,
            opacity: textEnter,
            textAlign: "center",
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            padding: "0 60px",
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 104,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              textShadow: "0 6px 24px rgba(0,0,0,0.6)",
            }}
          >
            {headline}
          </div>
          <div
            style={{
              marginTop: 20,
              fontWeight: 500,
              fontSize: 40,
              opacity: 0.85,
              textShadow: "0 4px 14px rgba(0,0,0,0.6)",
            }}
          >
            {subtitle}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
