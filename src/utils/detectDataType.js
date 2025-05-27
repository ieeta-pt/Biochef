/**
 * Detects the data type based on file name or content.
 * @param {string} fileName - Name of the file.
 * @param {string|object} content - Content of the file or object containing multiple outputs.
 * @returns {string} - Detected data type (e.g., 'FASTA', 'FASTQ', 'DNA', 'RNA', 'AminoAcids', 'TEXT', 'UNKNOWN').
 */
export const detectDataType = (fileName, content) => {
  // Handle object content (multiple outputs)
  if (typeof content === 'object' && content !== null) {
    // Try to detect type from the first output file
    const firstOutput = Object.values(content)[0];
    if (firstOutput) {
      return detectDataType(fileName, firstOutput);
    }
    return 'UNKNOWN';
  }

  // Handle string content
  if (typeof content !== 'string') {
    return 'UNKNOWN';
  }

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
    fastqpack: ['PackagedFASTQ'],
    pos: ['POS'],
    svg: ['SVG'],
    txt: ['Multi-FASTA', 'FASTA', 'FASTQ', 'PackagedFASTQ', 'DNA', 'RNA', 'AminoAcids', 'text', 'NUM', 'BIN', 'Group'], // Prioritize specific types
    num: ['NUM'],
    bin: ['BIN'],
    // Add more mappings if necessary
  };

  // Define regex patterns for new data types
  const dnaPattern = /^[ACGTNacgtn\s]+$/;
  const rnaPattern = /^[ACGUacgu\s]+$/;
  const aminoAcidsPattern = /^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy\s]+$/;
  const groupPattern = /^[PNUSH\*X]+$/i;

  // Function to count headers starting with '>'
  const countHeaders = (content) => {
    const lines = content.split(/\r?\n/);
    return lines.filter(line => line.startsWith('>')).length;
  };

  // Check based on file extension
  if (extensionToTypeMap[extension]) {
    for (const type of extensionToTypeMap[extension]) {
      switch (type) {
        case 'PackagedFASTQ':
          // Check if this is a packaged FASTQ file
          // Each line contains ESCAPE (ASCII 127) characters and ends with a tab followed by a number
          const lines = trimmedContent.split(/\r?\n/);

          // Check at least the first few lines to confirm pattern
          const isPackagedFastq = lines.slice(0, Math.min(5, lines.length)).every(line => {
            // Count escape characters (ASCII 127 or char code 127)
            const escapeCount = (line.match(/\x7F/g) || []).length;

            // Should have at least 3 escape characters and end with \t followed by a number
            return escapeCount >= 3 && /\t\d+$/.test(line);
          });

          if (isPackagedFastq && lines.length > 0) {
            return 'PackagedFASTQ';
          }
          break;

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

        case 'FASTQ':
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

  if (groupPattern.test(trimmedContent)) {
    return 'Group';
  }

  if (aminoAcidsPattern.test(trimmedContent)) {
    return 'AminoAcids';
  }

  if (/^[01\s\r\n]+$/.test(trimmedContent)) {
    return 'BIN';
  }

  if (/^\d+(\.\d+)?(\s+\d+(\.\d+)?)*/.test(trimmedContent)) {
    return 'NUM';
  }

  // Check if content is readable text (contains mostly printable ASCII characters)
  if (/^[\x20-\x7E\s\r\n]+$/.test(trimmedContent)) {
    return 'TEXT';
  }

  // Fallback to 'UNKNOWN' if the content doesn't match any known type or isn't readable text
  return 'UNKNOWN';
};