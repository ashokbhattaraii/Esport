function normalizeApiUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const API = normalizeApiUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
);

function token(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("fs_token")?.trim();
  if (!stored || stored === "undefined" || stored === "null") {
    localStorage.removeItem("fs_token");
    return null;
  }
  return stored;
}

export async function api<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (!(init.body instanceof FormData) && init.body) {
    headers["Content-Type"] = "application/json";
  }
  const t = token();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text || res.statusText;
    try {
      const data = JSON.parse(text);
      message =
        (Array.isArray(data.message) ? data.message[0] : data.message) ||
        data.error ||
        message;
    } catch {
      // Keep the raw response text when the server did not return JSON.
    }
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("fs_token");
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;

  if (!text) return undefined as T;
  const data = JSON.parse(text);
  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    "data" in data
  ) {
    return data.data as T;
  }
  return data as T;
}

export const auth = {
  setToken: (t?: string | null) => {
    const value = t?.trim();
    if (!value || value === "undefined" || value === "null") {
      localStorage.removeItem("fs_token");
      throw new Error("Missing auth token");
    }
    localStorage.setItem("fs_token", value);
  },
  clear: () => localStorage.removeItem("fs_token"),
  token,
};

export const API_BASE = API;
export const FILE_BASE = API.replace(/\/api$/, "");
