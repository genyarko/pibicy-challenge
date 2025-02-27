import React, { useState } from 'react';
import { Upload } from 'lucide-react';

const FileUpload = ({ handleFileUpload }) => {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Create a synthetic event to pass the files to your existing handler.
            const event = {
                target: { files: e.dataTransfer.files },
            };
            handleFileUpload(event);
            e.dataTransfer.clearData();
        }
    };

    return (
        <div
            className={`mb-6 p-4 border border-dashed border-gray-300 rounded bg-gray-50 ${isDragActive ? 'bg-gray-100' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="flex items-center justify-center">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="w-10 h-10 text-gray-500 mb-2" />
                    <span className="text-sm text-gray-600">
                        Drag and drop a file here or click to select (.pdf, .doc, .xls, .jpg, .png, .msg)
                    </span>
                    <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.msg"
                    />
                </label>
            </div>
        </div>
    );
};

export default FileUpload;
