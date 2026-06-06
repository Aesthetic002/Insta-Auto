// In-process render pipeline.
//
// 1. POST /api/render inserts a RenderJob (status=QUEUED) and calls
//    `startRender(jobId)` without awaiting — the response returns instantly
//    so the browser can poll for status.
// 2. startRender bundles the Remotion entry (cached after first call),
//    renders the chosen composition with the user's props, uploads to
//    Cloudinary, then marks the job DONE with the secure URL.
// 3. Video templates → renderMedia() → mp4 → Cloudinary video resource.
//    Image templates → renderStill() → png  → Cloudinary image resource.
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
  renderStill,
  selectComposition,
  type RenderMediaOnProgress,
} from "@remotion/renderer";

import { db } from "@/lib/db";
import { getTemplate } from "@/lib/templates";
import {
  uploadLocalImage,
  uploadLocalVideo,
} from "@/lib/cloudinary/upload";

// Bundle once per server process. Subsequent renders reuse the same bundle URL.
let bundlePromise: Promise<string> | null = null;

function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.resolve(process.cwd(), "remotion/index.ts"),
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

// Cloudinary video transformation that downsizes a user upload before we hand
// it to Chromium. The render output is still 1080×1920, but we don't need the
// source clip at full resolution to do that — and a 10× smaller download is
// the difference between a 5-second seek and a 60-second timeout on DO's
// slow container egress. Applied only to Cloudinary video URLs.
function transformCloudinaryVideoForRender(url: string): string {
  if (!url.includes("/video/upload/")) return url;
  // Strip any pre-existing transform so we don't stack them.
  const cleaned = url.replace(/\/video\/upload\/[^v][^/]*\//, "/video/upload/");
  // q_auto:low → ~70% smaller; vc_h264 → guarantee a Chromium-friendly codec.
  return cleaned.replace(
    "/video/upload/",
    "/video/upload/q_auto:low,vc_h264,h_720,c_limit/"
  );
}

function rewriteInputUrls(
  inputs: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...inputs };
  for (const [k, v] of Object.entries(inputs)) {
    if (typeof v === "string" && v.includes("/video/upload/")) {
      out[k] = transformCloudinaryVideoForRender(v);
    }
  }
  return out;
}

// Cloudinary lazily generates derived assets the first time a transformed URL
// is requested — for a video, that derivation can take 60-180s. By hitting the
// URL ourselves (and waiting up to ~3min) before Chromium needs the bytes, we
// move that latency out of Remotion's frame-fetch path entirely. Each request
// is fire-and-forget per URL; we use HEAD to avoid downloading the body.
async function warmCloudinaryDerivatives(
  inputs: Record<string, unknown>
): Promise<void> {
  const seen = new Set<string>();
  const warms: Promise<void>[] = [];

  for (const v of Object.values(inputs)) {
    if (typeof v !== "string") continue;
    if (!v.includes("/video/upload/q_")) continue; // only transformed URLs
    if (seen.has(v)) continue;
    seen.add(v);

    warms.push(
      (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 180_000);
        try {
          // GET with a Range header so Cloudinary streams just the first byte
          // while still triggering full derivation. HEAD doesn't always
          // trigger Cloudinary's derive pipeline.
          const res = await fetch(v, {
            method: "GET",
            headers: { Range: "bytes=0-0" },
            signal: controller.signal,
          });
          if (!res.ok && res.status !== 206) {
            console.warn(
              `[render] pre-warm got HTTP ${res.status} for ${v} — render may stall`
            );
          }
        } catch (err) {
          console.warn(
            `[render] pre-warm failed for ${v}:`,
            err instanceof Error ? err.message : err
          );
        } finally {
          clearTimeout(timer);
        }
      })()
    );
  }

  await Promise.all(warms);
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

  const serveUrl = await getBundle();

  // Downsize Cloudinary video sources before handing them to Chromium —
  // makes the difference between a 5s and 60s fetch on DO's container.
  const renderInputs = rewriteInputUrls(job.inputs as Record<string, unknown>);

  if (template.kind === "image") {
    const composition = await selectComposition({
      serveUrl,
      id: template.id,
      inputProps: renderInputs,
    });
    await renderImageJob({
      jobId,
      userId: job.userId,
      outDir,
      serveUrl,
      composition,
      inputProps: renderInputs,
    });
    return;
  }

  // Pre-warm Cloudinary derived video URLs before Chromium needs them.
  // Cloudinary builds derived assets on the first request — for a video that
  // can be 60-180s — and Chromium's `delayRender` only waits ~90s. Triggering
  // the derivation ourselves moves that wait out of the render loop.
  await warmCloudinaryDerivatives(renderInputs);

  const composition = await selectComposition({
    serveUrl,
    id: template.id,
    inputProps: renderInputs,
  });

  await renderVideoJob({
    jobId,
    userId: job.userId,
    outDir,
    serveUrl,
    composition,
    inputProps: renderInputs,
  });
}

async function renderVideoJob(args: {
  jobId: string;
  userId: string;
  outDir: string;
  serveUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  composition: any;
  inputProps: Record<string, unknown>;
}): Promise<void> {
  const outPath = path.join(args.outDir, `${args.jobId}.mp4`);

  const onProgress: RenderMediaOnProgress = ({ progress }) => {
    if (process.env.NODE_ENV !== "production") {
      process.stdout.write(`\r[render ${args.jobId}] ${Math.round(progress * 100)}%`);
    }
  };

  await renderMedia({
    composition: args.composition,
    serveUrl: args.serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps: args.inputProps,
    onProgress,
    // Memory caps so renders fit DO's 1GB container — see commit 75bcc18.
    concurrency: 1,
    offthreadVideoCacheSizeInBytes: 300 * 1024 * 1024,
    chromiumOptions: { gl: "swiftshader" },
    // Bump per-frame delayRender timeout from the 28s default. DO's egress
    // + swiftshader decoding can take ~30-60s to seek into a large Cloudinary
    // mp4; 90s gives the headroom without making truly hung renders take
    // forever to fail.
    timeoutInMilliseconds: 90_000,
    // Verbose logs so we can see what Chromium / the proxy are actually
    // doing on DO. Visible in DO Runtime Logs as `[render <id>] ...`.
    logLevel: "verbose",
  });

  await db.renderJob.update({
    where: { id: args.jobId },
    data: { status: "UPLOADING" },
  });

  const publicId = `r_${args.userId}/${randomUUID()}`;
  const uploaded = await uploadLocalVideo({
    filePath: outPath,
    publicId,
    folder: "renders",
  });

  const thumbnailUrl = uploaded.secureUrl
    .replace("/video/upload/", "/video/upload/so_0,w_400,h_400,c_fill/")
    .replace(/\.[^.]+$/, ".jpg");

  await db.renderJob.update({
    where: { id: args.jobId },
    data: {
      status: "DONE",
      outputUrl: uploaded.secureUrl,
      thumbnailUrl,
      completedAt: new Date(),
    },
  });

  await rm(outPath, { force: true }).catch(() => {});
}

async function renderImageJob(args: {
  jobId: string;
  userId: string;
  outDir: string;
  serveUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  composition: any;
  inputProps: Record<string, unknown>;
}): Promise<void> {
  const outPath = path.join(args.outDir, `${args.jobId}.png`);

  await renderStill({
    composition: args.composition,
    serveUrl: args.serveUrl,
    output: outPath,
    inputProps: args.inputProps,
    imageFormat: "png",
    // Same Chromium hardening as video renders.
    chromiumOptions: { gl: "swiftshader" },
  });

  await db.renderJob.update({
    where: { id: args.jobId },
    data: { status: "UPLOADING" },
  });

  const publicId = `r_${args.userId}/${randomUUID()}`;
  const uploaded = await uploadLocalImage({
    filePath: outPath,
    publicId,
    folder: "renders",
    ext: "png",
  });

  // For images, the upload URL itself is the thumbnail (no separate frame
  // extraction needed). Use a smaller Cloudinary-transformed variant for the
  // gallery card.
  const thumbnailUrl = uploaded.secureUrl.replace(
    "/image/upload/",
    "/image/upload/w_400,h_400,c_fill/"
  );

  await db.renderJob.update({
    where: { id: args.jobId },
    data: {
      status: "DONE",
      outputUrl: uploaded.secureUrl,
      thumbnailUrl,
      completedAt: new Date(),
    },
  });

  await rm(outPath, { force: true }).catch(() => {});
}
