import React from 'react';

const AnnotationsList = ({ annotations }) => {
    return (
        <div>
            <h2 className="text-lg font-semibold mb-2">Annotations ({annotations.length})</h2>
            <div className="border rounded p-2 bg-gray-50 max-h-40 overflow-y-auto">
                <ul className="text-sm">
                    {annotations.map((anno) => (
                        <li key={anno.id} className="py-1">
                            {anno.type === 'text'
                                ? `Text: "${anno.text}" at (${Math.round(anno.x)}, ${Math.round(anno.y)})`
                                : `${anno.type} from (${Math.round(anno.startX)}, ${Math.round(anno.startY)}) to (${Math.round(anno.endX)}, ${Math.round(anno.endY)})`}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AnnotationsList; // Ensure default export