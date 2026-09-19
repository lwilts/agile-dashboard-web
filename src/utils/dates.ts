/**
 * Local calendar day as "YYYY-MM-DD".
 *
 * Deliberately not `toISOString()`, which is UTC: through British Summer Time
 * that puts the day boundary at 01:00 local, so "today" would run 01:00 to
 * 00:30 the following morning and the last two slots of today would really be
 * tomorrow's. The chart reads wall-clock hours, so days are cut in local time.
 */
export const toLocalDateString = (date: Date): string => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Midnight local time, `dayOffset` days from the given date. */
export const localMidnight = (date: Date, dayOffset = 0): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset);
