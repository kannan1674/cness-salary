export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ data: T; response: Response }> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (!contentType.includes("application/json")) {
    const snippet = body.replace(/\s+/g, " ").slice(0, 160);
    throw new Error(
      response.status === 404
        ? "API route not found. Deploy as Node.js app (npm run build && npm run start), not static HTML."
        : `Server returned HTML instead of JSON (${response.status}). ${snippet || "Check Hostinger Node.js deployment and environment variables."}`
    );
  }

  try {
    return { data: JSON.parse(body) as T, response };
  } catch {
    throw new Error("Invalid JSON response from server.");
  }
}
