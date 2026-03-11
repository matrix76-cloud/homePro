/**
 * 이미지 압축 유틸리티
 * 채팅 이미지 전송 시 용량 최적화
 */

export const compressDetailImage = (file, maxWidth = 800, quality = 0.7) => {
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
