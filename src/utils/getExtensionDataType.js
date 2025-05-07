/**
 * Maps data types to appropriate file extensions
 */
export const typeToExtensionMap = {
    'FASTA': '.fasta',
    'Multi-FASTA': '.fasta',
    'FASTQ': '.fastq',
    'DNA': '.txt',
    'RNA': '.txt',
    'AminoAcids': '.txt',
    'SVG': '.svg',
    'POS': '.pos',
    'NUM': '.txt',
    'UNKNOWN': '.txt'
};

/**
 * Gets the appropriate extension for a given data type
 * @param {string} dataType - The data type
 * @returns {string} - The file extension (including the dot)
 */
export const getExtensionForType = (dataType) => {
    return typeToExtensionMap[dataType] || '.txt';
};