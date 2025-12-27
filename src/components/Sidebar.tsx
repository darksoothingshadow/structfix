import React from 'react';
import { Files, Clock, Settings, FolderClosed } from 'lucide-react';

export function Sidebar() {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-[calc(100vh-64px)]">
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Workspace</h3>
        <nav className="space-y-1">
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-white text-green-900 border border-gray-200 shadow-sm">
            <Files className="mr-3 flex-shrink-0 h-4 w-4 text-green-600" />
            Current File
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900">
            <Clock className="mr-3 flex-shrink-0 h-4 w-4 text-gray-400" />
            Recent
          </a>
          <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900">
            <FolderClosed className="mr-3 flex-shrink-0 h-4 w-4 text-gray-400" />
            Archive
          </a>
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-gray-200">
        <a href="#" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900">
          <Settings className="mr-3 flex-shrink-0 h-4 w-4 text-gray-400" />
          Settings
        </a>
      </div>
    </div>
  );
}
