import type {
  LocalAsset,
  LocalAssetRepository,
  PresentationPersistenceErrorCode,
} from "./presentation-repository";
import { PresentationPersistenceError } from "./presentation-repository";

export type LocalAssetResult =
  | { readonly success: true; readonly asset: LocalAsset }
  | {
      readonly success: false;
      readonly code: PresentationPersistenceErrorCode;
    };

export async function saveLocalAsset(
  repository: LocalAssetRepository,
  asset: LocalAsset,
): Promise<LocalAssetResult> {
  try {
    await repository.saveAsset(asset);
    return { success: true, asset };
  } catch (error) {
    return { success: false, code: getErrorCode(error) };
  }
}

export async function loadLocalAsset(
  repository: LocalAssetRepository,
  asset_id: string,
): Promise<
  | LocalAssetResult
  | { readonly success: false; readonly code: "ASSET_NOT_FOUND" }
> {
  try {
    const asset = await repository.loadAsset(asset_id);
    return asset === null
      ? { success: false, code: "ASSET_NOT_FOUND" }
      : { success: true, asset };
  } catch (error) {
    return { success: false, code: getErrorCode(error) };
  }
}

function getErrorCode(error: unknown): PresentationPersistenceErrorCode {
  return error instanceof PresentationPersistenceError
    ? error.code
    : "PERSISTENCE_WRITE_FAILED";
}
