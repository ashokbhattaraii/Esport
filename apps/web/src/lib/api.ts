const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fs_token");
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
  if (!res.ok) {
    const text = await res.text();
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
  return res.json();
}

export const auth = {
  setToken: (t: string) => localStorage.setItem("fs_token", t),
  clear: () => localStorage.removeItem("fs_token"),
  token,
};

export const API_BASE = API;
export const FILE_BASE = API.replace(/\/api$/, "");
