import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DocumentFixer } from './components/DocumentFixer';
import { Editor } from './components/Editor';
import { Block } from './types';

// Storage Keys
const KEY_BLOCKS = 'structfix_blocks';
const KEY_HTML = 'structfix_html';

function App() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [view, setView] = useState<'upload' | 'editor'>('upload');

  // Load from Storage on Mount
  useEffect(() => {
    const savedBlocks = localStorage.getItem(KEY_BLOCKS);
    const savedHtml = localStorage.getItem(KEY_HTML);

    if (savedBlocks && JSON.parse(savedBlocks).length > 0) {
      setBlocks(JSON.parse(savedBlocks));
      if (savedHtml) {
        // Reconstruct Blob URL
        const blob = new Blob([savedHtml], { type: 'text/html' });
        setPdfUrl(URL.createObjectURL(blob));
      }
      setView('editor');
    }
  }, []);

  const handleConvert = (newBlocks: Block[], url: string | null, html?: string) => {
    setBlocks(newBlocks);
    setPdfUrl(url);
    setView('editor');
    
    // Save to Storage
    localStorage.setItem(KEY_BLOCKS, JSON.stringify(newBlocks));
    if (html) {
      try {
        localStorage.setItem(KEY_HTML, html);
      } catch (e) {
        console.warn('HTML too large for localStorage', e);
      }
    }
  };

  const handleAutoSave = (newBlocks: Block[]) => {
    localStorage.setItem(KEY_BLOCKS, JSON.stringify(newBlocks));
  };

  const handleBack = () => {
    if (window.confirm('Are you sure you want to go back? Unsaved changes will be lost.')) {
      setView('upload');
      setBlocks([]);
      setPdfUrl(null);
      // Clear Storage
      localStorage.removeItem(KEY_BLOCKS);
      localStorage.removeItem(KEY_HTML);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar always visible */}
        <Sidebar />
        
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {view === 'upload' ? (
             <div className="flex-1 overflow-auto p-8">
                <DocumentFixer onConvert={handleConvert} />
             </div>
          ) : (
            <Editor 
              initialBlocks={blocks} 
              pdfUrl={pdfUrl} 
              onBack={handleBack} 
              onAutoSave={handleAutoSave}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
