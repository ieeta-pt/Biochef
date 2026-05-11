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
          fastaLines.every(line => /^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy*.-]+$/.test(line.trim()));
        if (!isFASTAValid) {
          console.error('FASTA validation failed:', {
            startsWithGreaterThan: trimmedData.startsWith('>'),
            hasSequenceLines: fastaLines.length > 0,
            allSequencesValid: fastaLines.every(line => /^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy*.-]+$/.test(line.trim())),
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
            return /^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy*.-]+$/.test(sequence.trim());
          });
          if (!isMultiFastaValid) {
            console.error('Multi-FASTA validation failed.');
          }
          return isMultiFastaValid;
        }
        return false;

      case 'EFA':
        const efaSections = trimmedData
          .split(/(?=^<)/m)
          .map(section => section.trim())
          .filter(Boolean);
        const isEFAValid = efaSections.length > 0 && efaSections.every(section => {
          const sectionLines = section.split(/\r?\n/);
          if (!sectionLines[0].startsWith('<') || sectionLines.length < 3) return false;
          const fastaBlocks = sectionLines.slice(1).join('\n').split('>').slice(1);
          return fastaBlocks.length > 1 && fastaBlocks.every(block => {
            const lines = block.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) return false;
            const sequence = lines.slice(1).join('');
            return /^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy*.-]+$/.test(sequence.trim());
          });
        });
        if (!isEFAValid) {
          console.error('EFA validation failed.');
        }
        return isEFAValid;

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
            return /^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy]+$/.test(line.trim()) || /^[!-~]+$/.test(line.trim());
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

      case 'BIN':
        // Validation for BIN: binary data, no specific validation
        const isBINValid = /^[01\s\r\n]+$/.test(trimmedData);
        if (!isBINValid) {
          console.error('BIN validation failed.');
        }
        return isBINValid;

      case 'NUM':
        // Validation for NUM: all content is numeric, possibly separated by whitespace
        const isNUMValid = /^\d+(\.\d+)?(\s+\d+(\.\d+)?)*/.test(trimmedData);
        if (!isNUMValid) {
          console.error('NUM validation failed.');
        }
        return isNUMValid;

      case 'BED':
        const bedLines = trimmedData.split(/\r?\n/);
        const isBEDValid = bedLines.every(line => {
          if (line.startsWith('track') || line.startsWith('browser')) return true;
          const fields = line.split('\t');
          return fields.length >= 3 && !isNaN(fields[1]) && !isNaN(fields[2]);
        });
        if (!isBEDValid) {
          console.error('BED validation failed.');
        }
        return isBEDValid;

      case 'GFF':
        const gffLines = trimmedData.split(/\r?\n/);
        const isGFFValid = gffLines.every(line => {
          if (!line.trim() || line.startsWith('#')) return true;
          const fields = line.split('\t');
          if (fields.length !== 9) return false;

          const [, , , start, end, , strand, phase] = fields;
          return !isNaN(start) &&
            !isNaN(end) &&
            ['+', '-', '.'].includes(strand) &&
            ['0', '1', '2', '.'].includes(phase);
        });
        if (!isGFFValid) {
          console.error('GFF validation failed.');
        }
        return isGFFValid;

      case 'LIST':
        const listLines = trimmedData.split(/\r?\n/);
        const isLISTValid = listLines.every(line => {
          if (!line.trim()) return true;
          const seqId = line.split('\t')[0];
          return seqId && !seqId.includes(' ');
        });
        if (!isLISTValid) {
          console.error('LIST validation failed.');
        }
        return isLISTValid;

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

      case 'Group':
        // Validation for Group: only standard single-letter codes and whitespace
        const isGroupValid = /^[PNUSHpnush\*X]+$/.test(trimmedData);
        if (!isGroupValid) {
          console.error('Group validation failed.');
        }
        return isGroupValid;

      case 'AminoAcids':
        // Validation for AminoAcids: only standard single-letter codes and whitespace
        const isAminoAcidsValid = /^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy\s]+$/.test(trimmedData);
        if (!isAminoAcidsValid) {
          console.error('AminoAcids validation failed.');
        }
        return isAminoAcidsValid;

      case 'TEXT':
        // For TEXT type, validate that it contains only printable ASCII characters
        const isTextValid = /^[\x20-\x7E\s\r\n]+$/.test(trimmedData);
        if (!isTextValid) {
          console.error('TEXT validation failed: Contains non-printable or non-ASCII characters.');
        }
        return isTextValid;

      default:
        // For unhandled types, consider them invalid
        console.error('Validation failed: Unrecognized data type.');
        return false;
    }
  };

  return (
    <DataTypeContext.Provider value={{ dataType, setDataType, validateData, inputDataType, setInputDataType }}>
      {children}
    </DataTypeContext.Provider>
  );
};
