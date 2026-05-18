// ── Shared input validation for KASHAF ──────────────────────────────────

/* ── Constants ───────────────────────────────────────────────────────── */
export const BOUNDS = {
    AGE: { min: 10, max: 50 },
    HEIGHT: { min: 100, max: 210 },
    WEIGHT: { min: 30, max: 150 },
    EXPERIENCE: { min: 0, max: 50 },
    NAME: { minLength: 2, maxLength: 50 },
    PASSWORD: { minLength: 8 },
    BIO: { minLength: 20, maxLength: 1000 },
    CLUB_NAME: { minLength: 2, maxLength: 100 },
} as const;

/* ── Email ────────────────────────────────────────────────────────────
   - Must have a local part, @ sign, domain, and a valid ASCII TLD (2-10 letters)
   - Rejects: "hhh", "user@fake", "user@domain.لتلت", "mhhjfjff@jglgl"
   ──────────────────────────────────────────────────────────────────── */
const EMAIL_RE =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,10}$/;

export function isValidEmail(email: string): boolean {
    if (!email || email.length > 254) return false;
    return EMAIL_RE.test(email.trim());
}

/* ── Name ─────────────────────────────────────────────────────────────
   2–50 chars. Allows letters (including accented), spaces, hyphens, apostrophes.
   No digits, no special characters.
   ──────────────────────────────────────────────────────────────────── */
const NAME_RE = /^[\p{L}\s'\-]{2,50}$/u;

export function isValidName(name: string): boolean {
    if (!name) return false;
    const trimmed = name.trim();
    if (trimmed.length < BOUNDS.NAME.minLength || trimmed.length > BOUNDS.NAME.maxLength) return false;
    return NAME_RE.test(trimmed);
}

/* ── Password ─────────────────────────────────────────────────────────
   At least 8 chars, must contain at least one letter and one digit.
   ──────────────────────────────────────────────────────────────────── */
export function isValidPassword(password: string): boolean {
    if (!password || password.length < BOUNDS.PASSWORD.minLength) return false;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    return hasLetter && hasDigit;
}

/* ── Phone / WhatsApp ─────────────────────────────────────────────────
   Optional — but if provided, must look like a phone number:
   digits, optional leading +, spaces, dashes, parentheses.
   ──────────────────────────────────────────────────────────────────── */
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;

export function isValidPhone(phone: string): boolean {
    if (!phone) return true; // optional field
    return PHONE_RE.test(phone.trim());
}

/* ── Range check ──────────────────────────────────────────────────── */
export function inRange(value: number, min: number, max: number): boolean {
    return Number.isFinite(value) && value >= min && value <= max;
}

/* ── Bio ──────────────────────────────────────────────────────────── */
export function isValidBio(bio: string): boolean {
    if (!bio) return false;
    const trimmed = bio.trim();
    return trimmed.length >= BOUNDS.BIO.minLength && trimmed.length <= BOUNDS.BIO.maxLength;
}

/* ── Club name ────────────────────────────────────────────────────── */
export function isValidClubName(name: string): boolean {
    if (!name) return false;
    const trimmed = name.trim();
    return trimmed.length >= BOUNDS.CLUB_NAME.minLength && trimmed.length <= BOUNDS.CLUB_NAME.maxLength;
}
