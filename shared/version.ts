/** Semver — keep in sync with package.json when cutting releases. */
export const APP_VERSION = "2.5.0";

/** Short UI label (major.minor), e.g. biolabs v2.2 */
export function getAppVersionLabel(version: string = APP_VERSION): string {
  const match = /^(\d+)\.(\d+)/.exec(version);
  if (match) return `biolabs v${match[1]}.${match[2]}`;
  return `biolabs v${version}`;
}

export const APP_VERSION_LABEL = getAppVersionLabel(APP_VERSION);
