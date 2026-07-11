/**
 * Keyword detection for FSD (Supervised) Monthly Subscription attach.
 * Used at check-in when feedback mentions FSD subscription / attach.
 * Does not treat maintenance phrases like "autopilot malfunction" as attach.
 */

const EXPLICIT_FSD_PHRASES = [
  'fsd attached',
  'fsd subscribed',
  'subscribed to fsd',
  'fsd subscription',
  'fsd (supervised)',
  'fsd supervised',
  'full self-driving',
  'full self driving',
  'monthly subscription',
  'subscribed to full self-driving',
  'subscribed to full self driving',
  'added fsd',
  'ordered fsd',
  'fsd order',
  'took fsd',
  'fsd take',
  'fsd attach',
  'attached fsd',
];

const FSD_CONTEXT_TOKENS = [
  'fsd',
  'full self-driving',
  'full self driving',
  'self-driving',
  'self driving',
];

const SUBSCRIBE_TOKENS = [
  'subscribed',
  'subscription',
  'attached',
  'attach',
  'signed up',
  'opted in',
  'added',
];

/** Returns true if feedback indicates FSD Monthly Subscription was attached. */
export function detectFsdSubscriptionFromKeywords(feedback: string): boolean {
  if (!feedback?.trim()) return false;
  const lower = feedback.toLowerCase();

  if (EXPLICIT_FSD_PHRASES.some((phrase) => lower.includes(phrase))) {
    return true;
  }

  const hasFsdContext = FSD_CONTEXT_TOKENS.some((token) => lower.includes(token));
  const hasSubscribe = SUBSCRIBE_TOKENS.some((token) => lower.includes(token));
  return hasFsdContext && hasSubscribe;
}
