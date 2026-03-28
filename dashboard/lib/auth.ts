export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  token: string;
}

export function saveAuth(user: AuthUser) {
  localStorage.setItem('cp_token', user.token);
  localStorage.setItem('cp_user', JSON.stringify(user));
}

export function getAuth(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cp_user');
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem('cp_token');
  localStorage.removeItem('cp_user');
}

export function isLoggedIn(): boolean {
  return !!getAuth();
}
