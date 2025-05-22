import { detectDataType } from './detectDataType';

// Define acceptable file extensions
export const acceptableExtensions = ['.fasta', '.fa', '.fastq', '.fq', '.pos', '.svg', '.txt', '.num'];

const readFirstNLines = (file, maxLines = 100) => {
    return new Promise((resolve, reject) => {
        let lineCount = 0;
        let result = '';

        // Create a FileReader to read the file
        const reader = new FileReader();
        const chunkSize = 64 * 1024; // 64KB chunks
        let offset = 0;

        const readNextChunk = () => {
            // Stop reading once maxLines is reached or end-of-file is encountered
            if (lineCount >= maxLines || offset >= file.size) {
                // Split the accumulated text into lines for post processing
                const lines = result.split('\n');

                // Check if there is more than one header line — if so, treat as multi-FASTA
                const headerCount = lines.filter(line => line.trim().startsWith('>')).length;

                // If multi-FASTA and the last line is an orphan header, discard it
                if (headerCount > 1 && lines.length && lines[lines.length - 1].trim().startsWith('>')) {
                    lines.pop();
                    result = lines.join('\n');
                }
                resolve(result);
                return;
            }

            // Read the next chunk of text
            const chunk = file.slice(offset, offset + chunkSize);
            reader.readAsText(chunk);
        };

        reader.onload = (e) => {
            const chunkText = e.target.result;
            const lines = chunkText.split('\n');

            // If the previously accumulated chunk did not end with a newline,
            // merge the first line of this chunk with the tail end of the previous one.
            if (offset > 0 && result.endsWith('\n') === false) {
                const lastNewline = result.lastIndexOf('\n');
                result = result.slice(0, lastNewline + 1) +
                    result.slice(lastNewline + 1) + lines[0];
                lines.shift(); // Remove the merged line from this chunk.
            }

            // Add lines until we've reached maxLines
            for (let i = 0; i < lines.length && lineCount < maxLines; i++) {
                if (lineCount > 0 || offset > 0) {
                    result += '\n';
                }
                result += lines[i];
                lineCount++;
            }

            offset += chunkSize;
            readNextChunk();
        };

        reader.onerror = () => {
            reject(new Error('Error reading file'));
        };

        // Start reading the file
        readNextChunk();
    });
};

export const processFile = async (file, validateData, showNotification) => {
    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!acceptableExtensions.includes(extension)) {
        showNotification(`Unsupported file ${file.name} with type ${extension}.`, 'error');
        return null;
    }

    const fileSizeLimit = 1 * 1024 * 1024; // 1MB limit
    const isPartial = file.size > fileSizeLimit;

    try {
        let content;

        if (isPartial) {
            showNotification(`The file ${file.name} is too large. Only the first 10000 lines will be loaded.`, 'warning');
            content = await readFirstNLines(file, 10000);
        } else {
            // For smaller files, read the entire content
            const reader = new FileReader();
            content = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Error reading file'));
                reader.readAsText(file);
            });
        }

        const detectedType = detectDataType(file.name, content);

        if (!validateData(content, detectedType) && detectedType !== 'UNKNOWN') {
            showNotification(`Invalid ${detectedType} data format in ${file.name}.`, 'error');
            return null;
        }

        return {
            id: `${file.name}-${Date.now()}`,
            name: file.name,
            type: "file",
            fileType: detectedType,
            content,
            size: file.size,
            lastModified: new Date(file.lastModified),
            relativePath: '',
        };
    } catch (error) {
        showNotification(`Failed to read file: ${file.name}`, 'error');
        return null;
    }
}; 