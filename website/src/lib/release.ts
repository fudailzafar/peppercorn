import json from "./release.json";

/** The app to download. `app/scripts/publish-apk.sh` writes it, and puts the file in `public/download`. */
export interface Release {
  version: string;
  /** In `public/download`. */
  file: string;
  bytes: number;
  sha256: string;
}

/** Null until there is one: then the site says it is coming, and links to nothing. */
export const release = json as Release | null;

export const download = release && {
  href: `/download/${release.file}`,
  about: `Version ${release.version} · ${Math.round(release.bytes / 1e6)} MB · Android 7 or later`,
};
