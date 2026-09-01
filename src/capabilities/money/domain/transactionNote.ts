export const TRANSACTION_NOTE_MAX_LENGTH = 500;

export function normalizeTransactionNote(value: string): string | null {
  const note = value.trim();
  if (note.length > TRANSACTION_NOTE_MAX_LENGTH) {
    throw new Error(`Keep the transaction note to ${TRANSACTION_NOTE_MAX_LENGTH} characters or fewer.`);
  }
  return note || null;
}
