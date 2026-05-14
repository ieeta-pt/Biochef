export function makeTextDataValue(data) {
  return { kind: "text", data: data ?? "" };
}

export function makeBinaryDataValue(data) {
  return { kind: "binary", data };
}

export function makeReferenceDataValue(data) {
  return { kind: "reference", data };
}

export function isDataValue(value) {
  return value && typeof value === "object" && "kind" in value && "data" in value;
}

export function dataValueToString(dataValue) { 
  if (!dataValue || !isDataValue(dataValue)) return ""

  if (dataValue.kind == "binary") {
    return `[binary ${dataValue.data.length ?? 0} bytes]`
  }
  else if (dataValue.kind == "text") {
    return dataValue.data
  }

  return ""
}