
export const compressImage = (base64Str: string, maxWidth = 300, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str); // Fallback to original if ctx fails
      }
    };
    img.onerror = () => {
       resolve(base64Str);
    }
  });
};

export const generateConfigUrl = (customLogo: string, moeLogo: string, rabbitLogo: string, apiKey: string) => {
    const config = {
        cl: customLogo.startsWith('data:') ? customLogo : undefined, // Only share if custom
        ml: moeLogo.startsWith('data:') ? moeLogo : undefined,
        rl: rabbitLogo.startsWith('data:') ? rabbitLogo : undefined,
        k: apiKey ? btoa(apiKey) : undefined // Simple encoding for key
    };
    // remove undefined keys
    Object.keys(config).forEach(key => (config as any)[key] === undefined && delete (config as any)[key]);
    
    try {
        const jsonString = JSON.stringify(config);
        const encoded = encodeURIComponent(jsonString); // URL safe
        const baseUrl = window.location.href.split('?')[0];
        return `${baseUrl}?config=${encoded}`;
    } catch (e) {
        return window.location.href;
    }
};
