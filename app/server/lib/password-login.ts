/**
 * Bootstrap admin password-login identity.
 * Override in production via PASSWORD_LOGIN_EMAIL / PASSWORD_LOGIN_PASSWORD.
 */
export const BOOTSTRAP_ADMIN_EMAIL = "admin@bhd.om";
export const BOOTSTRAP_ADMIN_PASSWORD = "Admin@1234";

export function passwordLoginUnionId(email: string): string {
  return `password:${email.trim().toLowerCase()}`;
}
