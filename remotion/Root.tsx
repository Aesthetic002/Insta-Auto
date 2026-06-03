import { Composition } from "remotion";
import {
  BeatDrop3Clip,
  beatDrop3ClipSchema,
} from "./templates/beat-drop-3clip/Composition";
import {
  SlowZoom,
  slowZoomSchema,
} from "./templates/slow-zoom/Composition";
import {
  BeforeAfter,
  beforeAfterSchema,
} from "./templates/before-after/Composition";
import {
  Countdown,
  countdownSchema,
} from "./templates/countdown/Composition";
import {
  SplitScreen,
  splitScreenSchema,
} from "./templates/split-screen/Composition";

// Sample clips used for previews / studio default props. Real renders use
// the URLs the user uploaded via /api/render.
const SAMPLE_CLIP =
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="beat-drop-3clip"
        component={BeatDrop3Clip}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        schema={beatDrop3ClipSchema}
        defaultProps={{
          clip1Url: SAMPLE_CLIP,
          clip2Url: SAMPLE_CLIP,
          clip3Url: SAMPLE_CLIP,
          headline: "Make it pop",
        }}
      />

      <Composition
        id="slow-zoom"
        component={SlowZoom}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        schema={slowZoomSchema}
        defaultProps={{
          clipUrl: SAMPLE_CLIP,
          headline: "Sit with it",
          subtitle: "A slower kind of scroll",
        }}
      />

      <Composition
        id="before-after"
        component={BeforeAfter}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        schema={beforeAfterSchema}
        defaultProps={{
          beforeUrl: SAMPLE_CLIP,
          afterUrl: SAMPLE_CLIP,
        }}
      />

      <Composition
        id="countdown"
        component={Countdown}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
        schema={countdownSchema}
        defaultProps={{
          clip1Url: SAMPLE_CLIP,
          clip2Url: SAMPLE_CLIP,
          clip3Url: SAMPLE_CLIP,
          headline: "Go",
        }}
      />

      <Composition
        id="split-screen"
        component={SplitScreen}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        schema={splitScreenSchema}
        defaultProps={{
          topUrl: SAMPLE_CLIP,
          bottomUrl: SAMPLE_CLIP,
          headline: "VS",
        }}
      />
    </>
  );
}
