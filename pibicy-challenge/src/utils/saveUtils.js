// saveUtils.js
import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Saves an annotated PDF file.
 *
 * @param {Object} file - The original file object.
 * @param {Object} pdf - The loaded PDF document (from pdfjsLib).
 * @param {number} currentPage - The current page number (1-indexed).
 * @param {Object} canvasDimensions - Dimensions of the rendered PDF canvas.
 * @param {Array} annotations - Array of annotation objects.
 */
export const saveAnnotatedPDF = async (file, pdf, currentPage, canvasDimensions, annotations) => {
    if (!file || !file.type.includes('pdf')) return;

    try {
        // Load the original PDF using PDF-lib.
        const pdfDoc = await PDFDocument.load(file.url);
        const pages = pdfDoc.getPages();
        const pageIndex = currentPage - 1;
        const page = pages[pageIndex];
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();

        // Calculate scaling factors.
        const scaleX = pageWidth / canvasDimensions.width;
        const scaleY = pageHeight / canvasDimensions.height;

        // Draw each annotation onto the PDF page.
        annotations.forEach((annotation) => {
            switch (annotation.type) {
                case 'line': {
                    const startX = annotation.startX * scaleX;
                    const startY = pageHeight - annotation.startY * scaleY;
                    const endX = annotation.endX * scaleX;
                    const endY = pageHeight - annotation.endY * scaleY;
                    page.drawLine({
                        start: { x: startX, y: startY },
                        end: { x: endX, y: endY },
                        color: rgb(1, 0, 0),
                        thickness: 2,
                    });
                    break;
                }
                case 'rectangle': {
                    const x = annotation.startX * scaleX;
                    const height = (annotation.endY - annotation.startY) * scaleY;
                    const y = pageHeight - annotation.startY * scaleY - height;
                    const width = (annotation.endX - annotation.startX) * scaleX;
                    page.drawRectangle({
                        x,
                        y,
                        width,
                        height,
                        borderColor: rgb(0, 0, 1),
                        borderWidth: 2,
                    });
                    break;
                }
                case 'circle': {
                    const centerX = annotation.startX * scaleX;
                    const centerY = pageHeight - annotation.startY * scaleY;
                    const radius = Math.sqrt(
                        Math.pow((annotation.endX - annotation.startX) * scaleX, 2) +
                        Math.pow((annotation.endY - annotation.startY) * scaleY, 2)
                    );
                    page.drawEllipse({
                        x: centerX,
                        y: centerY,
                        xScale: radius,
                        yScale: radius,
                        borderColor: rgb(0, 1, 0),
                        borderWidth: 2,
                    });
                    break;
                }
                case 'text': {
                    const x = annotation.x * scaleX;
                    const y = pageHeight - annotation.y * scaleY;
                    page.drawText(annotation.text, {
                        x,
                        y,
                        size: 16,
                        color: rgb(1, 0, 0),
                    });
                    break;
                }
                case 'highlight': {
                    const x = annotation.startX * scaleX;
                    const height = (annotation.endY - annotation.startY) * scaleY;
                    const y = pageHeight - annotation.startY * scaleY - height;
                    const width = (annotation.endX - annotation.startX) * scaleX;
                    page.drawRectangle({
                        x,
                        y,
                        width,
                        height,
                        color: rgb(1, 1, 0.8),
                    });
                    break;
                }
                case 'opaque': {
                    const x = annotation.startX * scaleX;
                    const height = (annotation.endY - annotation.startY) * scaleY;
                    const y = pageHeight - annotation.startY * scaleY - height;
                    const width = (annotation.endX - annotation.startX) * scaleX;
                    page.drawRectangle({
                        x,
                        y,
                        width,
                        height,
                        color: rgb(0, 0, 0),
                    });
                    break;
                }
                default:
                    break;
            }
        });

        // Save the modified PDF and trigger a download.
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const extIndex = file.name.lastIndexOf('.');
        a.download = extIndex > 0 ? file.name.substring(0, extIndex) + '_annotated.pdf' : file.name + '_annotated.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Error saving annotated PDF:', error);
        alert('Error saving annotated PDF.');
    }
};

/**
 * Saves an annotated image file.
 *
 * @param {Object} file - The original file object.
 * @param {Object} imgDimensions - Dimensions of the displayed image.
 * @param {Array} annotations - Array of annotation objects.
 */
export const saveAnnotatedImage = (file, imgDimensions, annotations) => {
    if (!file || !file.type.includes('image')) return;

    // Create an off-screen canvas.
    const canvas = document.createElement('canvas');
    canvas.width = imgDimensions.width;
    canvas.height = imgDimensions.height;
    const ctx = canvas.getContext('2d');

    // Load the base image.
    const baseImage = new Image();
    baseImage.src = file.url;
    baseImage.onload = () => {
        // Draw the base image.
        ctx.drawImage(baseImage, 0, 0, imgDimensions.width, imgDimensions.height);

        // Render each annotation.
        annotations.forEach((annotation) => {
            switch (annotation.type) {
                case 'line': {
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(annotation.startX, annotation.startY);
                    ctx.lineTo(annotation.endX, annotation.endY);
                    ctx.stroke();
                    break;
                }
                case 'rectangle': {
                    ctx.strokeStyle = 'blue';
                    ctx.lineWidth = 2;
                    const width = annotation.endX - annotation.startX;
                    const height = annotation.endY - annotation.startY;
                    ctx.strokeRect(annotation.startX, annotation.startY, width, height);
                    break;
                }
                case 'circle': {
                    ctx.strokeStyle = 'green';
                    ctx.lineWidth = 2;
                    const radius = Math.sqrt(
                        Math.pow(annotation.endX - annotation.startX, 2) +
                        Math.pow(annotation.endY - annotation.startY, 2)
                    );
                    ctx.beginPath();
                    ctx.arc(annotation.startX, annotation.startY, radius, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                }
                case 'text': {
                    ctx.fillStyle = 'red';
                    ctx.font = '16px sans-serif';
                    ctx.fillText(annotation.text, annotation.x, annotation.y);
                    break;
                }
                case 'highlight': {
                    const width = annotation.endX - annotation.startX;
                    const height = annotation.endY - annotation.startY;
                    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                    ctx.fillRect(annotation.startX, annotation.startY, width, height);
                    break;
                }
                case 'opaque': {
                    const width = annotation.endX - annotation.startX;
                    const height = annotation.endY - annotation.startY;
                    ctx.fillStyle = 'black';
                    ctx.fillRect(annotation.startX, annotation.startY, width, height);
                    break;
                }
                default:
                    break;
            }
        });

        // Export the annotated image.
        canvas.toBlob((blob) => {
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const extIndex = file.name.lastIndexOf('.');
            a.download = extIndex > 0 ? file.name.substring(0, extIndex) + '_annotated.png' : file.name + '_annotated.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        }, 'image/png');
    };

    baseImage.onerror = () => {
        alert('Failed to load the image.');
    };
};

/**
 * General helper that saves a file based on its type.
 *
 * @param {Object} file - The original file object.
 * @param {Object} extraParams - Additional parameters required by the save functions.
 *   For PDFs, pass { pdf, currentPage, canvasDimensions, annotations }.
 *   For images, pass { imgDimensions, annotations }.
 */
export const saveFile = (file, extraParams) => {
    if (!file) return;
    if (file.type.includes('pdf')) {
        saveAnnotatedPDF(file, extraParams.pdf, extraParams.currentPage, extraParams.canvasDimensions, extraParams.annotations);
    } else if (file.type.includes('image')) {
        saveAnnotatedImage(file, extraParams.imgDimensions, extraParams.annotations);
    } else {
        alert('Save functionality for this file type is not implemented.');
    }
};
