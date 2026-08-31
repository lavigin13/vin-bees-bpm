// Shared attachment helpers. All 1C endpoints exchange files as
// { name, type, size, data } where `data` is base64 WITHOUT the
// "data:*;base64," prefix.

// Hard cap for a single attachment. Base64 inflates the payload ~1.33x and the
// whole file is held in memory and shipped inside a JSON body, so large files
// would stall the UI and get rejected by the server anyway.
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

// Read a File into a base64 string (strips the "data:*;base64," prefix).
// Rejects with a user-facing Ukrainian message when the file is too large.
export const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        if (file.size > MAX_ATTACHMENT_BYTES) {
            reject(new Error(`Файл «${file.name}» завеликий (${formatSize(file.size)}). Максимум — ${formatSize(MAX_ATTACHMENT_BYTES)}.`));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result || '';
            resolve(String(result).split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

export const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Detect the MIME type of a bare base64 payload by its magic-number prefix.
export const sniffBase64Mime = (base64) => {
    if (base64.startsWith('JVBERi')) return 'application/pdf';
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBOR')) return 'image/png';
    if (base64.startsWith('R0lGOD')) return 'image/gif';
    return 'application/octet-stream';
};

const base64ToBlob = (base64, type) => {
    const byteChars = atob(base64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    return new Blob([bytes], { type: type || sniffBase64Mime(base64) });
};

// Trigger a browser download for a { name, type, data } attachment.
// Goes through a Blob object URL — data: URIs hit browser length limits and
// duplicate the whole file as a string.
export const downloadBase64File = (f) => {
    if (!f || !f.data) {
        alert('Вміст файлу недоступний для завантаження.');
        return;
    }
    try {
        const url = URL.createObjectURL(base64ToBlob(f.data, f.type));
        const a = document.createElement('a');
        a.href = url;
        a.download = f.name || 'file';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
        alert('Не вдалося завантажити файл: ' + (e.message || e));
    }
};

// Open an attachment in a new tab. `fileValue` is either an URL or bare base64.
export const openBase64File = (fileValue) => {
    if (!fileValue) return;
    if (/^https?:\/\//i.test(fileValue)) {
        window.open(fileValue, '_blank', 'noopener');
        return;
    }
    try {
        const url = URL.createObjectURL(base64ToBlob(fileValue));
        window.open(url, '_blank', 'noopener');
        // Give the new tab time to load the blob before revoking.
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
        alert('Не вдалося відкрити файл: ' + (e.message || e));
    }
};
