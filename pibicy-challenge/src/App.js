import React, { useState, useRef, useEffect, useCallback } from 'react';
import { File } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { loadPdf } from './utils/pdfUtils';
import mammoth from 'mammoth';
import MsgReader from 'msgreader';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb } from 'pdf-lib';
import html2canvas from 'html2canvas';
import htmlDocx from 'html-docx-js/dist/html-docx';
import ExcelJS from 'exceljs';

import FileUpload from './components/FileUpload';
import AnnotationTools from './components/AnnotationTools';
import AnnotationsList from './components/AnnotationsList';

// Set the PDF.js worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = process.env.PUBLIC_URL + '/pdf.worker.min.mjs';

function App() {
  // File and PDF states
  const [file, setFile] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Annotation states
  const [annotations, setAnnotations] = useState([]);
  const [currentTool, setCurrentTool] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // Text tool states
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [showTextInput, setShowTextInput] = useState(false);

  // Word/MSG/Excel document state (stores HTML preview)
  const [docHtml, setDocHtml] = useState(null);

  // Dimensions for PDFs and images
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  // For live preview drawing
  const [currentAnnotation, setCurrentAnnotation] = useState(null);

  // Refs for rendering elements
  const overlayRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const imageRef = useRef(null);

  // --------------------------------------------------------------------------
  // File Upload Handler
  // --------------------------------------------------------------------------
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    // Allowed MIME types (also checking extensions for .msg and Excel)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'application/vnd.ms-outlook'
    ];

    if (
      !allowedTypes.includes(uploadedFile.type) &&
      !uploadedFile.name.toLowerCase().endsWith('.msg') &&
      !uploadedFile.name.toLowerCase().endsWith('.xls') &&
      !uploadedFile.name.toLowerCase().endsWith('.xlsx')
    ) {
      alert('File type not supported. Please upload PDF, DOC, XLS, XLSX, JPG, PNG, or MSG files.');
      return;
    }

    // Reset states
    setAnnotations([]);
    setPdf(null);
    setCurrentPage(1);
    setTotalPages(0);
    setDocHtml(null);

    const fileReader = new FileReader();

    fileReader.onerror = (err) => {
      console.error('File reading error:', err);
      alert('There was an error reading the file.');
    };

    // --- For Images ---
    if (uploadedFile.type.includes('image')) {
      fileReader.onload = (event) => {
        setFile({
          name: uploadedFile.name,
          type: uploadedFile.type,
          url: event.target.result,
        });
      };
      fileReader.readAsDataURL(uploadedFile);
    }
    // --- For PDFs ---
    else if (uploadedFile.type.includes('pdf')) {
      fileReader.onload = (event) => {
        setFile({
          name: uploadedFile.name,
          type: uploadedFile.type,
          url: event.target.result,
        });
      };
      fileReader.readAsArrayBuffer(uploadedFile);
    }
    // --- For Word files ---
    else if (uploadedFile.type.includes('word')) {
      fileReader.onload = (event) => {
        setFile({
          name: uploadedFile.name,
          type: uploadedFile.type,
          url: event.target.result,
        });
      };
      fileReader.readAsArrayBuffer(uploadedFile);
    }
    // --- For Excel files ---
    else if (
      uploadedFile.type.includes('excel') ||
      uploadedFile.name.toLowerCase().endsWith('.xls') ||
      uploadedFile.name.toLowerCase().endsWith('.xlsx')
    ) {
      fileReader.onload = (event) => {
        setFile({
          name: uploadedFile.name,
          type: uploadedFile.type,
          url: event.target.result,
        });
      };
      fileReader.readAsArrayBuffer(uploadedFile);
    }
    // --- For Outlook (.msg) files ---
    else if (
      (uploadedFile.type && uploadedFile.type.includes('outlook')) ||
      uploadedFile.name.toLowerCase().endsWith('.msg')
    ) {
      fileReader.onload = (event) => {
        const arrayBuffer = event.target.result;
        try {
          const reader = new MsgReader(arrayBuffer);
          const msg = reader.getFileData();
          const content = msg.bodyHTML || msg.body || '<p>No content available.</p>';
          setDocHtml(content);
          setFile({
            name: uploadedFile.name,
            type: uploadedFile.type || 'application/vnd.ms-outlook',
            url: arrayBuffer,
          });
        } catch (error) {
          console.error('Error reading .msg file:', error);
          alert('Failed to parse the .msg file. Please check the file and try again.');
        }
      };
      fileReader.readAsArrayBuffer(uploadedFile);
    } else {
      // Fallback for any other type
      setFile({
        name: uploadedFile.name,
        type: uploadedFile.type,
      });
    }
  };

  // --------------------------------------------------------------------------
  // Excel File Parsing (for .xls and .xlsx)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (file && (file.type.includes('excel') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx'))) {
      try {
        const data = new Uint8Array(file.url);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const html = XLSX.utils.sheet_to_html(worksheet);
        setDocHtml(html);
      } catch (error) {
        console.error('Error converting Excel file:', error);
      }
    }
  }, [file]);

  // --------------------------------------------------------------------------
  // PDF Loading and Rendering
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (file && file.type.includes('pdf')) {
      loadPdf(file, setPdf, setTotalPages);
    }
  }, [file]);

  const renderPdfPage = useCallback(
    (pageNumber) => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      if (pdf && pdfCanvasRef.current) {
        pdf.getPage(pageNumber).then((page) => {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = pdfCanvasRef.current;
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          setCanvasDimensions({ width: viewport.width, height: viewport.height });
          const renderContext = { canvasContext: context, viewport };
          const renderTask = page.render(renderContext);
          renderTaskRef.current = renderTask;
          renderTask.promise
            .then(() => {
              renderTaskRef.current = null;
            })
            .catch((error) => {
              console.error('Error rendering page:', error);
              renderTaskRef.current = null;
            });
        });
      }
    },
    [pdf]
  );

  useEffect(() => {
    if (pdf) {
      renderPdfPage(currentPage);
    }
  }, [pdf, currentPage, renderPdfPage]);

  // --------------------------------------------------------------------------
  // Helper: Get Overlay's Bounding Rect
  // --------------------------------------------------------------------------
  const getBoundingRect = () => {
    return overlayRef.current
      ? overlayRef.current.getBoundingClientRect()
      : { left: 0, top: 0, width: 0, height: 0 };
  };

  // --------------------------------------------------------------------------
  // Mouse Event Handlers for Drawing Shapes (non-text)
  // --------------------------------------------------------------------------
  const handleMouseDown = (e) => {
    if (!currentTool || !overlayRef.current) return;
    if (currentTool === 'text') return; // Text handled separately
    const rect = getBoundingRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentAnnotation(null);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentTool || currentTool === 'text') return;
    const rect = getBoundingRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentAnnotation({
      type: currentTool,
      startX: startPos.x,
      startY: startPos.y,
      endX: x,
      endY: y,
    });
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || !currentTool || currentTool === 'text') return;
    const rect = getBoundingRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newAnnotation = {
      type: currentTool,
      id: Date.now(),
      startX: startPos.x,
      startY: startPos.y,
      endX: x,
      endY: y,
      text: '',
    };
    setAnnotations([...annotations, newAnnotation]);
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  // --------------------------------------------------------------------------
  // Separate Click Handler for the Text Tool
  // --------------------------------------------------------------------------
  const handleTextClick = (e) => {
    const x = e.clientX;
    const y = e.clientY;
    setTextPosition({ x, y });
    setShowTextInput(true);
  };

  // --------------------------------------------------------------------------
  // Text Submission Handler
  // --------------------------------------------------------------------------
  const handleTextSubmit = () => {
    if (textInput.trim() && overlayRef.current) {
      const rect = overlayRef.current.getBoundingClientRect();
      const relativeX = textPosition.x - rect.left;
      const relativeY = textPosition.y - rect.top;
      const newAnnotation = {
        type: 'text',
        id: Date.now(),
        x: relativeX,
        y: relativeY,
        text: textInput,
      };
      setAnnotations([...annotations, newAnnotation]);
    }
    setShowTextInput(false);
    setTextInput('');
  };

  // --------------------------------------------------------------------------
  // Annotation Rendering Component
  // --------------------------------------------------------------------------
  const Annotation = ({ annotation }) => {
    switch (annotation.type) {
      case 'line':
        return (
          <line
            x1={annotation.startX}
            y1={annotation.startY}
            x2={annotation.endX}
            y2={annotation.endY}
            stroke="red"
            strokeWidth="2"
          />
        );
      case 'rectangle': {
        const width = annotation.endX - annotation.startX;
        const height = annotation.endY - annotation.startY;
        return (
          <rect
            x={annotation.startX}
            y={annotation.startY}
            width={width}
            height={height}
            stroke="blue"
            strokeWidth="2"
            fill="transparent"
          />
        );
      }
      case 'circle': {
        const radius = Math.sqrt(
          Math.pow(annotation.endX - annotation.startX, 2) +
          Math.pow(annotation.endY - annotation.startY, 2)
        );
        return (
          <circle
            cx={annotation.startX}
            cy={annotation.startY}
            r={radius}
            stroke="green"
            strokeWidth="2"
            fill="transparent"
          />
        );
      }
      case 'text':
        return (
          <text x={annotation.x} y={annotation.y} fill="red" fontSize="16">
            {annotation.text}
          </text>
        );
      case 'highlight': {
        const width = annotation.endX - annotation.startX;
        const height = annotation.endY - annotation.startY;
        return (
          <rect
            x={annotation.startX}
            y={annotation.startY}
            width={width}
            height={height}
            fill="yellow"
            fillOpacity="0.3"
          />
        );
      }
      case 'opaque': {
        const width = annotation.endX - annotation.startX;
        const height = annotation.endY - annotation.startY;
        return (
          <rect
            x={annotation.startX}
            y={annotation.startY}
            width={width}
            height={height}
            fill="black"
          />
        );
      }
      default:
        return null;
    }
  };

  // --------------------------------------------------------------------------
  // Save Document Functionality using PDF-lib (for PDFs)
  // --------------------------------------------------------------------------
  const saveDocument = async () => {
    if (!file) return;
    if (file.type.includes('pdf')) {
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
        const filename = extIndex > 0 ? file.name.substring(0, extIndex) + '_annotated.pdf' : file.name + '_annotated.pdf';
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.error('Error saving annotated PDF:', error);
        alert('Error saving annotated PDF.');
      }
    } else {
      alert('Save functionality for this file type is not implemented.');
    }
  };

  // --------------------------------------------------------------------------
  // Save Annotated Image Functionality (for Images)
  // --------------------------------------------------------------------------
  const saveAnnotatedImage = () => {
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
        const filename = extIndex > 0 ? file.name.substring(0, extIndex) + '_annotated.png' : file.name + '_annotated.png';
        a.download = filename;
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

  // --------------------------------------------------------------------------
  // Save DOCX File Functionality (for Word files)
  // --------------------------------------------------------------------------
  const saveDocFile = () => {
    if (!file || !file.type.includes('word')) return;
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
      const extIndex = file.name.lastIndexOf('.');
      const filename = extIndex > 0 ? file.name.substring(0, extIndex) + '_annotated.docx' : file.name + '_annotated.docx';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    });
  };

  // --------------------------------------------------------------------------
  // Save Excel File Functionality (for Excel files)
  // --------------------------------------------------------------------------
  const saveExcelFile = () => {
    if (!file || !(file.type.includes('excel') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')))
      return;
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
        const extIndex = file.name.lastIndexOf('.');
        const filename = extIndex > 0 ? file.name.substring(0, extIndex) + '_annotated.xlsx' : file.name + '_annotated.xlsx';
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      });
    });
  };

  // --------------------------------------------------------------------------
  // Save MSG File Functionality (for Outlook .msg files) via Serverless API
  // --------------------------------------------------------------------------
  const saveMsgFile = () => {
    if (!file || !(file.type.includes('outlook') || file.name.toLowerCase().endsWith('.msg')))
      return;
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
      // Call the serverless function to process the annotated MSG.
      processAnnotatedMsg(dataUrl);
    });
  };

  // Helper function to call the serverless endpoint
  const processAnnotatedMsg = async (dataUrl) => {
    // Remove the prefix to get the base64 string.
    const base64Data = dataUrl.split(',')[1];
    try {
      const response = await fetch('/api/convert-msg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data }),
      });
      if (!response.ok) {
        throw new Error('Server processing failed');
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const extIndex = file.name.lastIndexOf('.');
      const filename = extIndex > 0 ? file.name.substring(0, extIndex) + '_annotated.msg' : file.name + '_annotated.msg';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error processing MSG file on server:', error);
      alert('Error processing MSG file');
    }
  };

  // --------------------------------------------------------------------------
  // General Save File Functionality
  // --------------------------------------------------------------------------
  const saveFile = () => {
    if (!file) return;
    if (file.type.includes('pdf')) {
      saveDocument();
    } else if (file.type.includes('image')) {
      saveAnnotatedImage();
    } else if (file.type.includes('word')) {
      saveDocFile();
    } else if (file.type.includes('excel') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) {
      saveExcelFile();
    } else if (file.type.includes('outlook') || file.name.toLowerCase().endsWith('.msg')) {
      saveMsgFile();
    } else {
      alert('Save functionality for this file type is not implemented.');
    }
  };

  // --------------------------------------------------------------------------
  // Render File Preview
  // --------------------------------------------------------------------------
  const renderFilePreview = () => {
    if (!file) return null;
    // --- For Images ---
    if (file.type.includes('image')) {
      return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            ref={imageRef}
            src={file.url}
            alt={file.name}
            style={{ display: 'block' }}
            className="border border-gray-300"
            onLoad={(e) => {
              setImgDimensions({
                width: e.currentTarget.offsetWidth,
                height: e.currentTarget.offsetHeight,
              });
            }}
          />
          <svg
            ref={overlayRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${imgDimensions.width}px`,
              height: `${imgDimensions.height}px`,
              zIndex: 10,
              pointerEvents: 'auto',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={(e) => { if (currentTool === 'text') handleTextClick(e); }}
          >
            {annotations.map((anno) => (
              <Annotation key={anno.id} annotation={anno} />
            ))}
            {currentAnnotation && <Annotation annotation={currentAnnotation} />}
          </svg>
          {showTextInput && (
            <div style={{ position: 'fixed', top: textPosition.y, left: textPosition.x, zIndex: 9999, backgroundColor: 'white', border: '1px solid gray', padding: '4px' }}>
              <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} autoFocus style={{ border: '1px solid gray', padding: '2px' }} />
              <button onClick={handleTextSubmit} style={{ backgroundColor: 'blue', color: 'white', marginLeft: '4px' }}>Add</button>
            </div>
          )}
        </div>
      );
    }
    // --- For PDFs ---
    if (file.type.includes('pdf')) {
      return (
        <div className="relative" style={{ width: canvasDimensions.width ? `${canvasDimensions.width}px` : 'auto', height: canvasDimensions.height ? `${canvasDimensions.height}px` : 'auto' }}>
          <canvas ref={pdfCanvasRef} className="border border-gray-300" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }} />
          <svg
            ref={overlayRef}
            style={{ position: 'absolute', top: 0, left: 0, width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px`, zIndex: 2, pointerEvents: 'auto' }}
            onClick={(e) => { if (currentTool === 'text') handleTextClick(e); }}
            onMouseDown={(e) => { if (currentTool !== 'text') handleMouseDown(e); }}
            onMouseMove={(e) => { if (currentTool !== 'text') handleMouseMove(e); }}
            onMouseUp={(e) => { if (currentTool !== 'text') handleMouseUp(e); }}
          >
            {annotations.map((anno) => (
              <Annotation key={anno.id} annotation={anno} />
            ))}
            {currentAnnotation && <Annotation annotation={currentAnnotation} />}
          </svg>
          {showTextInput && (
            <div style={{ position: 'fixed', top: textPosition.y, left: textPosition.x, zIndex: 9999, backgroundColor: 'white', border: '1px solid gray', padding: '4px' }}>
              <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} autoFocus style={{ border: '1px solid gray', padding: '2px' }} />
              <button onClick={handleTextSubmit} style={{ backgroundColor: 'blue', color: 'white', marginLeft: '4px' }}>Add</button>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-between mt-2">
              <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">Previous</button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      );
    }
    // --- For Word, Excel, and Outlook (.msg) ---
    if (
      file.type.includes('word') ||
      file.type.includes('excel') ||
      file.type.includes('outlook') ||
      file.name.toLowerCase().endsWith('.msg') ||
      file.name.toLowerCase().endsWith('.xls') ||
      file.name.toLowerCase().endsWith('.xlsx')
    ) {
      let content;
      if (file.type.includes('word')) {
        if (!docHtml) {
          mammoth
            .convertToHtml({ arrayBuffer: file.url })
            .then((result) => setDocHtml(result.value))
            .catch((err) => console.error('Error converting DOCX: ', err));
        }
        content = docHtml ? (
          <div dangerouslySetInnerHTML={{ __html: docHtml }} />
        ) : (
          <p>Loading document preview...</p>
        );
      } else if (file.type.includes('excel') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) {
        content = docHtml ? (
          <div dangerouslySetInnerHTML={{ __html: docHtml }} />
        ) : (
          <p>Loading Excel preview...</p>
        );
      } else if (file.type.includes('outlook') || file.name.toLowerCase().endsWith('.msg')) {
        content = docHtml ? (
          <div dangerouslySetInnerHTML={{ __html: docHtml }} />
        ) : (
          <p>Loading message preview...</p>
        );
      }
      return (
        <div id="doc-annotated" style={{ position: 'relative', overflow: 'visible', height: 'auto', maxHeight: 'none' }}>
          <div className="border border-gray-300 p-4">{content}</div>
          <svg
            ref={overlayRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'auto' }}
            onClick={(e) => { if (currentTool === 'text') handleTextClick(e); }}
            onMouseDown={(e) => { if (currentTool !== 'text') handleMouseDown(e); }}
            onMouseMove={(e) => { if (currentTool !== 'text') handleMouseMove(e); }}
            onMouseUp={(e) => { if (currentTool !== 'text') handleMouseUp(e); }}
          >
            {annotations.map((anno) => (
              <Annotation key={anno.id} annotation={anno} />
            ))}
            {currentAnnotation && <Annotation annotation={currentAnnotation} />}
          </svg>
          {showTextInput && (
            <div style={{ position: 'fixed', top: textPosition.y, left: textPosition.x, zIndex: 9999, backgroundColor: 'white', border: '1px solid gray', padding: '4px' }}>
              <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} autoFocus style={{ border: '1px solid gray', padding: '2px' }} />
              <button onClick={handleTextSubmit} style={{ backgroundColor: 'blue', color: 'white', marginLeft: '4px' }}>Add</button>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="relative border border-gray-300 bg-gray-100 w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <File size={48} className="mx-auto mb-2 text-gray-500" />
          <p className="text-lg font-medium">{file.name}</p>
          <p className="text-sm text-gray-500">
            {file.type === 'application/pdf' && 'PDF Document'}
            {file.type.includes('word') && 'Word Document'}
            {file.type.includes('excel') && 'Excel Spreadsheet'}
            {file.type.includes('outlook') && 'Outlook Message'}
          </p>
          <p className="mt-4 text-sm text-gray-600">Preview not available. Use annotation tools below.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">File Viewer & Annotator</h1>
      <FileUpload handleFileUpload={handleFileUpload} />
      {file && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">File Preview</h2>
            {renderFilePreview()}
          </div>
          <div className="mb-6">
            <button className="px-4 py-2 bg-green-500 text-white rounded" onClick={saveFile}>Save Document</button>
          </div>
        </>
      )}
      {file && <AnnotationTools currentTool={currentTool} setCurrentTool={setCurrentTool} />}
      {annotations.length > 0 && <AnnotationsList annotations={annotations} />}
    </div>
  );
}

export default App;
