/** Agent URL as stored/sent to API. Prepends http:// when the user omits the scheme (host:port/path). */
export function normalizeAgentHttpUrl(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "";
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  return `http://${t}`;
}
