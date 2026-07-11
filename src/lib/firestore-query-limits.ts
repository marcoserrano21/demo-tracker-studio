/** Bounded Firestore reads — keeps dashboard listeners predictable at scale. */

export const DRIVE_LOGS_DASHBOARD_DAYS = 30;
export const DRIVE_LOGS_DASHBOARD_LIMIT = 500;

export const MANUAL_AWARDS_LIMIT = 100;
export const GOALS_LIMIT = 50;
export const FSD_ORDERS_LIMIT = 500;

/** Per date-range history fetch (History tab re-queries by selected days). */
export const HISTORY_DATE_RANGE_LIMIT = 500;
