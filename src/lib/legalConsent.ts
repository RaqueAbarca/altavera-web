export const TERMS_VERSION = "2026-09-03";
export const PRIVACY_VERSION = "2026-09-03";

export function hasCurrentLegalConsent(value: {
  termsVersion?: string | null;
  privacyVersion?: string | null;
}) {
  return (
    value.termsVersion === TERMS_VERSION &&
    value.privacyVersion === PRIVACY_VERSION
  );
}
