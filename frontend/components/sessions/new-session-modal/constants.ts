export const CONNECTION_OPTIONS = [
  { id: "HTTP_LOCAL", label: "HTTP local" },
  { id: "HTTP_REMOTE_BASIC", label: "HTTP remote" },
];

export const BODY_KIND_OPTIONS = [
  { id: "json", label: "JSON" },
  { id: "text", label: "Plain text" },
];

export const HTTP_AUTH_OPTIONS = [
  { id: "none", label: "No authentication" },
  { id: "bearer", label: "Bearer token" },
  { id: "basic", label: "Username & password (Basic)" },
];

export const DEFAULT_JSON_BODY = '{\n  "message": "hello"\n}';
