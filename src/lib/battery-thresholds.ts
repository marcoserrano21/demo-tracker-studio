/** Advisor Start blocked below this %. */
export const BATTERY_BLOCK_PERCENT = 15;

/** Low-battery queue / Charge CTA threshold (Available cars). */
export const BATTERY_QUEUE_PERCENT = 20;

/** Fleet attention strip filter threshold. */
export const BATTERY_ATTENTION_PERCENT = 30;

export function isLowBatteryQueue(level: number): boolean {
  return level < BATTERY_QUEUE_PERCENT;
}

export function isBatteryBlocked(level: number): boolean {
  return level < BATTERY_BLOCK_PERCENT;
}
