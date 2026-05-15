import { isDataValue } from './dataValue';
import logger from './logger';
import { getTypeDefinitions, isTypeBinary } from './typeDefinitions';

const BINARY_MAGIC = {
  BGZF: [0x1f, 0x8b, 0x08, 0x04],   // BAM, BCF, .gz/.bgz, .tbi all start here
  BAI: [0x42, 0x41, 0x49, 0x01],   // "BAI\x01"
  CSI: [0x43, 0x53, 0x49, 0x01],   // "CSI\x01"
  CRAM: [0x43, 0x52, 0x41, 0x4d],   // "CRAM"
  MMI: [0x4d, 0x4d, 0x49, 0x02],   // "MMI\x02"
};

function validateFasta(content) {
  const lines = content?.trim().split('\n');
  if (!lines || lines[0][0] !== '>') return false;

  const sequence = lines.slice(1).join('').trim();
  return sequence && /^[A-Z*.\-\s]+$/i.test(sequence);
}

function validateMultiFasta(content) {
  if (!content) return false

  const headerCount = (content.match(/>/g) || []).length;
  if (headerCount == 0) return false

  const entries = content.split('>').filter(entry => entry.trim());
  if (headerCount !== entries.length) {
    return false;
  }
  return entries.every(entry => validateFasta('>' + entry.trim()));
}

function validateEfa(content) {
  if (!content) return false;

  const sections = content
    .split(/(?=^<)/m)
    .map(section => section.trim())
    .filter(Boolean);

  if (!sections.length) return false;

  return sections.every(section => {
    const lines = section.split(/\r?\n/);
    if (!lines[0].startsWith('<') || lines.length < 3) return false;
    return validateMultiFasta(lines.slice(1).join('\n'));
  });
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

function validateBed(content) {
  if (!content) return false;
  const lines = content.trim().split('\n');
  return lines.every(line => {
    if (line.startsWith('track') || line.startsWith('browser')) return true;
    const fields = line.split('\t');
    return fields.length >= 3 && !isNaN(fields[1]) && !isNaN(fields[2]);
  });
}

function validateGff(content) {
  if (!content) return false;
  const lines = content.trim().split('\n');
  return lines.every(line => {
    if (!line.trim() || line.startsWith('#')) return true;
    const fields = line.split('\t');
    if (fields.length !== 9) return false;

    const [, , , start, end, , strand, phase] = fields;
    return !isNaN(start) &&
      !isNaN(end) &&
      ['+', '-', '.'].includes(strand) &&
      ['0', '1', '2', '.'].includes(phase);
  });
}

function validateVcf(content) {
  if (!content) return false;
  const lines = content.trim().split(/\r?\n/);
  let headerFound = false;

  for (const line of lines) {
    if (line.startsWith('##')) continue;

    if (line.startsWith('#CHROM')) {
      headerFound = true;
      if (line.trim().split(/\s+/).length < 8) return false;
      continue;
    }

    if (!headerFound) return false;

    const fields = line.trim().split(/\s+/);
    if (fields.length < 8) return false;

    const [, pos, , ref, alt, qual] = fields;
    if (!/^\d+$/.test(pos)) return false;
    if (!/^[ACGTN]+$/i.test(ref)) return false;
    if (!alt.split(',').every(a => /^[ACGTN]+$/i.test(a))) return false;
    if (qual !== '.' && !/^\d+(\.\d+)?$/.test(qual)) return false;
  }

  return headerFound;
}

function validateList(content) {
  if (!content.trim()) return false;
  const lines = content.split('\n');
  return lines.every(line => {
    if (!line.trim()) return true;
    const seqId = line.split('\t')[0];
    return seqId && !seqId.includes(' ');
  });
}

function validateSam(content) {
  if (!content) {
    return false;
  }

  const lines = content.trim().split('\n');

  for (const line of lines) {
    // header lines
    if (line.startsWith('@')) {
      continue;
    }

    const fields = line.split('\t');

    if (fields.length < 11) {
      return false;
    }

    const qname = fields[0];
    const flag = fields[1];
    const rname = fields[2];
    const pos = fields[3];

    // check numeric fields
    if (!/^\d+$/.test(flag)) {
      return false;
    }

    if (!/^\d+$/.test(pos)) {
      return false;
    }
  }

  return true;
}

function validateBinWithMagic(content, magic) {
  if (!content) {
    return false;
  }

  if (content.length < 2) {
    return false;
  }

  for (let i = 0; i < magic.length; i++) {
    if (content[i] != magic[i]) {
      return false
    }
  }

  return true
}

function validateBam(content) {
  return validateBinWithMagic(content, BINARY_MAGIC.BGZF)
}

function validateCram(content) {
  return validateBinWithMagic(content, BINARY_MAGIC.CRAM)
}

function validateBai(content) {
  return validateBinWithMagic(content, BINARY_MAGIC.BAI)
}

function validateMmi(content) {
  return validateBinWithMagic(content, BINARY_MAGIC.MMI)
}

function validateJson(content) {
  if (!content?.trim()) return false;

  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

function validateFai(content) {
  if (!content || !content.trim()) return false;

  const lines = content.trim().split(/\r?\n/);
  
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 5) return false;

    const [seqName, length, offset, lineBases, lineWidth] = parts;

    // sequence name should be non-empty
    if (!seqName || !seqName.trim()) return false;

    // numeric fields must be digits
    if (![length, offset, lineBases, lineWidth].every(p => /^\d+$/.test(p))) {
      return false;
    }
  }

  return true;
}

const validators = {
  fasta: validateFasta,
  multiFasta: validateMultiFasta,
  efa: validateEfa,
  fastq: validateFastq,
  packagedFastq: validatePackagedFastq,
  num: validateNum,
  bin: validateBin,
  dna: validateDNA,
  rna: validateRNA,
  aminoAcids: validateAminoAcids,
  bed: validateBed,
  gff: validateGff,
  vcf: validateVcf,
  list: validateList,
  sam: validateSam,
  bam: validateBam,
  cram: validateCram,
  bai: validateBai,
  mmi: validateMmi,
  fai: validateFai,
  json: validateJson,
  text: () => true, // Default fallback for TEXT
};

// these are in order of priority
const allTypes = getTypeDefinitions()
  .map(typeDef => ({
    type: typeDef.id,
    validator: validators[typeDef.validator],
  }))
  .filter(typeDef => typeDef.validator);

export function detectDataType(dataValue, allowed = []) {
  return matchType(dataValue, { allowed })
}

export function detectAllDataTypes(dataValue) {
  return matchType(dataValue, { returnAll: true })
}

function matchType(dataValue, { allowed = [], returnAll = false }) {
  const results = []

  if (!isDataValue(dataValue)) {
    return returnAll ? [] : "UNKNOWN"
  }

  for (const { type, validator } of allTypes) {
    if (isTypeBinary(type) && dataValue.kind !== "binary") continue
    if (!isTypeBinary(type) && dataValue.kind === "binary") continue

    if (!validator(dataValue.data)) continue

    const isAllowed = allowed.includes(type) ? 1 : 0
    results.push({ type, isAllowed })
  }

  if (results.length === 0) {
    return returnAll ? [] : "UNKNOWN"
  }

  results.sort((a, b) => b.isAllowed - a.isAllowed)

  if (returnAll) {
    return results.map(r => r.type)
  }

  return results[0].type
}

export function detectIsBinaryFile(bytes) {
  function startsWith(bytes, magic) {
    if (!bytes || bytes.length < magic.length) return false;
    for (let i = 0; i < magic.length; i++) if (bytes[i] !== magic[i]) return false;
    return true;
  }

  if (startsWith(bytes, BINARY_MAGIC.BAI)) return true
  if (startsWith(bytes, BINARY_MAGIC.CSI)) return true
  if (startsWith(bytes, BINARY_MAGIC.CRAM)) return true
  if (startsWith(bytes, BINARY_MAGIC.MMI)) return true
  if (startsWith(bytes, BINARY_MAGIC.BGZF)) return true
  return false
}
