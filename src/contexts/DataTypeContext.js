import React, { createContext, useState } from 'react';

export const DataTypeContext = createContext();

/**
 * Provides the current data type and functions to update and validate it.
 */
export const DataTypeProvider = ({ children }) => {
  const [dataType, setDataType] = useState('UNKNOWN');
  const [inputDataType, setInputDataType] = useState('UNKNOWN');

  /**
   * Validates the data based on the detected data type.
   * @param {string} data - The data to validate.
   * @param {string} type - The detected data type.
   * @returns {boolean} - True if data is valid for the detected type, else false.
   */
  const validateData = (data, type) => {
    const trimmedData = data.trim();

    switch (type) {
      case 'FASTA':
        // Validation for FASTA: starts with '>' and contains valid sequence lines
        const fastaLines = trimmedData.split(/\r?\n/).filter(line => !line.startsWith('>'));
        const isFASTAValid =
          trimmedData.startsWith('>') &&
          fastaLines.length > 0 &&
          fastaLines.every(line => /^[ACGTacgtNn]+$/.test(line.trim())); // Allowing 'N' and 'n'
        if (!isFASTAValid) {
          console.error('FASTA validation failed:', {
            startsWithGreaterThan: trimmedData.startsWith('>'),
            hasSequenceLines: fastaLines.length > 0,
            allSequencesValid: fastaLines.every(line => /^[ACGTacgtNn]+$/.test(line.trim())),
          });
        }
        return isFASTAValid;

      case 'Multi-FASTA':
        // Validation for Multi-FASTA: multiple headers and valid sequences
        const headers = trimmedData.match(/>[^>\n]+/g);
        if (headers && headers.length > 1) {
          const fastaBlocks = trimmedData.split('>').slice(1); // Split and ignore the first empty element
          const isMultiFastaValid = fastaBlocks.every(block => {
            const lines = block.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) return false; // At least one header and one sequence line
            const sequence = lines.slice(1).join('');
            return /^[ACGTacgtNn]+$/.test(sequence.trim()); // Allowing 'N' and 'n'
          });
          if (!isMultiFastaValid) {
            console.error('Multi-FASTA validation failed.');
          }
          return isMultiFastaValid;
        }
        return false;

      case 'PackagedFASTQ':
        // Validation for PackagedFASTQ: lines contain ESCAPE characters and end with tab+number
        const packagedLines = trimmedData.split(/\r?\n/);
        const isPackagedFASTQValid = packagedLines.length > 0 &&
          packagedLines.every(line => {
            // Count escape characters (ASCII 127 or char code 127)
            const escapeCount = (line.match(/\x7F/g) || []).length;
            // Each packaged FASTQ line should have at least 3 escape characters 
            // and end with a tab followed by a number (index)
            return escapeCount >= 3 && /\t\d+$/.test(line);
          });
        if (!isPackagedFASTQValid) {
          console.error('PackagedFASTQ validation failed.');
        }
        return isPackagedFASTQValid;

      case 'FASTQ':
        // Validation for FASTQ: starts with '@' and follows FASTQ format structure
        const lines = trimmedData.split(/\r?\n/);
        const isFASTQValid =
          trimmedData.startsWith('@') &&
          lines.length >= 4 &&
          lines.length % 4 === 0 &&
          lines.every((line, index) => {
            if (index % 4 === 0) return line.startsWith('@');
            if (index % 4 === 2) return line.startsWith('+');
            // Lines 1 and 3 should contain sequence and quality scores respectively
            return /^[ACGTacgtNn]+$/.test(line.trim()) || /^[!-~]+$/.test(line.trim());
          });
        if (!isFASTQValid) {
          console.error('FASTQ validation failed.');
        }
        return isFASTQValid;

      case 'POS':
        // Validation for POS: lines containing numeric position data
        const posLines = trimmedData.split(/\r?\n/);
        const isPOSValid = posLines.every(line => /^\d+(\.\d+)?\s+\d+(\.\d+)?$/.test(line.trim()));
        if (!isPOSValid) {
          console.error('POS validation failed.');
        }
        return isPOSValid;

      case 'SVG':
        // Validation for SVG: starts with '<svg' tag
        const isSVGValid = trimmedData.startsWith('<svg');
        if (!isSVGValid) {
          console.error('SVG validation failed.');
        }
        return isSVGValid;

      case 'NUM':
        // Validation for NUM: all content is numeric, possibly separated by whitespace
        const isNUMValid = /^\d+(\.\d+)?(\s+\d+(\.\d+)?)*/.test(trimmedData);
        if (!isNUMValid) {
          console.error('NUM validation failed.');
        }
        return isNUMValid;

      case 'DNA':
        // Validation for DNA: only A, C, G, T (case-insensitive) and whitespace
        const isDNAValid = /^[ACGTNacgtn\s]+$/.test(trimmedData);
        if (!isDNAValid) {
          console.error('DNA validation failed.');
        }
        return isDNAValid;

      case 'RNA':
        // Validation for RNA: only A, C, G, U (case-insensitive) and whitespace
        const isRNAValid = /^[ACGUacgu\s]+$/.test(trimmedData);
        if (!isRNAValid) {
          console.error('RNA validation failed.');
        }
        return isRNAValid;

      case 'AminoAcids':
        // Validation for AminoAcids: only standard single-letter codes and whitespace
        const isAminoAcidsValid = /^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy\s]+$/.test(trimmedData);
        if (!isAminoAcidsValid) {
          console.error('AminoAcids validation failed.');
        }
        return isAminoAcidsValid;

      case 'text':
        // For text, any non-empty string is considered valid
        const isTextValid = trimmedData.length > 0;
        if (!isTextValid) {
          console.error('Text validation failed: Input is empty.');
        }
        return isTextValid;

      default:
        // For UNKNOWN or unhandled types, consider them invalid
        console.error('Validation failed: Unknown data type.');
        return false;
    }
  };

  return (
    <DataTypeContext.Provider value={{ dataType, setDataType, validateData, inputDataType, setInputDataType }}>
      {children}
    </DataTypeContext.Provider>
  );
};