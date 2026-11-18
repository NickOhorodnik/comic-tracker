const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = 48_000;

/** Make a compact embedded cover image that fits the spreadsheet cell limit. */
export async function makeCoverDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Виберіть файл зображення.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Файл завеликий. Максимальний розмір — 12 МБ.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Не вдалося прочитати цей файл зображення.');
  }

  try {
    if (bitmap.width * bitmap.height > 40_000_000) {
      throw new Error('Зображення має надто високу роздільність.');
    }

    for (const bounds of [240, 200, 160]) {
      const scale = Math.min(bounds / bitmap.width, (bounds * 1.5) / bitmap.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Не вдалося обробити зображення.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.72, 0.6, 0.48]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
      }
    }

    throw new Error('Не вдалося достатньо зменшити обкладинку. Виберіть менший файл.');
  } finally {
    bitmap.close();
  }
}
