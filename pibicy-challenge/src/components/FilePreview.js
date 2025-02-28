import React, { useEffect, useRef } from 'react';
import AnnotationOverlay from './AnnotationOverlay';
import TextInput from './TextInput';

const FilePreview = ({
    file,
    annotations,
    currentTool,
    currentAnnotation,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTextClick,
    showTextInput,
    textPosition,
    textInput,
    onTextChange,
    onTextSubmit,
    setImgDimensions,
    canvasDimensions,
    pdfCanvasRef,
    imgDimensions,
}) => {
    const imageRef = useRef(null);

    useEffect(() => {
        if (file.type.includes('image') && imageRef.current) {
            setImgDimensions({
                width: imageRef.current.offsetWidth,
                height: imageRef.current.offsetHeight,
            });
        }
    }, [file, setImgDimensions]);

    // Render based on file type
    if (file.type.includes('image')) {
        return (
            <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                    ref={imageRef}
                    src={file.url}
                    alt={file.name}
                    style={{ display: 'block' }}
                    className="border border-gray-300"
                />
                <AnnotationOverlay
                    width={imgDimensions.width}
                    height={imgDimensions.height}
                    annotations={annotations}
                    currentAnnotation={currentAnnotation}
                    currentTool={currentTool}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onClick={currentTool === 'text' ? onTextClick : undefined}
                />
                {showTextInput && (
                    <TextInput
                        textPosition={textPosition}
                        textInput={textInput}
                        onTextChange={onTextChange}
                        onTextSubmit={onTextSubmit}
                    />
                )}
            </div>
        );
    }

    if (file.type.includes('pdf')) {
        return (
            <div
                className="relative"
                style={{
                    width: canvasDimensions.width ? `${canvasDimensions.width}px` : 'auto',
                    height: canvasDimensions.height ? `${canvasDimensions.height}px` : 'auto',
                }}
            >
                <canvas
                    ref={pdfCanvasRef}
                    className="border border-gray-300"
                    style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}
                />
                <AnnotationOverlay
                    width={canvasDimensions.width}
                    height={canvasDimensions.height}
                    annotations={annotations}
                    currentAnnotation={currentAnnotation}
                    currentTool={currentTool}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onClick={currentTool === 'text' ? onTextClick : undefined}
                />
                {showTextInput && (
                    <TextInput
                        textPosition={textPosition}
                        textInput={textInput}
                        onTextChange={onTextChange}
                        onTextSubmit={onTextSubmit}
                    />
                )}
            </div>
        );
    }

    // Fallback rendering for other file types
    return (
        <div className="relative border border-gray-300 bg-gray-100 w-full h-96 flex items-center justify-center">
            <p>Preview not available for this file type.</p>
        </div>
    );
};

export default FilePreview;
