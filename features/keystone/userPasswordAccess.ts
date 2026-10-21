/** The User password is a global login credential, so only its own identity may change it. */
export function canUpdateOwnPassword({ session, item }: {
  session?: { itemId?: string } | null;
  item?: { id?: { toString(): string } } | null;
}): boolean {
  return Boolean(session?.itemId && item?.id && session.itemId === String(item.id));
}
