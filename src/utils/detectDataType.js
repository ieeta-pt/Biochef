/**
 * Detects the data type based on file name or content.
 * @param {string} fileName - Name of the file.
 * @param {string} content - Content of the file.
 * @returns {string} - Detected data type (e.g., 'FASTA', 'FASTQ', 'DNA', 'RNA', 'AminoAcids', 'UNKNOWN').
 */
export const detectDataType = (fileName, content) => {
  // Trim content to remove leading/trailing whitespace
  const trimmedContent = content.trim();

  // Check file extension
  const extension = fileName.split('.').pop().toLowerCase();

  // Define mapping of extensions to possible data types
  const extensionToTypeMap = {
    fasta: ['Multi-FASTA', 'FASTA'],
    fa: ['Multi-FASTA', 'FASTA'],
    fastq: ['FASTQ'],
    fq: ['FASTQ'],
    pos: ['POS'],
    svg: ['SVG'],
    txt: ['Multi-FASTA', 'FASTA', 'DNA', 'RNA', 'AminoAcids', 'text'], // Prioritize specific types
    num: ['NUM'],
    // Add more mappings if necessary
  };

  // Define regex patterns for new data types
  const dnaPattern = /^[ACGTacgt\s]+$/;
  const rnaPattern = /^[ACGUacgu\s]+$/;
  const aminoAcidsPattern = /^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy\s]+$/;

  // Function to count headers starting with '>'
  const countHeaders = (content) => {
    const lines = content.split(/\r?\n/);
    return lines.filter(line => line.startsWith('>')).length;
  };

  // Check based on file extension
  if (extensionToTypeMap[extension]) {
    for (const type of extensionToTypeMap[extension]) {
      switch (type) {
        case 'Multi-FASTA':
          if (trimmedContent.startsWith('>')) {
            const headers = countHeaders(trimmedContent);
            if (headers >= 2) {
              const fastaBlocks = trimmedContent.split('>').slice(1); // Split and ignore the first empty element
              const isValid = fastaBlocks.every(block => {
                const lines = block.split(/\r?\n/).filter(line => line.trim() !== '');
                const sequence = lines.slice(1).join('');
                // Allow sequences with A, C, G, T, N (case-insensitive)
                return lines.length > 1 && /^[ACGTacgtNn]+$/.test(sequence.trim());
              });
              if (isValid) {
                return 'Multi-FASTA';
              }
            }
          }
          break;

        case 'FASTA':
          if (trimmedContent.startsWith('>')) {
            const headers = countHeaders(trimmedContent);
            if (headers === 1) {
              const lines = trimmedContent.split(/\r?\n/).filter(line => !line.startsWith('>'));
              const isValid = lines.length > 0 && lines.every(line => /^[ACGTacgtNn]+$/.test(line.trim()));
              if (isValid) {
                return 'FASTA';
              }
            }
          }
          break;

        case 'FASTQ':             // Fix this
          if (trimmedContent.startsWith('@')) {
            const lines = trimmedContent.split(/\r?\n/);
            if (
              lines.length >= 4 &&
              lines.length % 4 === 0 &&
              lines.every((line, index) => {
                if (index % 4 === 0) return line.startsWith('@');
                if (index % 4 === 2) return line.startsWith('+');
                // Lines 1 and 3 should contain sequence and quality scores respectively
                return /^[ACGTacgtNn]+$/.test(line.trim()) || /^[!-~]+$/.test(line.trim());
              })
            ) {
              return 'FASTQ';
            }
          }
          break;

        // Add more cases as needed
        default:
          break;
      }
    }
  }

  // Check content directly if no extension matches or specific type wasn't detected
  if (trimmedContent.startsWith('<svg')) {
    return 'SVG';
  }

  // Additional detections for new data types
  if (dnaPattern.test(trimmedContent)) {
    return 'DNA';
  }
  if (rnaPattern.test(trimmedContent)) {
    return 'RNA';
  }
  if (aminoAcidsPattern.test(trimmedContent)) {
    return 'AminoAcids';
  }

  if (/^\d+(\.\d+)?(\s+\d+(\.\d+)?)*/.test(trimmedContent)) {
    return 'NUM';
  }

  // Fallback to 'UNKNOWN' if no type matches
  return 'UNKNOWN';
};