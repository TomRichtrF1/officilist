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

export interface TaskReminderInfo {
  dueDate?: string | null;
  status: string;
  reminderDate?: string | null;
  reminderDaysBefore?: number | null;
}

export function isTaskUrgent(
  dueDateOrTask: string | null | undefined | TaskReminderInfo,
  status?: string
): boolean {
  // Podpora pro původní signaturu (dueDate, status) i novou (task object)
  let dueDate: string | null | undefined;
  let taskStatus: string;
  let reminderDate: string | null | undefined;
  let reminderDaysBefore: number | null | undefined;

  if (typeof dueDateOrTask === 'object' && dueDateOrTask !== null) {
    dueDate = dueDateOrTask.dueDate;
    taskStatus = dueDateOrTask.status;
    reminderDate = dueDateOrTask.reminderDate;
    reminderDaysBefore = dueDateOrTask.reminderDaysBefore;
  } else {
    dueDate = dueDateOrTask;
    taskStatus = status || '';
  }

  if (!dueDate || taskStatus === 'HOTOVO' || taskStatus === 'ZRUSEN') {
    return false;
  }

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  // Úkol po termínu je vždy urgentní
  if (due < today) {
    return true;
  }

  // Pokud je nastaveno konkrétní datum připomenutí
  if (reminderDate) {
    const reminder = new Date(reminderDate);
    reminder.setHours(0, 0, 0, 0);
    return today >= reminder;
  }

  // Pokud je nastaven počet dní před termínem
  if (reminderDaysBefore !== null && reminderDaysBefore !== undefined) {
    const workingDays = getWorkingDaysBetween(today, due);
    return workingDays <= reminderDaysBefore;
  }

  // Výchozí: 3 pracovní dny (zachování zpětné kompatibility)
  const workingDays = getWorkingDaysBetween(today, due);
  return workingDays <= 3;
}
