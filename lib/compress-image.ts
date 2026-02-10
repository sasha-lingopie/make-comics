/**
 * Compress an image file on the client side using canvas.
 * Resizes to maxDimension and compresses to JPEG with target quality.
 * Returns a new File object that should be well under the multipart upload threshold.
 */
export async function compressImage(
  file: File,
  options: {
    maxDimension?: number;
    maxSizeBytes?: number;
    quality?: number;
  } = {}
): Promise<File> {
  const {
    maxDimension = 1024,
    maxSizeBytes = 1024 * 1024, // 1MB
    quality = 0.85,
  } = options;

  // If already small enough, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if needed
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }

          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg", lastModified: Date.now() }
          );

          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = url;
  });
}
