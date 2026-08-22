/**
 * Hands a built .ics string to the browser as a file download. Shared by the
 * almanac's full-calendar export and the shrine page's single-shrine export
 * so the blob/anchor dance lives in exactly one place.
 */
export function downloadIcsFile(ics: string, filename: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
