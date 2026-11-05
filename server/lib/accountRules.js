// Limits shared by sign-up and the profile screen.
export const USERNAME_MAX = 40
export const NAME_MAX = 60
export const EMAIL_MAX = 120

// bcrypt only reads the first 72 bytes, so longer passwords would be silently cut.
export function passwordProblem (password) {
  if (typeof password !== 'string' || password.length < 8) return 'The password needs at least 8 characters.'
  if (Buffer.byteLength(password) > 72) return 'The password is too long.'
  return null
}

export function usernameProblem (username) {
  if (typeof username !== 'string' || !username.trim()) return 'The username must not be empty.'
  if (username.trim().length > USERNAME_MAX) return `The username can have up to ${USERNAME_MAX} characters.`
  return null
}

export function nameProblem (name) {
  if (typeof name !== 'string' || !name.trim()) return 'The name must not be empty.'
  if (name.trim().length > NAME_MAX) return `The name can have up to ${NAME_MAX} characters.`
  return null
}
