export const TASKS_PER_DAY = 3;

function dateStr(d) { return d.toISOString().split('T')[0]; }

// Returns an array of `count` due-dates, filling each day up to `tasksPerDay`
// (counting any already-scheduled, not-done dates passed in) before moving to the next day.
export function pickDailyDueDates(count, existingDueDates = [], tasksPerDay = TASKS_PER_DAY) {
  const counts = {};
  existingDueDates.forEach(d => { if (d) counts[d] = (counts[d] || 0) + 1; });

  const dates = [];
  let offset = 0;
  let cursor = dateStr(new Date());
  for (let i = 0; i < count; i++) {
    while ((counts[cursor] || 0) >= tasksPerDay) {
      offset++;
      const d = new Date();
      d.setDate(d.getDate() + offset);
      cursor = dateStr(d);
    }
    counts[cursor] = (counts[cursor] || 0) + 1;
    dates.push(cursor);
  }
  return dates;
}
