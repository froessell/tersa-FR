/**
 * Splits a grid image into 9 individual images (3x3 grid)
 * @param imageUrl - URL of the grid image to split
 * @returns Promise resolving to an array of 9 image data URLs
 */
export async function splitGridImage(imageUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        const imgWidth = img.width;
        const imgHeight = img.height;
        
        // Calculate the size of each cell (assuming 3x3 grid)
        const cellWidth = imgWidth / 3;
        const cellHeight = imgHeight / 3;
        
        const splitImages: string[] = [];
        
        // Extract each cell from the grid
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            canvas.width = cellWidth;
            canvas.height = cellHeight;
            
            // Draw the specific cell from the source image
            ctx.drawImage(
              img,
              col * cellWidth,      // source x
              row * cellHeight,      // source y
              cellWidth,             // source width
              cellHeight,            // source height
              0,                     // destination x
              0,                     // destination y
              cellWidth,             // destination width
              cellHeight             // destination height
            );
            
            // Convert canvas to data URL
            const dataUrl = canvas.toDataURL('image/png');
            splitImages.push(dataUrl);
          }
        }
        
        resolve(splitImages);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Converts a data URL to a File object
 */
export function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}

