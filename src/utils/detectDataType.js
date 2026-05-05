import { getTypeDefinitions } from './typeDefinitions';

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

function validateBed(content) {
  if (!content) return false;
  const lines = content.trim().split('\n');
  return lines.every(line => {
    if (line.startsWith('track') || line.startsWith('browser')) return true;
    const fields = line.split('\t');
    return fields.length >= 3 && !isNaN(fields[1]) && !isNaN(fields[2]);
  });
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

const validators = {
  fasta: validateFasta,
  multiFasta: validateMultiFasta,
  fastq: validateFastq,
  packagedFastq: validatePackagedFastq,
  num: validateNum,
  bin: validateBin,
  dna: validateDNA,
  rna: validateRNA,
  aminoAcids: validateAminoAcids,
  bed: validateBed,
  list: validateList,
  text: () => true, // Default fallback for TEXT
};

// these are in order of priority
const allTypes = getTypeDefinitions()
  .map(typeDef => ({
    type: typeDef.id,
    validator: validators[typeDef.validator],
  }))
  .filter(typeDef => typeDef.validator);

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

export function detectAllDataTypes(data) {
  if (typeof data !== 'string' || data == "") {
    return [];
  }

  const matches = [];

  for (let { type, validator } of allTypes) {
    if (validator(data)) {
      matches.push(type);
    }
  }

  return matches;
}
