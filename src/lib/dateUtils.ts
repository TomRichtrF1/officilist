export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function addWorkingDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      addedDays++;
    }
  }

  return result;
}

export function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current < endDate) {
    if (!isWeekend(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function isTaskUrgent(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === 'HOTOVO' || status === 'ZRUSEN') {
    return false;
  }

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (due < today) {
    return true;
  }

  const workingDays = getWorkingDaysBetween(today, due);
  return workingDays <= 3;
}
