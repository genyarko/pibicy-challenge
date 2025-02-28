import React, { useState, useCallback, useEffect } from 'react';
import { Upload } from 'lucide-react';

const FileUpload = ({ handleFileUpload }) => {
    const [isDragActive, setIsDragActive] = useState(false);

    // Process the files from an event
    const processFiles = useCallback(
        (files) => {
            if (files && files.length > 0) {
                // Create a synthetic event to pass the files
                const event = { target: { files } };
                handleFileUpload(event);
            }
        },
        [handleFileUpload]
    );

    // Local drag event handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragActive(false);
            processFiles(e.dataTransfer.files);
            e.dataTransfer.clearData();
        },
        [processFiles]
    );

    // Global drag/drop listeners (optional, for files dropped anywhere on the page)
    useEffect(() => {
        const handleGlobalDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleGlobalDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            processFiles(e.dataTransfer.files);
            e.dataTransfer.clearData();
        };

        window.addEventListener('dragover', handleGlobalDragOver);
        window.addEventListener('drop', handleGlobalDrop);

        return () => {
            window.removeEventListener('dragover', handleGlobalDragOver);
            window.removeEventListener('drop', handleGlobalDrop);
        };
    }, [processFiles]);

    return (
        <div
            className={`mb-6 p-4 border border-dashed border-gray-300 rounded bg-gray-50 ${isDragActive ? 'bg-gray-100' : ''
                }`}
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
