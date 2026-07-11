/** Apply or remove the user-controlled reduced motion class on the document root. */
export function applyReduceMotion(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('reduce-motion', enabled);
}

export function readReduceMotionFromProfile(profileJson: string | null): boolean {
  if (!profileJson) return false;
  try {
    const profile = JSON.parse(profileJson) as { reduceMotion?: boolean };
    return profile.reduceMotion === true;
  } catch {
    return false;
  }
}
