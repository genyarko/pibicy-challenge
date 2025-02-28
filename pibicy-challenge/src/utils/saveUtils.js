// saveUtils.js
import { PDFDocument, rgb } from 'pdf-lib';
import html2canvas from 'html2canvas';
import htmlDocx from 'html-docx-js/dist/html-docx';
import ExcelJS from 'exceljs';

/**
 * Saves an annotated PDF file.
 * (Existing function, unchanged)
 */
export const saveAnnotatedPDF = async (file, pdf, currentPage, canvasDimensions, annotations) => {
    if (!file || !file.type.includes('pdf')) return;

    try {
        const pdfDoc = await PDFDocument.load(file.url);
        const pages = pdfDoc.getPages();
        const pageIndex = currentPage - 1;
        const page = pages[pageIndex];
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();

        const scaleX = pageWidth / canvasDimensions.width;
        const scaleY = pageHeight / canvasDimensions.height;

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
 * (Existing function, unchanged)
 */
export const saveAnnotatedImage = (file, imgDimensions, annotations) => {
    if (!file || !file.type.includes('image')) return;

    const canvas = document.createElement('canvas');
    canvas.width = imgDimensions.width;
    canvas.height = imgDimensions.height;
    const ctx = canvas.getContext('2d');

    const baseImage = new Image();
    baseImage.src = file.url;
    baseImage.onload = () => {
        ctx.drawImage(baseImage, 0, 0, imgDimensions.width, imgDimensions.height);

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
 * Saves an annotated Word document (DOCX).
 * Clones the DOM element with id 'doc-annotated', converts it to an image,
 * wraps it in an HTML structure, and then converts that HTML to a DOCX blob.
 */
export const saveDocFile = () => {
    const container = document.getElementById('doc-annotated');
    if (!container) {
        alert('Document container not found.');
        return;
    }
    const clone = container.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.width = container.scrollWidth + 'px';
    clone.style.height = container.scrollHeight + 'px';
    clone.style.overflow = 'visible';
    document.body.appendChild(clone);

    html2canvas(clone, {
        scale: 2,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
        useCORS: true,
    }).then((canvas) => {
        document.body.removeChild(clone);
        const dataUrl = canvas.toDataURL('image/png');
        const htmlContent = `<html><body><img src="${dataUrl}" /></body></html>`;
        const converted = htmlDocx.asBlob(htmlContent);
        const downloadUrl = URL.createObjectURL(converted);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const extIndex = document.title.lastIndexOf('.');
        a.download = extIndex > 0 ? document.title.substring(0, extIndex) + '_annotated.docx' : 'annotated.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    });
};

/**
 * Saves an annotated Excel file.
 * Clones the DOM element with id 'doc-annotated', converts it to an image,
 * and inserts that image into a new Excel workbook using ExcelJS.
 */
export const saveExcelFile = () => {
    const container = document.getElementById('doc-annotated');
    if (!container) {
        alert('Document container not found.');
        return;
    }
    const clone = container.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.width = container.scrollWidth + 'px';
    clone.style.height = container.scrollHeight + 'px';
    clone.style.overflow = 'visible';
    document.body.appendChild(clone);

    html2canvas(clone, {
        scale: 2,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
        useCORS: true,
    }).then((canvas) => {
        document.body.removeChild(clone);
        const dataUrl = canvas.toDataURL('image/png');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Annotated');

        const imageId = workbook.addImage({
            base64: dataUrl,
            extension: 'png',
        });
        worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: canvas.width, height: canvas.height },
        });

        workbook.xlsx.writeBuffer().then((buffer) => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const extIndex = document.title.lastIndexOf('.');
            a.download = extIndex > 0 ? document.title.substring(0, extIndex) + '_annotated.xlsx' : 'annotated.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        });
    });
};

/**
 * Saves an annotated MSG file.
 * Clones the DOM element with id 'doc-annotated', converts it to an image,
 * and constructs a basic EML structure that Outlook can open.
 */
export const saveMsgFile = () => {
    const container = document.getElementById('doc-annotated');
    if (!container) {
        alert('Document container not found.');
        return;
    }
    const clone = container.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.width = container.scrollWidth + 'px';
    clone.style.height = container.scrollHeight + 'px';
    clone.style.overflow = 'visible';
    document.body.appendChild(clone);

    html2canvas(clone, {
        scale: 2,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
        useCORS: true,
    }).then((canvas) => {
        document.body.removeChild(clone);
        const dataUrl = canvas.toDataURL('image/png');
        // Build a simple EML structure
        const emlContent = `Subject: Annotated Message\r\nFrom: example@example.com\r\nTo: example@example.com\r\nMIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="BOUNDARY"\r\n\r\n--BOUNDARY\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n<html><body><img src="cid:annotated-image" /></body></html>\r\n\r\n--BOUNDARY\r\nContent-Type: image/png\r\nContent-Transfer-Encoding: base64\r\nContent-ID: <annotated-image>\r\n\r\n${dataUrl.split(',')[1]}\r\n--BOUNDARY--`;
        const blob = new Blob([emlContent], { type: 'message/rfc822' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const extIndex = document.title.lastIndexOf('.');
        a.download = extIndex > 0 ? document.title.substring(0, extIndex) + '_annotated.msg' : 'annotated.msg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    });
};

/**
 * General helper that saves a file based on its type.
 * For PDFs and images, the corresponding functions are called.
 * For Word, Excel, and MSG files, the new functions are triggered.
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
    } else if (
        file.type.includes('word') ||
        file.name.toLowerCase().endsWith('.doc') ||
        file.name.toLowerCase().endsWith('.docx')
    ) {
        saveDocFile();
    } else if (
        file.type.includes('excel') ||
        file.name.toLowerCase().endsWith('.xls') ||
        file.name.toLowerCase().endsWith('.xlsx')
    ) {
        saveExcelFile();
    } else if (
        file.type.includes('outlook') ||
        file.name.toLowerCase().endsWith('.msg')
    ) {
        saveMsgFile();
    } else {
        alert('Save functionality for this file type is not implemented.');
    }
};
