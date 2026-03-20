/**
 * 이미지 압축 유틸리티
 * 기본: maxWidth 600px, quality 0.5 (JPEG)
 */

export const compressDetailImage = (file, maxWidth = 400, quality = 0.3) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;

        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("이미지 압축 실패"));
            const ext = file.name.split(".").pop() || "jpg";
            const name = `compressed_${Date.now()}.${ext}`;
            const compressed = new File([blob], name, { type: blob.type });
            resolve(compressed);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
};

/**
 * 프로필 이미지 압축 (정사각 크롭, 작은 사이즈)
 * 기본: 300x300px, quality 0.45
 */
export const compressProfileImage = (file, maxSize = 400, quality = 0.3) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext("2d");
        // 중앙 크롭
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, maxSize, maxSize);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("이미지 압축 실패"));
            resolve(new File([blob], `profile_${Date.now()}.jpg`, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
};
