export function makeTextDataValue(data) {
  return { kind: "text", data: data ?? "" };
}

export function makeBinaryDataValue(data) {
  return { kind: "binary", data };
}

export function isDataValue(value) {
  return value && typeof value === "object" && "kind" in value && "data" in value;
}