/**
 * Převede File objekt na base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Vrátit jen base64 část bez "data:image/png;base64," prefixu
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Získá mime type ze souboru
 */
export function getFileMimeType(file: File): string {
  return file.type || 'image/jpeg';
}

/**
 * Získá název souboru
 */
export function getFileName(file: File): string {
  return file.name || 'image.jpg';
}

