/** Remove only obsolete plaintext registration drafts, never sessions or app data. */
export function clearLegacyRegistrationCredentials(storage: Pick<Storage,"removeItem">) {
  for (const key of ["register_step1","diversibebe_register_step1"]) {
    try { storage.removeItem(key); } catch { /* Storage may be disabled by the browser. */ }
  }
}
