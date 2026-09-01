/** US/Canada mobile: +1 followed by 10 digits (11 digits total). */

export const US_PHONE_DIGIT_COUNT = 11;
export const US_PHONE_NATIONAL_DIGIT_COUNT = 10;

export function stripPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Format 10-digit national number while typing: 555 123 4567 */
export function formatUsNationalPhoneInput(raw: string): string {
  const digits = stripPhoneDigits(raw).slice(0, US_PHONE_NATIONAL_DIGIT_COUNT);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

export function isValidUsNationalPhone(phone: string): boolean {
  return stripPhoneDigits(phone).length === US_PHONE_NATIONAL_DIGIT_COUNT;
}

/** Format while typing: +1 555 123 4567 (max 11 digits). */
export function formatUsPhoneInput(raw: string): string {
  let digits = stripPhoneDigits(raw);
  if (digits.length === 0) return "";

  if (!digits.startsWith("1")) {
    digits = `1${digits}`;
  }

  digits = digits.slice(0, US_PHONE_DIGIT_COUNT);
  const national = digits.slice(1);

  if (national.length === 0) return "+1";
  if (national.length <= 3) return `+1 ${national}`;
  if (national.length <= 6) return `+1 ${national.slice(0, 3)} ${national.slice(3)}`;
  return `+1 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 10)}`;
}

export function isValidUsPhone(phone: string): boolean {
  const digits = stripPhoneDigits(phone);
  if (digits.length === US_PHONE_NATIONAL_DIGIT_COUNT) return true;
  return digits.length === US_PHONE_DIGIT_COUNT && digits.startsWith("1");
}

export function getUsPhoneValidationError(phone: string): string | null {
  if (stripPhoneDigits(phone).length === 0) return "Mobile number is required";
  if (!isValidUsPhone(phone)) return "Invalid mobile number";
  return null;
}

/** Normalize to E.164: +15551234567 */
export function normalizeUsPhone(phone: string): string {
  const digits = stripPhoneDigits(phone);
  if (digits.length === US_PHONE_NATIONAL_DIGIT_COUNT) return `+1${digits}`;
  if (digits.length === US_PHONE_DIGIT_COUNT && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

export function usPhoneLast4(phone: string): string {
  const digits = stripPhoneDigits(phone);
  return digits.slice(-4) || "••••";
}
