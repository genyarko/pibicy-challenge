import React, { useState, useRef, useEffect, useCallback } from 'react';
import { File, Upload, Square, Circle, Type } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import FileUpload from './components/FileUpload';
import AnnotationTools from './components/AnnotationTools';
import AnnotationsList from './components/AnnotationsList';
import { loadPdf } from './utils/pdfUtils';
import mammoth from 'mammoth';

// Set PDF.js worker source to a CDN URL
pdfjsLib.GlobalWorkerOptions.workerSrc = process.env.PUBLIC_URL + '/pdf.worker.min.mjs';

function App() {
  const [file, setFile] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [annotations, setAnnotations] = useState([]);
  const [currentTool, setCurrentTool] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [showTextInput, setShowTextInput] = useState(false);
  const [docHtml, setDocHtml] = useState(null);
  // For PDFs: store the canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  // For images: store the rendered image dimensions
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  // Live preview annotation state
  const [currentAnnotation, setCurrentAnnotation] = useState(null);

  const overlayRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const imageRef = useRef(null);

  // Debug: log canvas dimensions when updated
  useEffect(() => {
    console.log("Canvas dimensions updated:", canvasDimensions);
  }, [canvasDimensions]);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

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

    if (!allowedTypes.includes(uploadedFile.type)) {
      alert('File type not supported. Please upload PDF, DOC, XLS, XLSX, JPG, PNG, or MSG files.');
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      setFile({
        name: uploadedFile.name,
        type: uploadedFile.type,
        url: event.target.result
      });
      setAnnotations([]);
      setPdf(null);
      setCurrentPage(1);
      setTotalPages(0);
      setDocHtml(null);
    };

    if (uploadedFile.type.includes('image')) {
      fileReader.readAsDataURL(uploadedFile);
    } else if (
      uploadedFile.type.includes('pdf') ||
      uploadedFile.type.includes('word') ||
      uploadedFile.type.includes('excel')
    ) {
      fileReader.readAsArrayBuffer(uploadedFile);
    } else {
      setFile({
        name: uploadedFile.name,
        type: uploadedFile.type
      });
    }
  };

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

          const renderContext = {
            canvasContext: context,
            viewport,
          };

          const renderTask = page.render(renderContext);
          renderTaskRef.current = renderTask;

          renderTask.promise.then(() => {
            if (overlayRef.current) {
              overlayRef.current.setAttribute('width', viewport.width);
              overlayRef.current.setAttribute('height', viewport.height);
            }
            renderTaskRef.current = null;
          }).catch((error) => {
            console.error("Error rendering page:", error);
            renderTaskRef.current = null;
          });
        });
      }
    },
    [pdf]
  );

  useEffect(() => {
    if (file && file.type.includes('pdf')) {
      loadPdf(file, setPdf, setTotalPages);
    }
  }, [file]);

  useEffect(() => {
    if (pdf) {
      renderPdfPage(currentPage);
    }
  }, [pdf, currentPage, renderPdfPage]);

  const getBoundingRect = () => {
    if (file && file.type.includes('pdf') && pdfCanvasRef.current) {
      return pdfCanvasRef.current.getBoundingClientRect();
    } else if (file && file.type.includes('image') && overlayRef.current) {
      return overlayRef.current.getBoundingClientRect();
    }
    return overlayRef.current ? overlayRef.current.getBoundingClientRect() : { left: 0, top: 0 };
  };

  const handleMouseDown = (e) => {
    if (!currentTool || !overlayRef.current) return;
    const rect = getBoundingRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log("handleMouseDown:", { x, y });
    if (currentTool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
      return;
    }
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentAnnotation(null);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentTool || !overlayRef.current) return;
    const rect = getBoundingRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tempAnno = {
      type: currentTool,
      startX: startPos.x,
      startY: startPos.y,
      endX: x,
      endY: y
    };
    console.log("PDF Live preview annotation:", tempAnno);
    setCurrentAnnotation(tempAnno);
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || !currentTool || !overlayRef.current) return;
    const rect = getBoundingRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log("handleMouseUp:", { x, y });
    const newAnnotation = {
      type: currentTool,
      id: Date.now(),
      startX: startPos.x,
      startY: startPos.y,
      endX: x,
      endY: y,
      text: ''
    };
    setAnnotations([...annotations, newAnnotation]);
    setIsDrawing(false);
    setCurrentAnnotation(null);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      const newAnnotation = {
        type: 'text',
        id: Date.now(),
        x: textPosition.x,
        y: textPosition.y,
        text: textInput
      };
      setAnnotations([...annotations, newAnnotation]);
    }
    setShowTextInput(false);
    setTextInput('');
  };

  const renderFilePreview = () => {
    if (!file) return null;

    // Branch for images:
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
              backgroundColor: 'rgba(255, 0, 0, 0.1)', // Debug tint
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {annotations.map((anno) => (
              <Annotation key={anno.id} annotation={anno} />
            ))}
            {currentAnnotation && <Annotation annotation={currentAnnotation} />}
          </svg>
          {showTextInput && (
            <div
              className="absolute bg-white border border-gray-300 p-2"
              style={{ top: textPosition.y, left: textPosition.x }}
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                autoFocus
                className="border border-gray-300 p-1"
              />
              <button onClick={handleTextSubmit} className="bg-blue-500 text-white px-2 py-1 ml-2">
                Add
              </button>
            </div>
          )}
        </div>
      );
    }

    // Branch for PDFs:
    if (file.type.includes('pdf')) {
      return (
        <div
          className="relative"
          style={{
            width: canvasDimensions.width ? `${canvasDimensions.width}px` : 'auto',
            height: canvasDimensions.height ? `${canvasDimensions.height}px` : 'auto',
          }}
        >
          {/* The PDF canvas (zIndex:1) */}
          <canvas
            ref={pdfCanvasRef}
            className="border border-gray-300"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />

          {/* The SVG overlay (zIndex:2) */}
          <svg
            ref={overlayRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${canvasDimensions.width}px`,
              height: `${canvasDimensions.height}px`,
              zIndex: 2,
              pointerEvents: 'auto',
              backgroundColor: 'rgba(255, 0, 0, 0.1)', // Debug tint
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {annotations.map((anno) => (
              <Annotation key={anno.id} annotation={anno} />
            ))}
            {currentAnnotation && <Annotation annotation={currentAnnotation} />}
          </svg>

          {showTextInput && (
            <div
              className="absolute bg-white border border-gray-300 p-2"
              style={{ top: textPosition.y, left: textPosition.x }}
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                autoFocus
                className="border border-gray-300 p-1"
              />
              <button onClick={handleTextSubmit} className="bg-blue-500 text-white px-2 py-1 ml-2">
                Add
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between mt-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      );
    }

    // Branch for Word documents (DOCX):
    if (file.type.includes('word')) {
      if (!docHtml) {
        mammoth
          .convertToHtml({ arrayBuffer: file.url })
          .then((result) => setDocHtml(result.value))
          .catch((err) => console.error('Error converting DOCX: ', err));
      }
      return (
        <div className="border border-gray-300 p-4">
          {docHtml ? (
            <div dangerouslySetInnerHTML={{ __html: docHtml }} />
          ) : (
            <p>Loading document preview...</p>
          )}
        </div>
      );
    }

    // Branch for Excel files (placeholder):
    if (file.type.includes('excel')) {
      return (
        <div className="border border-gray-300 p-4">
          <p>Excel preview functionality goes here. Parse the file and render a table.</p>
        </div>
      );
    }

    // Fallback for unsupported file types:
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
          <p className="mt-4 text-sm text-gray-600">
            Preview not available. Use annotation tools below.
          </p>
        </div>
      </div>
    );
  };


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
          <text x={annotation.x} y={annotation.y} fill="black" fontSize="16">
            {annotation.text}
          </text>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">File Viewer & Annotator</h1>
      <FileUpload handleFileUpload={handleFileUpload} />
      {file && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">File Preview</h2>
          {renderFilePreview()}
        </div>
      )}
      {file && (
        <AnnotationTools currentTool={currentTool} setCurrentTool={setCurrentTool} />
      )}
      {annotations.length > 0 && (
        <AnnotationsList annotations={annotations} />
      )}
    </div>
  );
}

export default App;
