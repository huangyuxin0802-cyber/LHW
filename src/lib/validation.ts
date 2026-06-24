const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export type FieldErrors = {
  email?: string;
  password?: string;
  username?: string;
};

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  if (!EMAIL_REGEX.test(trimmed)) return "Enter a valid email address";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[a-zA-Z]/.test(password)) return "Password must include a letter";
  if (!/[0-9]/.test(password)) return "Password must include a number";
  return undefined;
}

export function validateUsername(username: string): string | undefined {
  const trimmed = username.trim();
  if (!trimmed) return "Username is required";
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Username must be 3–20 characters (letters, numbers, underscore)";
  }
  return undefined;
}

export function validateLoginForm(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const emailError = validateEmail(email);
  const passwordError = password ? undefined : "Password is required";
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function validateRegisterForm(
  email: string,
  password: string,
  username: string
): FieldErrors {
  const errors: FieldErrors = {};
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const usernameError = validateUsername(username);
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  if (usernameError) errors.username = usernameError;
  return errors;
}
