// pdfUtils.js
import * as pdfjsLib from 'pdfjs-dist';

export const loadPdf = (file, setPdf, setTotalPages) => {
    const buffer = file.url.slice(0);
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    loadingTask.promise
        .then((loadedPdf) => {
            setPdf(loadedPdf);
            setTotalPages(loadedPdf.numPages);
        })
        .catch((err) => {
            console.error('Error rendering PDF:', err);
            alert('Failed to load PDF document. Please check the file and try again.');
        });
};

export const renderPage = (pdf, pageNumber, pdfCanvasRef, overlayRef) => {
    if (pdf && pdfCanvasRef.current) {
        pdf.getPage(pageNumber).then((page) => {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = pdfCanvasRef.current;
            const context = canvas.getContext('2d');

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const renderContext = {
                canvasContext: context,
                viewport,
            };
            page.render(renderContext).promise.then(() => {
                if (overlayRef.current) {
                    overlayRef.current.setAttribute('width', canvas.width);
                    overlayRef.current.setAttribute('height', canvas.height);
                }
            }).catch((err) => {
                console.error('Error rendering page:', err);
                alert('Failed to render the PDF page.');
            });
        }).catch((err) => {
            console.error('Error retrieving PDF page:', err);
            alert('Failed to retrieve the PDF page.');
        });
    }
};
