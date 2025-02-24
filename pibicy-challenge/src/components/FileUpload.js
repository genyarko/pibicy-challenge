import React from 'react';
import { Upload } from 'lucide-react';

const FileUpload = ({ handleFileUpload }) => {
    return (
        <div className="mb-6 p-4 border border-dashed border-gray-300 rounded bg-gray-50">
            <div className="flex items-center justify-center">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="w-10 h-10 text-gray-500 mb-2" />
                    <span className="text-sm text-gray-600">
                        Upload file (.pdf, .doc, .xls, .jpg, .png, .msg)
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

export default FileUpload; // Ensure default export