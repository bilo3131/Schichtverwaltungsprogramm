import { Employee, Shift, ShiftType, AbsenceRecord } from '../../../core/models';
import { isEmployeeAbsent } from './shift-conflict.util';

// ── Required qualifications ───────────────────────────────────────────────────

/** Returns a comma-separated string of all qualification names required by a shift type. */
export function getRequiredQualificationsText(shiftType: ShiftType): string {
  return shiftType.qualification_details?.length
    ? shiftType.qualification_details.map((q: any) => q.name).join(', ')
    : 'Keine';
}

/** Collects the IDs of all qualifications held by the employees assigned to the given shifts. */
function getAssignedQualIds(shifts: Shift[]): Set<number> {
  const ids = new Set<number>();
  shifts.forEach(s => s.employee_details?.qualification_details?.forEach((q: any) => ids.add(q.id)));
  return ids;
}

/** Returns true when at least one required qualification is not covered by the assigned employees. */
export function hasMissingQualifications(shiftType: ShiftType, shifts: Shift[]): boolean {
  if (!shiftType.qualification_details?.length || !shifts.length) return false;
  const covered = getAssignedQualIds(shifts);
  return shiftType.qualification_details.some((q: any) => !covered.has(q.id));
}

/** Returns a comma-separated list of qualification names not yet covered by the assigned employees. */
export function getMissingQualificationsText(shiftType: ShiftType, shifts: Shift[]): string {
  if (!shiftType.qualification_details) return '';
  const covered = getAssignedQualIds(shifts);
  return shiftType.qualification_details
    .filter((q: any) => !covered.has(q.id))
    .map((q: any) => q.name)
    .join(', ');
}

// ── Suggested employees ───────────────────────────────────────────────────────

/** Returns true when the employee meets all conditions to be suggested for a shift cell. */
function isEligibleCandidate(
  emp: Employee, shiftType: ShiftType, dateStr: string,
  assigned: Set<any>, scheduledToday: Set<any>,
  absences: AbsenceRecord[], missingQualIds: number[]
): boolean {
  if (assigned.has(emp.id) || scheduledToday.has(emp.id)) return false;
  if (isEmployeeAbsent(emp.id, dateStr, absences)) return false;
  if (shiftType.department && emp.department && shiftType.department !== emp.department) return false;
  const empQualIds = emp.qualification_details?.map((q: any) => q.id) ?? [];
  return missingQualIds.some(id => empQualIds.includes(id));
}

/** Returns how many of the employee's qualifications appear in the missing-qualification list. */
function countMatchingQuals(emp: Employee, missingIds: number[]): number {
  return emp.qualification_details?.filter((q: any) => missingIds.includes(q.id)).length ?? 0;
}

/**
 * Returns employees who can fill missing qualifications for a shift cell.
 * Excludes employees already assigned, scheduled elsewhere that day, or absent.
 * Sorted by number of matching missing qualifications (descending).
 */
export function getSuggestedEmployees(
  shiftType: ShiftType, shiftsInCell: Shift[], allEmployees: Employee[],
  allShifts: Shift[], absences: AbsenceRecord[], dateStr: string
): Employee[] {
  if (!shiftType.qualification_details?.length) return [];
  const covered    = getAssignedQualIds(shiftsInCell);
  const missingIds = shiftType.qualification_details.filter((q: any) => !covered.has(q.id)).map((q: any) => q.id);
  if (!missingIds.length) return [];
  const assigned       = new Set(shiftsInCell.map(s => s.employee).filter(Boolean));
  const scheduledToday = new Set(allShifts.filter(s => s.date === dateStr).map(s => s.employee).filter(Boolean));
  return allEmployees
    .filter(emp => isEligibleCandidate(emp, shiftType, dateStr, assigned, scheduledToday, absences, missingIds))
    .sort((a, b) => countMatchingQuals(b, missingIds) - countMatchingQuals(a, missingIds));
}

// ── Employee name display ─────────────────────────────────────────────────────

/** Truncates a last name to at most 7 characters. */
function truncateLastName(lastName: string): string {
  return lastName.length > 7 ? lastName.substring(0, 7) : lastName;
}

/** Returns all other employees who share the same last name. */
function findSameLastNamePeers(employee: Employee, allEmployees: Employee[]): Employee[] {
  const lastName = employee.full_name.trim().split(' ').at(-1);
  return allEmployees.filter(emp => {
    if (emp.id === employee.id) return false;
    return (emp.full_name || '').trim().split(' ').at(-1) === lastName;
  });
}

/** Returns the shortest first-name prefix that makes the display name unique among peers. */
function uniqueFirstNamePrefix(firstName: string, peers: Employee[]): string {
  for (let len = 1; len <= firstName.length; len++) {
    const abbr = firstName.substring(0, len);
    const conflict = peers.some(p => (p.full_name || '').trim().split(' ')[0].substring(0, len) === abbr);
    if (!conflict) return abbr;
  }
  return firstName;  // fallback: full first name
}

/**
 * Returns a short, unique display name for the shift grid (e.g. "Ma.Schmidt").
 * Uses progressively longer first-name prefixes to disambiguate same-last-name employees.
 */
export function abbreviateEmployeeName(employee: Employee, allEmployees: Employee[]): string {
  if (!employee.full_name) return '';
  const parts = employee.full_name.trim().split(' ');
  if (parts.length < 2) return employee.full_name;
  const firstName     = parts[0];
  const lastNameShort = truncateLastName(parts[parts.length - 1]);
  const peers         = findSameLastNamePeers(employee, allEmployees);
  if (!peers.length) return `${firstName.substring(0, 1)}.${lastNameShort}`;
  const prefix = uniqueFirstNamePrefix(firstName, peers);
  return `${prefix}.${lastNameShort}`;
}
