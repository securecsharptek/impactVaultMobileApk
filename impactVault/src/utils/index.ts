export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

/** Returns today's date as YYYY-MM-DD in the device's local timezone. */
export function todayLocal(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Returns the given Date as YYYY-MM-DD in the device's local timezone. */
export function toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}