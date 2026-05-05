// Tagged-union shape for edge values. Lets the runtime tell text from binary
// without sniffing the data. Bare strings still flow through; unwrap promotes
// them to a text DataValue at the boundary.
//
//   { kind: "text",   type: "FASTA",    data: "..." }
//   { kind: "binary", type: "BAM",      data: Uint8Array }

export const BINARY_TYPES = new Set(["BAM", "BCF", "CRAM", "BIN"]);

export function isBinaryType(type) {
  return BINARY_TYPES.has(type);
}

// True if the recipe's declared type list is binary-only, i.e. the runtime
// must read the wasm-FS file as bytes rather than UTF-8.
export function isBinaryDeclaredTypes(declaredTypes) {
  if (!Array.isArray(declaredTypes) || declaredTypes.length === 0) return false;
  return declaredTypes.every(isBinaryType);
}

export function makeText(data, type = "TEXT") {
  return { kind: "text", type, data: data ?? "" };
}

export function makeBinary(data, type = "BIN") {
  return { kind: "binary", type, data };
}

// Accept legacy bare-string edge values; promote to a text DataValue.
export function unwrap(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return makeText(value);
  if (typeof value === "object") {
    // Stale persistence markers (hydration failed or imported file with
    // stripped binary) carry no usable data, so return null and let the
    // runtime skip them.
    if (value.kind === "binary-ref" || value.kind === "binary-stripped") return null;
    if ("kind" in value && "data" in value) return value;
  }
  return makeText(String(value));
}

export function isDataValue(value) {
  return value && typeof value === "object" && "kind" in value && "data" in value;
}

// Marker that goes into workflow JSON in place of a binary DataValue while the
// actual bytes sit in IndexedDB. The load path rehydrates these back into real
// DataValues; without this swap, JSON.stringify would silently corrupt the
// Uint8Array.
export function isBinaryRef(value) {
  return value && typeof value === "object" && value.kind === "binary-ref" && typeof value.ref === "string";
}

export function makeBinaryRef(ref, type = "BIN") {
  return { kind: "binary-ref", type, ref };
}
