/** The id comes from a CI secret, which is easy to save with a trailing
 *  newline. The relay rejects that as "Project not found" and the sign
 *  client retries silently, so Connect looks like a no-op. */
export const normalizeProjectId = (raw: string | undefined): string | undefined =>
  raw?.trim() || undefined;
