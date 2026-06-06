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
import {
  DentalBeforeAfter,
  dentalBeforeAfterSchema,
} from "./templates/dental/before-after-reel/Composition";
import {
  DentalOfferCard,
  dentalOfferCardSchema,
} from "./templates/dental/offer-card/Composition";
import {
  DentalServiceExplainer,
  dentalServiceExplainerSchema,
} from "./templates/dental/service-explainer/Composition";
import {
  DentalTestimonial,
  dentalTestimonialSchema,
} from "./templates/dental/testimonial-card/Composition";

// Sample assets used for previews / studio default props. Real renders use
// the URLs the user uploaded via /api/render.
const SAMPLE_CLIP =
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4";
const SAMPLE_DENTAL_PHOTO =
  "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1080";
const SAMPLE_PATIENT_PHOTO =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400";

export function RemotionRoot() {
  return (
    <>
      {/* ---------- Generic video templates ---------- */}
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

      {/* ---------- Dental templates ---------- */}

      <Composition
        id="dental-before-after-reel"
        component={DentalBeforeAfter}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
        schema={dentalBeforeAfterSchema}
        defaultProps={{
          beforeUrl: SAMPLE_CLIP,
          afterUrl: SAMPLE_CLIP,
          treatment: "Smile Makeover",
          clinicName: "Bright Smile Dental",
        }}
      />

      <Composition
        id="dental-offer-card"
        component={DentalOfferCard}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
        schema={dentalOfferCardSchema}
        defaultProps={{
          imageUrl: SAMPLE_DENTAL_PHOTO,
          offerLine: "20% OFF",
          offerSubject: "Teeth Cleaning",
          ctaLine: "Book today",
          clinicName: "Bright Smile Dental",
          phone: "+1 555-123-4567",
        }}
      />

      <Composition
        id="dental-service-explainer"
        component={DentalServiceExplainer}
        durationInFrames={330}
        fps={30}
        width={1080}
        height={1920}
        schema={dentalServiceExplainerSchema}
        defaultProps={{
          clipUrl: SAMPLE_CLIP,
          hookLine: "Why Invisalign?",
          point1: "Almost invisible",
          point2: "Removable for meals",
          point3: "Faster than braces",
          clinicName: "Bright Smile Dental",
        }}
      />

      <Composition
        id="dental-testimonial-card"
        component={DentalTestimonial}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1080}
        schema={dentalTestimonialSchema}
        defaultProps={{
          patientPhotoUrl: SAMPLE_PATIENT_PHOTO,
          patientName: "Sarah Mitchell",
          quote: "Best dental experience I've ever had. Painless, quick, and the team was incredibly kind throughout.",
          rating: 5,
          clinicName: "Bright Smile Dental",
        }}
      />
    </>
  );
}
