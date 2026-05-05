// IndexedDB-backed blob store for binary edge values.
//
// localStorage can only hold strings, and JSON.stringify on a Uint8Array
// silently drops the bytes. So instead of trying to embed binary into the
// workflow JSON, we stash the bytes here and put a {kind:"binary-ref", type,
// ref:"<id>"} marker in their place. The load path swaps the marker back for
// real bytes.

const DB_NAME = "biochef";
const DB_VERSION = 1;
const STORE = "blobs";

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function tx(db, mode = "readonly") {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function genId() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function putBlob(bytes, type = "BIN") {
  const db = await openDB();
  const id = genId();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readwrite").put({ id, bytes, type, createdAt: Date.now() });
    req.onsuccess = () => resolve(id);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function getBlob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteBlob(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readwrite").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function listIds() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

// Drop blobs whose ids are not in `keepIds`.
export async function gcBlobs(keepIds) {
  const ids = await listIds();
  const keep = new Set(keepIds);
  await Promise.all(ids.filter(id => !keep.has(id)).map(id => deleteBlob(id)));
}
