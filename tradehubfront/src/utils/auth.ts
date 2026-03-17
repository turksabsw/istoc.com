/**
 * Authentication utility
 * - Mock login/logout: localStorage tabanlı (auth geliştirici gerçek UI'ı bağlayacak)
 * - getCurrentUser: Frappe backend'den canlı session bilgisi alır
 */

const AUTH_KEY = 'tradehub_auth';

export interface AuthUser {
  email: string;
  name: string;
}

/** Frappe get_current_user response tipi */
export interface FrappeCurrentUser {
  is_guest: boolean;
  email?: string;
  full_name?: string;
  is_seller?: boolean;
  seller?: {
    name: string;
    seller_name: string;
    seller_code: string;
    status: string;
    logo?: string;
    health_score?: number;
    score_grade?: string;
  } | null;
}

/** Check if user is logged in */
export function isLoggedIn(): boolean {
  return localStorage.getItem(AUTH_KEY) !== null;
}

/** Get current user info (or null if not logged in) */
export function getUser(): AuthUser | null {
  const data = localStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as AuthUser;
  } catch {
    return null;
  }
}

/** Mock login — stores user in localStorage */
export function login(email: string): void {
  const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const user: AuthUser = { email, name };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

/** Logout — clears auth state */
export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

/**
 * Frappe backend'den mevcut oturum + seller bilgisini alır.
 * Auth geliştirici login/register'dan sonra bu fonksiyonu kullanarak
 * UI'ı güncelleyebilir.
 *
 * @example
 *   const user = await getCurrentUser()
 *   if (user.is_seller) { ... }
 */
export async function getCurrentUser(): Promise<FrappeCurrentUser> {
  const { callMethod } = await import('./api');
  return callMethod<FrappeCurrentUser>('tradehub_core.api.auth.get_current_user');
}
