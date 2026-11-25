/** Saves a file for a spreadsheet, the way a browser does. */
export async function shareCsv(name: string, text: string): Promise<boolean> {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
