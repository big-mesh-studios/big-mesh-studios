// Debugging aid for the OAuth popup flow: dumps every store in the
// `@atproto/oauth-client-browser` IndexedDB database (state, session, and
// the various caches) so a login attempt's state can be inspected between
// steps — e.g. right after the popup opens vs. after it redirects back —
// without needing to click through DevTools by hand.
const DB_NAME = "@atproto-oauth-client";
const STORES = [
  "state",
  "session",
  "didCache",
  "dpopNonceCache",
  "handleCache",
  "authorizationServerMetadataCache",
  "protectedResourceMetadataCache",
];

const safePreview = (value: unknown): string => {
  try {
    const json = JSON.stringify(value, (_key, v) =>
      v instanceof CryptoKey ? "[CryptoKey]" : v,
    );
    return json === undefined
      ? String(value)
      : json.length > 200
        ? `${json.slice(0, 200)}…`
        : json;
  } catch (err) {
    return `<unserializable: ${err instanceof Error ? err.message : String(err)}>`;
  }
};

/** Dumps every store's keys and a truncated preview of each value, as a single formatted string. */
export const dumpOAuthDatabase = (): Promise<string> => {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME);
    req.onerror = () => resolve(`failed to open "${DB_NAME}": ${req.error}`);
    req.onsuccess = () => {
      const db = req.result;
      const stores = STORES.filter((s) => db.objectStoreNames.contains(s));
      if (stores.length === 0) {
        db.close();
        resolve(`"${DB_NAME}" (v${db.version}): no known object stores found`);
        return;
      }
      const tx = db.transaction(stores, "readonly");
      const lines: string[] = [`${DB_NAME} (v${db.version}):`];
      let pending = stores.length;
      for (const name of stores) {
        const store = tx.objectStore(name);
        const keysReq = store.getAllKeys();
        const valsReq = store.getAll();
        keysReq.onsuccess = () => {
          valsReq.onsuccess = () => {
            const keys = keysReq.result;
            const vals = valsReq.result;
            if (keys.length === 0) {
              lines.push(`  ${name}: (empty)`);
            } else {
              lines.push(`  ${name}: ${keys.length} entrie(s)`);
              for (let i = 0; i < keys.length; i++) {
                lines.push(`    ${String(keys[i])} -> ${safePreview(vals[i])}`);
              }
            }
            pending -= 1;
            if (pending === 0) {
              db.close();
              resolve(lines.join("\n"));
            }
          };
        };
      }
    };
  });
};
