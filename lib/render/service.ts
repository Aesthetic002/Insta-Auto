// In-process render pipeline.
//
// 1. POST /api/render inserts a RenderJob (status=QUEUED) and calls
//    `startRender(jobId)` without awaiting — the response returns instantly
//    so the browser can poll for status.
// 2. startRender bundles the Remotion entry (cached after first call),
//    renders the chosen composition with the user's props to a tmp mp4,
//    uploads to Cloudinary, then marks the job DONE with the secure URL.
//
// This runs inside the Next.js server process — fine for low volume during
// initial testing. Each render holds the event loop in chunks (Chromium runs
// in a separate process so the main thread isn't fully blocked, but a long
// queue will still tie up server memory). Swap this out for a worker / Lambda
// before opening to real traffic.

import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  selectComposition,
  type RenderMediaOnProgress,
} from "@remotion/renderer";

import { db } from "@/lib/db";
import { getTemplate } from "@/lib/templates";
import { uploadLocalVideo } from "@/lib/cloudinary/upload";

// Bundle once per server process. Subsequent renders reuse the same bundle URL.
let bundlePromise: Promise<string> | null = null;

function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.resolve(process.cwd(), "remotion/index.ts"),
      // Use the default webpack override; Remotion handles TSX/JSX.
    });
  }
  return bundlePromise;
}

export async function startRender(jobId: string): Promise<void> {
  // Detached: caller fires and forgets. We swallow errors into the DB row.
  void runRender(jobId).catch(async (err) => {
    console.error(`[render ${jobId}] failed`, err);
    await db.renderJob
      .update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : String(err),
          completedAt: new Date(),
        },
      })
      .catch(() => {});
  });
}

async function runRender(jobId: string): Promise<void> {
  const job = await db.renderJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`RenderJob ${jobId} not found`);

  const template = getTemplate(job.templateId);
  if (!template) throw new Error(`Unknown template ${job.templateId}`);

  await db.renderJob.update({
    where: { id: jobId },
    data: { status: "RENDERING", startedAt: new Date() },
  });

  // On Windows/local: writes to <cwd>/out/renders. On the DO container: writes
  // to /tmp/renders (set via REMOTION_OUTPUT_DIR in the Dockerfile).
  const outDir =
    process.env.REMOTION_OUTPUT_DIR ??
    path.resolve(process.cwd(), "out", "renders");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${jobId}.mp4`);

  const serveUrl = await getBundle();

  const composition = await selectComposition({
    serveUrl,
    id: template.id,
    inputProps: job.inputs as Record<string, unknown>,
  });

  const onProgress: RenderMediaOnProgress = ({ progress }) => {
    if (process.env.NODE_ENV !== "production") {
      process.stdout.write(`\r[render ${jobId}] ${Math.round(progress * 100)}%`);
    }
  };

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps: job.inputs as Record<string, unknown>,
    onProgress,
    // Memory-cap the render so it fits in DO's 1GB container. Defaults run
    // multiple Chromium workers in parallel + a large frame cache; that OOMs
    // the compositor and panics with `Option::unwrap() on None`.
    concurrency: 1,
    // Cap the offthread video frame cache hard. The Rust compositor crashes
    // (frame_cache.rs unwrap on None) when this cache grows past container
    // memory. 200MB is plenty for a 6-second 1080×1920 render.
    offthreadVideoCacheSizeInBytes: 200 * 1024 * 1024,
    // Force software rendering (swiftshader) instead of hardware GPU — DO
    // App Platform containers don't expose a GPU and trying to use one
    // causes other Chromium crashes.
    chromiumOptions: { gl: "swiftshader" },
  });

  await db.renderJob.update({
    where: { id: jobId },
    data: { status: "UPLOADING" },
  });

  const publicId = `r_${job.userId}/${randomUUID()}`;
  const uploaded = await uploadLocalVideo({
    filePath: outPath,
    publicId,
    folder: "renders",
  });

  // Build a Cloudinary thumbnail URL the same way the rest of the app does.
  const thumbnailUrl = uploaded.secureUrl
    .replace("/video/upload/", "/video/upload/so_0,w_400,h_400,c_fill/")
    .replace(/\.[^.]+$/, ".jpg");

  await db.renderJob.update({
    where: { id: jobId },
    data: {
      status: "DONE",
      outputUrl: uploaded.secureUrl,
      thumbnailUrl,
      completedAt: new Date(),
    },
  });

  // Best-effort: delete the local mp4. Don't fail the job if it's locked.
  await rm(outPath, { force: true }).catch(() => {});
}
