import type { AudioManifest } from "@/lib/api/youtube";
import { getJson } from "./r2";

export const MANIFEST_TAG = "manifest";

/** الفهرس من R2 مباشرة (مش من النسخة العامة)، عشان اللوحة تشوف الجديد أول ما يترفع */
export async function adminManifest(): Promise<AudioManifest> {
  return (await getJson<AudioManifest>("manifest.json", [MANIFEST_TAG]).catch(() => null)) ?? {};
}
