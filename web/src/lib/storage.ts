/**
 * Image utilities — 100% client-side, NO Firebase Storage.
 * All images are compressed and converted to base64 data URLs
 * which are stored directly inside Firestore documents.
 *
 * Size budget per Firestore document: 1 MB
 *   • Signature  ≈ 10-50 KB
 *   • Photo (800px JPEG 60%) ≈ 50-150 KB
 *   • The UI accepts at most four photos and each encoded photo has a hard cap.
 */

export const MAX_RECEPTION_PHOTOS = 4;
export const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_DATA_URL_CHARS = 180_000;
export const MAX_SIGNATURE_DATA_URL_CHARS = 150_000;

/**
 * Compress a File (from <input type="file">) → base64 data URL string.
 * Resizes to maxWidth preserving aspect ratio, then exports as JPEG.
 */
export const compressImageToBase64 = (
  file: File,
  maxWidth = 800,
  quality = 0.6
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo seleccionado no es una imagen."));
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      reject(new Error("La imagen original supera el límite de 15 MB."));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const scale = Math.min(1, maxWidth / width, maxWidth / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("No se pudo obtener el contexto 2d del canvas"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        let currentQuality = quality;
        let dataUrl = canvas.toDataURL("image/jpeg", currentQuality);
        for (let attempt = 0; dataUrl.length > MAX_IMAGE_DATA_URL_CHARS && attempt < 7; attempt += 1) {
          currentQuality = Math.max(0.35, currentQuality - 0.08);
          if (attempt >= 3) {
            canvas.width = Math.max(320, Math.round(canvas.width * 0.82));
            canvas.height = Math.max(240, Math.round(canvas.height * 0.82));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          dataUrl = canvas.toDataURL("image/jpeg", currentQuality);
        }
        if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
          reject(new Error("La imagen no pudo reducirse al tamaño permitido."));
          return;
        }
        resolve(dataUrl);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

/**
 * "Upload" a job image — actually just compresses and returns a base64 string.
 * Drop-in replacement for the old uploadJobImage that used Firebase Storage.
 * The returned string is a data URL that can be used directly in <img src="...">.
 */
export const uploadJobImage = async (
  file: File,
  _jobId: string,
  _type: "reception" | "evidence" | "logo"
): Promise<string> => {
  void _jobId;
  void _type;
  return compressImageToBase64(file);
};

/**
 * "Upload" a signature — the canvas already gives us a data URL (base64 PNG).
 * We just pass it through. No Firebase Storage needed.
 */
export const uploadSignature = async (
  dataUrl: string,
  _jobId: string
): Promise<string> => {
  void _jobId;
  // The SignatureCanvas already provides a base64 data URL — just return it.
  return dataUrl;
};
