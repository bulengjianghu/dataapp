const ACCESS_TOKEN_KEY = "dataapp.accessToken";

type ApiResult<T> = {
  code: string;
  message: string;
  data: T;
};

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = (await response.json()) as ApiResult<T>;
  if (!response.ok || payload.code !== "SUCCESS") {
    if (response.status === 401 || payload.code === "UNAUTHORIZED") {
      throw new Error("请先登录后再继续");
    }
    throw new Error(payload.message || "请求失败");
  }
  return payload.data;
}
