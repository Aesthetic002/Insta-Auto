export const beatDrop3ClipMeta = {
  id: "beat-drop-3clip",
  name: "Beat Drop · 3 Clips",
  category: "reels",
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 180,
  slots: [
    { id: "clip1", type: "video" as const, maxSeconds: 2 },
    { id: "clip2", type: "video" as const, maxSeconds: 2 },
    { id: "clip3", type: "video" as const, maxSeconds: 2 },
  ],
  textInputs: [{ id: "headline", label: "Headline", maxChars: 60 }],
};
