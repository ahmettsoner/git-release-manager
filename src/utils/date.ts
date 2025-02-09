/**
 * Converts a date string from the format 'YYYY-MM-DD HH:mm:ss ±HHMM' to ISO 8601 format.
 *
 * @param dateStr - The date string to be converted, e.g., '2025-01-07 16:57:38 +0300'.
 * @returns The date string in ISO 8601 format, e.g., '2025-01-07T16:57:38+03:00'.
 */
export function formatISO8601(dateStr: string): string {
    const [datePart, timePart, offset] = dateStr.split(' ')
    const parsedDate = new Date(`${datePart}T${timePart}${offset}`)

    return parsedDate.toISOString()
}

export function formatDateForGit(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toISOString()
}
