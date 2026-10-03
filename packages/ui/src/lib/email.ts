const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  const email = value.trim()
  return email.length > 0 && email.length <= 254 && EMAIL.test(email)
}
