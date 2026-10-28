// Field rules for the sign-in screens. Each returns a message for the person, or null when the value is fine.
export const MIN_PASSWORD = 8
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Enter your email address.'
  return EMAIL.test(v) ? null : 'Enter a valid email address, like name@company.com.'
}
/** Signing in only needs a password; the length rule applies where a password is chosen. */
export function validateLoginPassword(value: string): string | null {
  return value ? null : 'Enter your password.'
}
export function validateNewPassword(value: string): string | null {
  if (!value) return 'Choose a password.'
  return value.length >= MIN_PASSWORD ? null : `Use at least ${MIN_PASSWORD} characters.`
}
export function validateFullName(value: string): string | null {
  return value.trim() ? null : 'Enter your full name.'
}
export function validateConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Type the password again.'
  return confirm === password ? null : 'The passwords don’t match.'
}
