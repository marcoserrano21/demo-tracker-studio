/**
 * Keyword-based maintenance issue detection (single source of truth).
 * Used at check-in when feedback may describe vehicle problems.
 */

const PHYSICAL_ISSUES = [
  'rattle', 'rattling', 'squeak', 'squeaking', 'grind', 'grinding', 'clunk', 'clunking',
  'buzz', 'buzzing', 'hum', 'humming', 'whine', 'whining', 'thump', 'thumping',
  'panel gap', 'misalignment', 'misaligned', 'scratch', 'scratched', 'scuff', 'scuffed',
  'dent', 'dented', 'ding', 'chip', 'crack', 'cracked', 'curb rash',
  'loose trim', 'trim falling off', 'door alignment', 'damage', 'damaged',
  'noise', 'noisy', 'vibration', 'vibrating', 'wobbly', 'broken', 'fell off',
  'cracked windshield', 'foggy', 'camera dirty',
];

const FUNCTIONAL_ISSUES = [
  'not working', "doesn't work", 'malfunction', 'glitch', 'bug', 'error', 'errors',
  'warning light', 'check engine', 'fault', 'limp mode',
  'screen freeze', 'frozen screen', 'black screen', 'screen lag', 'laggy',
  'touchscreen lag', 'unresponsive', 'freezing', 'frozen', 'crashed',
  'reboot', 'restart required', 'connectivity loss', 'bluetooth issue',
  'camera blocked', 'sensor fault', 'phantom drain', 'phantom braking',
  'autopilot malfunction', 'touchscreen freeze', 'system glitch',
  'firmware bug', 'unresponsive ui', 'unexpected shutdown', 'software update delay',
  'brake fail', 'too slow', 'updating', 'needs an update', 'too many issues',
];

const CONDITION_ISSUES = [
  'stain', 'stained', 'torn', 'ripped', 'dirty', 'smell', 'odor',
  'burning smell', 'weird smell', 'mildew', 'smelly',
  'missing part', 'missing parts', 'missing',
  'stuck', 'jammed', "won't open", "won't close", "won't charge",
  'charge port', 'charging issue', 'slow charging', 'charging port failure',
  'battery degradation', 'range drop', 'overheating', 'adapter damage',
  'battery is too low', 'leak', 'leaking',
];

const PERFORMANCE_ISSUES = [
  'brake noise', 'grinding brakes', 'steering pull', 'steering fault',
  'vibration at speed', 'suspension', 'suspension clunk',
  'tire wear', 'flat tire', 'low tire pressure', 'tpms', 'alignment issue',
  'panel misalignment', 'door handle failure', 'air suspension leak',
  'poor handling', 'braking problems', 'steering issues',
];

const REPORTING_PHRASES = [
  'needs attention', 'needs repair', 'should fix', 'should be serviced',
  'should repair', 'something wrong', 'concern about', 'reported issue',
  'take out of rotation', 'not demo ready', 'problem with', 'issue with',
  'needs an update', 'needs to be fixed',
];

const LEGACY_ISSUES = [
  'battery degradation', 'charging port failure', 'slow charging', 'range drop',
  'overheating', 'adapter damage', 'phantom drain', 'autopilot malfunction',
  'phantom braking', 'connectivity loss', 'firmware bug', 'unresponsive ui',
  'panel misalignment', 'suspension clunk', 'door handle failure',
  'air suspension leak', 'long wait times', 'part shortages', 'warranty confusion',
];

export const ISSUE_KEYWORD_GROUPS = {
  physical: PHYSICAL_ISSUES,
  functional: FUNCTIONAL_ISSUES,
  condition: CONDITION_ISSUES,
  performance: PERFORMANCE_ISSUES,
  reporting: REPORTING_PHRASES,
  legacy: LEGACY_ISSUES,
} as const;

const ALL_ISSUE_KEYWORDS: readonly string[] = [
  ...PHYSICAL_ISSUES,
  ...FUNCTIONAL_ISSUES,
  ...CONDITION_ISSUES,
  ...PERFORMANCE_ISSUES,
  ...REPORTING_PHRASES,
  ...LEGACY_ISSUES,
];

/** Returns true if feedback text matches any maintenance issue keyword. */
export function detectIssuesFromKeywords(feedback: string): boolean {
  if (!feedback?.trim()) return false;
  const lower = feedback.toLowerCase();
  return ALL_ISSUE_KEYWORDS.some((keyword) => lower.includes(keyword));
}
