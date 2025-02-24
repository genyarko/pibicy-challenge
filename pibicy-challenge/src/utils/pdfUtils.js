import * as pdfjsLib from 'pdfjs-dist';

export const loadPdf = (file, setPdf, setTotalPages) => {
    const buffer = file.url.slice(0);
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    loadingTask.promise
        .then((loadedPdf) => {
            setPdf(loadedPdf);
            setTotalPages(loadedPdf.numPages);
        })
        .catch((err) => console.error('Error rendering PDF: ', err));
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
            });
        });
    }
};