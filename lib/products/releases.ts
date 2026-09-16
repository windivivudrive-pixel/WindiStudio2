export type ProductReleaseLike = {
  id?: string | null;
  version: string;
  created_at?: string | null;
};

type ParsedVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

function parseVersion(value: string): ParsedVersion | null {
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

function compareVersions(left: string, right: string) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return left.localeCompare(right, undefined, { numeric: true });
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (a[key] !== b[key]) return a[key] - b[key];
  }
  if (!a.prerelease.length || !b.prerelease.length) {
    return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length ? -1 : 1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null;
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null;
    if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
    if (leftNumber !== null) return -1;
    if (rightNumber !== null) return 1;
    return leftPart.localeCompare(rightPart);
  }
  return 0;
}

/** Pick the newest published release by semantic version, not insertion time. */
export function latestProductRelease<T extends ProductReleaseLike>(releases: readonly T[]) {
  return [...releases].sort((left, right) => {
    const versionOrder = compareVersions(right.version, left.version);
    if (versionOrder !== 0) return versionOrder;
    const dateOrder = Date.parse(right.created_at ?? '') - Date.parse(left.created_at ?? '');
    if (Number.isFinite(dateOrder) && dateOrder !== 0) return dateOrder;
    return (right.id ?? '').localeCompare(left.id ?? '');
  })[0] ?? null;
}
