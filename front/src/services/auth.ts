import { clearAccessToken, request, setAccessToken } from "./api";

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: number;
  username: string;
  displayName: string;
};

export type CurrentUser = {
  userId: number;
  username: string;
  roles: string[];
};

export async function login(username: string, password: string) {
  const response = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setAccessToken(response.accessToken);
  return response;
}

export async function getCurrentUser() {
  return request<CurrentUser>("/api/auth/me");
}

export function logout() {
  clearAccessToken();
}
