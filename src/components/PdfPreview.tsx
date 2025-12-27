import React from 'react';
import { Download, X, Eye } from 'lucide-react';

interface PdfPreviewProps {
  pdfUrl: string;
  onClose: () => void;
}

export function PdfPreview({ pdfUrl, onClose }: PdfPreviewProps) {
  return (
    <div className="flex-1 border-r border-gray-200 bg-gray-100 flex flex-col min-w-0 w-1/2">
      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Eye size={16} className="text-gray-600" />
          <span>Original Document</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={pdfUrl}
            download="document.pdf"
            className="p-1 hover:bg-gray-100 rounded text-blue-600 text-xs font-medium flex items-center gap-1"
            title="Download PDF"
          >
            <Download size={14} />
            Download
          </a>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded text-gray-500"
            title="Close PDF Preview"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 w-full h-full relative bg-gray-200/50">
        <iframe
          src={pdfUrl}
          className="w-full h-full block"
          title="PDF Viewer"
        >
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
            <p className="mb-2">Unable to render PDF.</p>
            <a href={pdfUrl} download="document.pdf" className="text-blue-600 underline">
              Download instead
            </a>
          </div>
        </iframe>
      </div>
    </div>
  );
}
