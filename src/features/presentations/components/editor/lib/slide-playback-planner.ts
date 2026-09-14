import { getAnimationCapability } from "@/features/presentations/core/capabilities/animation";
import type {
  EditorAnimationPlayback,
  EditorAnimationPreview,
} from "./editor-model";

export function createSlidePlayback(
  session_id: number,
  slide_id: string,
  previews: readonly EditorAnimationPreview[],
): EditorAnimationPlayback | null {
  const phases = splitPreviewsByPhase(previews);
  return startNextPhase({
    key: session_id,
    origin: "slide",
    sessionId: session_id,
    slideId: slide_id,
    previews: [],
    ...phases,
  });
}

export function completeSlidePlayback(
  playback: EditorAnimationPlayback,
  session_id: number,
  preview_key: number,
): EditorAnimationPlayback | null {
  if (
    playback.origin !== "slide" ||
    playback.sessionId !== session_id ||
    playback.phase === undefined ||
    !playback.previews.some((preview) => preview.key === preview_key)
  )
    return playback;

  if (
    playback.previews.find((preview) => preview.key === preview_key)?.animation
      .repeat === "infinite"
  )
    return playback;

  const previews = playback.previews.filter(
    (preview) => preview.key !== preview_key,
  );
  return previews.length === 0
    ? startNextPhase({ ...playback, previews })
    : { ...playback, previews };
}

export function pauseSlidePlayback(
  playback: EditorAnimationPlayback,
): EditorAnimationPlayback | null {
  if (playback.origin !== "slide") return playback;
  return playback.phase === "entrance" || playback.phase === "continuous"
    ? startExitPhase(playback)
    : null;
}

function splitPreviewsByPhase(previews: readonly EditorAnimationPreview[]) {
  const entrance_previews: EditorAnimationPreview[] = [];
  const continuous_previews: EditorAnimationPreview[] = [];
  const exit_previews: EditorAnimationPreview[] = [];
  for (const preview of previews) {
    switch (getAnimationCapability(preview.animation.type)?.category) {
      case "entrance":
        entrance_previews.push(preview);
        break;
      case "continuous":
        continuous_previews.push(preview);
        break;
      case "exit":
        exit_previews.push(preview);
        break;
    }
  }
  return {
    entrancePreviews: entrance_previews,
    continuousPreviews: continuous_previews,
    exitPreviews: exit_previews,
  };
}

function startNextPhase(
  playback: EditorAnimationPlayback,
): EditorAnimationPlayback | null {
  if (playback.entrancePreviews?.length) {
    return {
      ...playback,
      phase: "entrance",
      previews: playback.entrancePreviews,
      entrancePreviews: [],
    };
  }
  if (playback.continuousPreviews?.length) {
    return {
      ...playback,
      phase: "continuous",
      previews: playback.continuousPreviews,
      continuousPreviews: [],
    };
  }
  return startExitPhase(playback);
}

function startExitPhase(
  playback: EditorAnimationPlayback,
): EditorAnimationPlayback | null {
  return playback.exitPreviews?.length
    ? {
        ...playback,
        phase: "exit",
        previews: playback.exitPreviews,
        exitPreviews: [],
      }
    : null;
}
