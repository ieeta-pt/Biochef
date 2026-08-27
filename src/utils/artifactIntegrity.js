const SHA256_DIGEST_PATTERN = /^sha256:([a-f0-9]{64})$/i;

function normaliseSha256Digest(expectedDigest) {
  if (typeof expectedDigest !== "string") {
    throw new Error("Missing expected SHA-256 digest");
  }

  const match = expectedDigest.match(SHA256_DIGEST_PATTERN);
  if (!match) {
    throw new Error(`Unsupported artifact digest format: ${expectedDigest}`);
  }

  return match[1].toLowerCase();
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(arrayBuffer) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto digest API is not available");
  }

  const digest = await globalThis.crypto.subtle.digest("SHA-256", arrayBuffer);
  return bytesToHex(new Uint8Array(digest));
}

export async function verifySha256Digest(arrayBuffer, expectedDigest, artifactLabel = "artifact") {
  const expectedHex = normaliseSha256Digest(expectedDigest);
  const actualHex = await sha256Hex(arrayBuffer);

  if (actualHex !== expectedHex) {
    throw new Error(
      `${artifactLabel} digest mismatch: expected sha256:${expectedHex}, got sha256:${actualHex}`
    );
  }

  return `sha256:${actualHex}`;
}
