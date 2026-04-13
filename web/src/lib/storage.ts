import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

// Comprimir una imagen en el cliente para no agotar almacenamiento de Firebase (Tier Free)
export const compressImage = async (file: File, maxWidth = 1280, quality = 0.7): Promise<Blob> => {
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

        // Mantener el aspect ratio
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

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Error al convertir canvas a Blob"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

// Subir al Storage local (o Firebase)
export const uploadJobImage = async (file: File, jobId: string, type: 'reception' | 'evidence'): Promise<string> => {
  try {
    // 1. Comprimir archivo localmente (ahorra ~80% de peso)
    const compressedBlob = await compressImage(file);
    
    // 2. Definir la ruta en el bucket: "jobs/{jobId}/{type}_{timestamp}.jpg"
    const timestamp = new Date().getTime();
    const fileName = `jobs/${jobId}/${type}_${timestamp}.jpg`;
    
    // 3. Subir a Firebase Storage
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, compressedBlob);
    
    // 4. Obtener URL publica
    const publicUrl = await getDownloadURL(storageRef);
    return publicUrl;
    
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};
