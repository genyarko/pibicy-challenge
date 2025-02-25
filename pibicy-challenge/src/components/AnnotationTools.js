import React from 'react';
import { Square, Circle, Type } from 'lucide-react';

const AnnotationTools = ({ currentTool, setCurrentTool }) => {
    const handleToolClick = (toolName) => {
        setCurrentTool(toolName);
        console.log(`Tool selected: ${toolName}`);
    };

    return (
        <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Annotation Tools</h2>
            <div className="flex gap-2">
                <button
                    className={`p-2 border rounded ${currentTool === 'line' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'
                        }`}
                    onClick={() => handleToolClick('line')}
                    title="Draw Line"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="19" x2="19" y2="5" />
                    </svg>
                </button>
                <button
                    className={`p-2 border rounded ${currentTool === 'rectangle' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'
                        }`}
                    onClick={() => handleToolClick('rectangle')}
                    title="Draw Rectangle"
                >
                    <Square size={24} />
                </button>
                <button
                    className={`p-2 border rounded ${currentTool === 'circle' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'
                        }`}
                    onClick={() => handleToolClick('circle')}
                    title="Draw Circle"
                >
                    <Circle size={24} />
                </button>
                <button
                    className={`p-2 border rounded ${currentTool === 'text' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'
                        }`}
                    onClick={() => handleToolClick('text')}
                    title="Add Text"
                >
                    <Type size={24} />
                </button>
                <button
                    className={`p-2 border rounded ${currentTool === 'highlight' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'
                        }`}
                    onClick={() => handleToolClick('highlight')}
                    title="Add Transparent Highlight"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" opacity="0.3" />
                    </svg>
                </button>
                <button
                    className={`p-2 border rounded ${currentTool === 'opaque' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'
                        }`}
                    onClick={() => handleToolClick('opaque')}
                    title="Add Opaque Highlight"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                    </svg>
                </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
                {currentTool
                    ? `Selected tool: ${currentTool}. Click and drag on the document to create an annotation.`
                    : 'Select a tool to begin annotating.'}
            </p>
        </div>
    );
};

export default AnnotationTools;
