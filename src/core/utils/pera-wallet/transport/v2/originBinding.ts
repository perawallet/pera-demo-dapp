/*
 * SIWA origin binding for ARC-60. `@perawallet/connect` runs this check before
 * it contacts the wallet (`SIGN_DATA_DOMAIN_MISMATCH`); the v2 transport does
 * not go through the SDK, so the same check lives here. Ported from
 * `connect/src/transport/extension/originBinding.ts` so both paths agree.
 */

/** Reduce a domain or origin to its host, tolerating a missing scheme. */
export function hostFromMaybeUrl(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const candidate = trimmed.includes("//") ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);

    // Userinfo smuggling ("trusted.com@evil.com") is never legitimate; return
    // the raw string so the comparison fails safe (reports a mismatch).
    if (url.username || url.password) {
      return trimmed;
    }

    return url.host;
  } catch {
    return trimmed;
  }
}

/** True when the ARC-60 payload's `domain` names a different host than the page
 *  it was requested from. An unknown origin never reports a mismatch. */
export function isArc60OriginMismatch(
  domain: string,
  verifiedOrigin: string | undefined
): boolean {
  if (!verifiedOrigin) {
    return false;
  }

  return hostFromMaybeUrl(domain) !== hostFromMaybeUrl(verifiedOrigin);
}
