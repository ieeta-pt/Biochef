// --- Binary detection -------------------------------------------------------
// Magic bytes for the binary HTS formats Biochef can carry through edges.
// BGZF wraps BAM, BCF, indexed VCFs, and tabix indexes; the inner type comes
// from filename extension or the recipe's declared output type.

const BINARY_MAGIC = {
  BGZF: [0x1f, 0x8b, 0x08, 0x04],   // BAM, BCF, .gz/.bgz, .tbi all start here
  BAI:  [0x42, 0x41, 0x49, 0x01],   // "BAI\x01"
  CSI:  [0x43, 0x53, 0x49, 0x01],   // "CSI\x01"
  CRAM: [0x43, 0x52, 0x41, 0x4d],   // "CRAM"
  MMI:  [0x4d, 0x4d, 0x49, 0x02],   // "MMI\x02"
};

function startsWith(bytes, magic) {
  if (!bytes || bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) if (bytes[i] !== magic[i]) return false;
  return true;
}

const BINARY_EXTENSIONS = {
  ".bam": "BAM",
  ".bcf": "BCF",
  ".cram": "CRAM",
  ".bai": "BIN",
  ".csi": "BIN",
  ".tbi": "BIN",
  ".gzi": "BIN",
  ".mmi": "BIN",
  ".fai": "BIN",
  ".gz":  "BIN",
  ".bgz": "BIN",
};

export function detectBinaryType(bytes, fileName = "") {
  // Extension wins when present, since the recipe-declared type is more
  // reliable than sniffing the bytes.
  const lower = fileName.toLowerCase();
  for (const [ext, type] of Object.entries(BINARY_EXTENSIONS)) {
    if (lower.endsWith(ext)) return type;
  }
  // Otherwise sniff magic bytes.
  if (startsWith(bytes, BINARY_MAGIC.BAI))  return "BIN";
  if (startsWith(bytes, BINARY_MAGIC.CSI))  return "BIN";
  if (startsWith(bytes, BINARY_MAGIC.CRAM)) return "CRAM";
  if (startsWith(bytes, BINARY_MAGIC.MMI))  return "BIN";
  if (startsWith(bytes, BINARY_MAGIC.BGZF)) return "BIN";  // could be BAM/BCF/TBI; caller must refine
  return "BIN";
}

export function isLikelyBinaryFile(fileName = "") {
  const lower = fileName.toLowerCase();
  return Object.keys(BINARY_EXTENSIONS).some(ext => lower.endsWith(ext));
}

// --- Text detection (existing) ----------------------------------------------

function validateFasta(content) {
  const lines = content?.trim().split('\n');
  if (!lines || lines[0][0] !== '>') return false;

  const sequence = lines.slice(1).join('').trim();
  return sequence && /^[A-Z\s]+$/i.test(sequence);
}

function validateMultiFasta(content) {
  if (!content) return false
  
  const headerCount = (content.match(/>/g) || []).length;
  const entries = content.split('>').filter(entry => entry.trim());
  if (headerCount !== entries.length) {
    return false;
  }
  return entries.every(entry => validateFasta('>' + entry.trim()));
}

function validateFastq(content) {
  const lines = content?.trim().split('\n');

  if (lines.length % 4 !== 0) return false;

  for (let i = 0; i < lines.length; i += 4) {
    const header = lines[i].trim();
    const sequence = lines[i + 1].trim();
    const plusLine = lines[i + 2].trim();
    const quality = lines[i + 3].trim();

    if (header[0] !== '@' || plusLine[0] !== '+') {
      return false;
    }

    if (!/^[A-Z\s]+$/i.test(sequence)) {
      return false;
    }

    if (!/^[\x21-\x7E]+$/.test(quality)) {
      return false;
    }
  }

  return true;
}

function validateDNA(content) {
  return /^[ACGTN]+$/i.test(content.trim());
}

function validateRNA(content) {
  return /^[ACGUN]+$/i.test(content.trim());
}

function validateAminoAcids(content) {
  return /^[ACDEFGHIKLMNPQRSTUVWY-]+$/i.test(content.trim());
}

function validatePackagedFastq(content) {
  // ???????
}

function validateNum(content) {
  const lines = content.trim().split('\n');

  return lines.every(line => /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(line.trim()));
}

function validateBin(content) {
  const lines = content.trim().split('\n');

  return lines.every(line => /^[01]+$/.test(line.trim()));
}

export function detectFileType(fileName, content) {

}

// these are in order of priority
const allTypes = [
  { type: 'FASTA', validator: validateFasta },
  { type: 'Multi-FASTA', validator: validateMultiFasta },
  { type: 'FASTQ', validator: validateFastq },
  { type: 'Packaged FASTQ', validator: validatePackagedFastq },
  { type: 'NUM', validator: validateNum },
  { type: 'BIN', validator: validateBin },
  { type: 'DNA', validator: validateDNA },
  { type: 'RNA', validator: validateRNA },
  { type: 'AminoAcids', validator: validateAminoAcids },
  { type: 'TEXT', validator: () => true }, // Default fallback for TEXT
];

// Function to detect data type with priority from the allowed types
export function detectDataType(data, allowed = []) {
  if (typeof data !== 'string') {
    return 'UNKNOWN';
  }

  // first check with the types in allowed
  for (let { type, validator } of allTypes) {
    if (allowed.includes(type) && validator(data)) {
      return type;
    }
  }

  // then, check the rest
  for (let { type, validator } of allTypes) {
    if (!allowed.includes(type) && validator(data)) {
      return type;
    }
  }

  return 'UNKNOWN';
}