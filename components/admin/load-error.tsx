/** Shown on admin pages when the database query fails, so the reason is visible without digging through logs. */
export function AdminLoadError({ err }: { err: unknown }) {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    <div className="admin-notice bad" role="alert">
      <b>Couldn&apos;t load this page.</b> The database said: {msg}
    </div>
  );
}
