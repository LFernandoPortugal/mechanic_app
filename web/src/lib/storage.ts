/**
 * Image utilities — 100% client-side, NO Firebase Storage.
 * All images are compressed and converted to base64 data URLs
 * which are stored directly inside Firestore documents.
 *
 * Size budget per Firestore document: 1 MB
 *   • Signature  ≈ 10-50 KB
 *   • Photo (800px JPEG 60%) ≈ 50-150 KB
 *   • 1 signature + 3 photos ≈ 300-500 KB  ✅ well within limit
 */

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
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("No se pudo obtener el contexto 2d del canvas"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG base64 data URL
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
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
