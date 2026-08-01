import { isPortraitStory } from "@/lib/admin-stories/contract";

export interface StoryVideoMetadata {
  width: number;
  height: number;
  durationSeconds: number;
}

const VIDEO_READ_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), VIDEO_READ_TIMEOUT_MS);
    promise.then((value) => { window.clearTimeout(timeout); resolve(value); }, (error) => { window.clearTimeout(timeout); reject(error); });
  });
}

function loadVideo(file: File) {
  return new Promise<{ video: HTMLVideoElement; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => resolve({ video, url });
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Browser cannot preview this video."));
    };
    video.src = url;
  });
}

export async function inspectStoryVideo(file: File): Promise<StoryVideoMetadata> {
  const { video, url } = await withTimeout(loadVideo(file), "Browser cannot preview this video before the metadata timeout.");
  try {
    const metadata = {
      width: video.videoWidth,
      height: video.videoHeight,
      durationSeconds: video.duration,
    };
    if (!metadata.width || !metadata.height || !Number.isFinite(metadata.durationSeconds)) {
      throw new Error("The video metadata is incomplete.");
    }
    return metadata;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export async function createStoryPoster(file: File, seekSeconds?: number) {
  const { video, url } = await withTimeout(loadVideo(file), "Browser cannot preview this video before the metadata timeout.");
  try {
    if (!isPortraitStory(video.videoWidth, video.videoHeight)) {
      throw new Error("Founder Stories must use a vertical 9:16 video.");
    }
    const requestedFrame = seekSeconds ?? Math.min(Math.max(video.duration * 0.1, 0.1), 1);
    const target = Math.min(requestedFrame, Math.max(video.duration - 0.05, 0));
    if (target > 0) {
      await withTimeout(new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("A poster frame could not be read."));
        video.currentTime = target;
      }), "Browser cannot preview this video before the frame timeout.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Poster generation is unavailable in this browser.");
    const targetRatio = canvas.width / canvas.height;
    const sourceRatio = video.videoWidth / video.videoHeight;
    let sourceX = 0; let sourceY = 0; let sourceWidth = video.videoWidth; let sourceHeight = video.videoHeight;
    if (sourceRatio > targetRatio) { sourceWidth = video.videoHeight * targetRatio; sourceX = (video.videoWidth - sourceWidth) / 2; }
    else if (sourceRatio < targetRatio) { sourceHeight = video.videoWidth / targetRatio; sourceY = (video.videoHeight - sourceHeight) / 2; }
    context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Poster generation failed.")), "image/webp", 0.86);
    });
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
