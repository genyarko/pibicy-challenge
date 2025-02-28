import React from 'react';

const AnnotationOverlay = ({
    width,
    height,
    annotations = [],
    currentAnnotation,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onClick
}) => {
    // Helper: Render a single annotation based on its type
    const renderAnnotation = (annotation) => {
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
                const rectWidth = annotation.endX - annotation.startX;
                const rectHeight = annotation.endY - annotation.startY;
                return (
                    <rect
                        x={annotation.startX}
                        y={annotation.startY}
                        width={rectWidth}
                        height={rectHeight}
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
                const rectWidth = annotation.endX - annotation.startX;
                const rectHeight = annotation.endY - annotation.startY;
                return (
                    <rect
                        x={annotation.startX}
                        y={annotation.startY}
                        width={rectWidth}
                        height={rectHeight}
                        fill="yellow"
                        fillOpacity="0.3"
                    />
                );
            }
            case 'opaque': {
                const rectWidth = annotation.endX - annotation.startX;
                const rectHeight = annotation.endY - annotation.startY;
                return (
                    <rect
                        x={annotation.startX}
                        y={annotation.startY}
                        width={rectWidth}
                        height={rectHeight}
                        fill="black"
                    />
                );
            }
            default:
                return null;
        }
    };

    return (
        <svg
            width={width}
            height={height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 10,
                pointerEvents: 'auto'
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onClick={onClick}
        >
            {annotations.map((anno) => (
                <React.Fragment key={anno.id}>
                    {renderAnnotation(anno)}
                </React.Fragment>
            ))}
            {currentAnnotation && renderAnnotation(currentAnnotation)}
        </svg>
    );
};

export default AnnotationOverlay;
