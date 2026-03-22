/**
 * Extract a human-readable title from a filename by removing the extension
 */
export function extractFilenameTitle(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex <= 0) {
        return filename;
    }
    return filename.substring(0, lastDotIndex);
}
