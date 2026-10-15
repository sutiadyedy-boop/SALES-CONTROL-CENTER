import { toJpeg, toPng, toBlob } from 'html-to-image';
import html2canvas from 'html2canvas';

export interface CaptureOptions {
  fileName?: string;
  backgroundColor?: string;
  quality?: number;
  scale?: number;
  skipFonts?: boolean;
}

export interface CaptureResult {
  success: boolean;
  dataUrl?: string;
  blob?: Blob;
  fileName: string;
  error?: string;
}

/**
 * Converts a base64 Data URL to a native Blob object
 */
export function dataURLtoBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binaryString = atob(parts[1]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Robustly trigger a file download in the browser
 */
export function triggerFileDownload(blobOrUrl: Blob | string, fileName: string): boolean {
  try {
    let objectUrl: string;
    let isCreatedUrl = false;

    if (blobOrUrl instanceof Blob) {
      objectUrl = URL.createObjectURL(blobOrUrl);
      isCreatedUrl = true;
    } else if (typeof blobOrUrl === 'string' && blobOrUrl.startsWith('data:')) {
      const blob = dataURLtoBlob(blobOrUrl);
      objectUrl = URL.createObjectURL(blob);
      isCreatedUrl = true;
    } else {
      objectUrl = blobOrUrl;
    }

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';

    document.body.appendChild(link);

    // Use dispatchEvent for best compatibility with iframe environments
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    link.dispatchEvent(event);

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      if (isCreatedUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }, 1500);

    return true;
  } catch (err) {
    console.error('Download trigger failed:', err);
    return false;
  }
}

/**
 * Find the target DOM element with multiple fallback selectors
 */
export function resolveTargetElement(elementOrId: string | HTMLElement): HTMLElement | null {
  if (typeof elementOrId !== 'string') {
    return elementOrId;
  }

  // 1. Direct ID lookup
  let el = document.getElementById(elementOrId);
  if (el) return el;

  // 2. Query selector
  try {
    el = document.querySelector(elementOrId);
    if (el) return el as HTMLElement;
  } catch {
    // Ignore invalid selector syntax
  }

  // 3. Fallback to main capture container
  el = document.getElementById('main-capture-area');
  if (el) return el;

  // 4. Fallback to main content element
  el = document.querySelector('main');
  if (el) return el as HTMLElement;

  // 5. Fallback to root or body
  return (document.getElementById('root') || document.body) as HTMLElement;
}

/**
 * Capture an HTML element as high-resolution JPG image and initiate browser download
 */
export async function captureElementToJpg(
  elementOrId: string | HTMLElement,
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  const element = resolveTargetElement(elementOrId);

  const {
    fileName = `Capture_${new Date().toISOString().split('T')[0]}.jpg`,
    backgroundColor = '#020617', // tailwind slate-950
    quality = 0.98, // Crisp high-definition JPEG quality
    scale = 2.5,
    skipFonts = true,
  } = options;

  const cleanFileName = fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')
    ? fileName
    : `${fileName}.jpg`;

  if (!element) {
    console.error('Capture target element not found:', elementOrId);
    return {
      success: false,
      fileName: cleanFileName,
      error: 'Elemen target tangkapan tidak ditemukan di halaman.',
    };
  }

  // 1. Save scroll states of all parent scroll containers so we can capture full unclipped height
  const scrollStates: { el: HTMLElement; top: number; left: number }[] = [];
  let parent = element.parentElement;
  while (parent) {
    if (parent.scrollTop > 0 || parent.scrollLeft > 0) {
      scrollStates.push({ el: parent, top: parent.scrollTop, left: parent.scrollLeft });
      parent.scrollTop = 0;
      parent.scrollLeft = 0;
    }
    parent = parent.parentElement;
  }

  // Also check window scroll
  const winScrollX = window.scrollX || window.pageXOffset || 0;
  const winScrollY = window.scrollY || window.pageYOffset || 0;
  if (winScrollX > 0 || winScrollY > 0) {
    window.scrollTo(0, 0);
  }

  // Allow layout micro-tick to settle
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    // 2. Accurately calculate full content dimensions without clipping
    const scrollWidth = Math.max(
      element.scrollWidth || 0,
      element.offsetWidth || 0,
      element.clientWidth || 0,
      1280
    );
    const scrollHeight = Math.max(
      element.scrollHeight || 0,
      element.offsetHeight || 0,
      element.clientHeight || 0,
      700
    );

    const totalPixels = scrollWidth * scrollHeight;

    // High-definition pixel ratio: maintain 2x or 2.5x HD while respecting canvas memory limits
    let pixelRatio = scale || 2.5;
    if (totalPixels > 20000000) {
      pixelRatio = 1.5;
    } else if (totalPixels > 10000000) {
      pixelRatio = 2.0;
    } else {
      pixelRatio = Math.max(scale || 2.5, 2.0);
    }

    const captureStyle: Partial<CSSStyleDeclaration> = {
      transform: 'none',
      margin: '0',
      maxWidth: 'none',
      maxHeight: 'none',
      overflow: 'visible',
      boxSizing: 'border-box',
    };

    const filterFunction = (node: Node) => {
      if (node instanceof HTMLElement) {
        if (node.getAttribute('data-capture-ignore') === 'true') {
          return false;
        }
      }
      return true;
    };

    // Strategy 1: Modern html-to-image with toJpeg and explicit dimensions
    try {
      const dataUrl = await toJpeg(element, {
        quality,
        backgroundColor,
        pixelRatio,
        width: scrollWidth,
        height: scrollHeight,
        canvasWidth: Math.round(scrollWidth * pixelRatio),
        canvasHeight: Math.round(scrollHeight * pixelRatio),
        style: captureStyle,
        skipFonts,
        cacheBust: true,
        filter: filterFunction,
      });

      if (dataUrl && dataUrl.startsWith('data:image')) {
        const blob = dataURLtoBlob(dataUrl);
        triggerFileDownload(blob, cleanFileName);

        return {
          success: true,
          dataUrl,
          blob,
          fileName: cleanFileName,
        };
      }
    } catch (err1) {
      console.warn('html-to-image toJpeg failed, attempting toBlob fallback:', err1);
    }

    // Strategy 2: html-to-image with toBlob and full dimensions
    try {
      const blob = await toBlob(element, {
        quality,
        type: 'image/jpeg',
        backgroundColor,
        pixelRatio,
        width: scrollWidth,
        height: scrollHeight,
        canvasWidth: Math.round(scrollWidth * pixelRatio),
        canvasHeight: Math.round(scrollHeight * pixelRatio),
        style: captureStyle,
        skipFonts,
        cacheBust: true,
        filter: filterFunction,
      });

      if (blob) {
        triggerFileDownload(blob, cleanFileName);
        return {
          success: true,
          blob,
          fileName: cleanFileName,
        };
      }
    } catch (err2) {
      console.warn('html-to-image toBlob failed, attempting toPng fallback:', err2);
    }

    // Strategy 3: html-to-image toPng fallback converted to Jpeg canvas
    try {
      const pngDataUrl = await toPng(element, {
        backgroundColor,
        pixelRatio: Math.min(pixelRatio, 2.0),
        width: scrollWidth,
        height: scrollHeight,
        canvasWidth: Math.round(scrollWidth * Math.min(pixelRatio, 2.0)),
        canvasHeight: Math.round(scrollHeight * Math.min(pixelRatio, 2.0)),
        style: captureStyle,
        skipFonts,
        cacheBust: true,
        filter: filterFunction,
      });

      if (pngDataUrl) {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = pngDataUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || scrollWidth;
        canvas.height = img.naturalHeight || scrollHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
          const blob = dataURLtoBlob(jpegDataUrl);
          triggerFileDownload(blob, cleanFileName);

          return {
            success: true,
            dataUrl: jpegDataUrl,
            blob,
            fileName: cleanFileName,
          };
        }
      }
    } catch (err3) {
      console.warn('html-to-image toPng fallback failed:', err3);
    }

    // Strategy 4: html2canvas fallback with explicit bounds and scroll positioning
    try {
      const canvas = await html2canvas(element, {
        backgroundColor,
        scale: Math.min(pixelRatio, 2.0),
        useCORS: true,
        logging: false,
        allowTaint: true,
        width: scrollWidth,
        height: scrollHeight,
        windowWidth: scrollWidth,
        windowHeight: scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (node) => {
          if (node instanceof HTMLElement && node.getAttribute('data-capture-ignore') === 'true') {
            return true;
          }
          return false;
        },
      });

      const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
      const blob = dataURLtoBlob(jpegDataUrl);
      triggerFileDownload(blob, cleanFileName);

      return {
        success: true,
        dataUrl: jpegDataUrl,
        blob,
        fileName: cleanFileName,
      };
    } catch (err4) {
      console.error('All capture engines failed:', err4);
      return {
        success: false,
        fileName: cleanFileName,
        error: 'Gagal memproses gambar tampilan. Silakan coba kembali.',
      };
    }
  } finally {
    // 3. Restore all scroll container positions perfectly
    for (const item of scrollStates) {
      item.el.scrollTop = item.top;
      item.el.scrollLeft = item.left;
    }
    if (winScrollX > 0 || winScrollY > 0) {
      window.scrollTo(winScrollX, winScrollY);
    }
  }
}
