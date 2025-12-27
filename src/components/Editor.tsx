import React, { useRef, useEffect, useMemo, useState } from 'react';
import { 
  Download, 
  Undo, 
  Redo, 
  Type, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  Trash2, 
  GripVertical,
  Plus,
  X,
  Bold,
  Italic,
  SortAsc,
  Eye
} from 'lucide-react';
import { Button } from './ui/button';
import { useEditor } from '../hooks/useEditor';
import { Block, BlockType } from '../types';
import { convertToXml, convertToHtml, downloadFile } from '../utils/document-utils';
import { ContentBlock } from './ContentBlock';

interface EditorProps {
  initialBlocks: Block[];
  pdfUrl: string | null;
  onBack: () => void;
}

interface EnrichedBlock extends Block {
  level: number;
  lines: { depth: number; type: 'vertical' | 'corner' | 'branch' }[];
}

const isCursorAtStart = (el: HTMLElement) => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  
  const preRange = range.cloneRange();
  preRange.selectNodeContents(el);
  preRange.setEnd(range.endContainer, range.endOffset);
  return preRange.toString().trim().length === 0;
};

const isCursorAtEnd = (el: HTMLElement) => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  
  const postRange = range.cloneRange();
  postRange.selectNodeContents(el);
  postRange.setStart(range.endContainer, range.endOffset);
  return postRange.toString().trim().length === 0;
};

export function Editor({ initialBlocks, pdfUrl, onBack }: EditorProps) {
  const {
    blocks,
    historyIndex,
    history,
    selectedIds,
    editingId,
    setEditingId,
    draggedBlockId,
    updateBlock,
    addBlock,
    removeBlock,
    moveBlock,
    handleBlockClick,
    handleBlockDoubleClick,
    setDragBlock,
    clearSelection,
    undo,
    redo,
    canUndo,
    canRedo,
    bulkUpdateType,
    bulkDelete,
    handleFormat,
    indentSelection,
    blockRefs,
    lastSelectedId,
    anchorId
  } = useEditor(initialBlocks);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'top' | 'bottom' } | null>(null);
  const [hoveredHandleId, setHoveredHandleId] = useState<string | null>(null);

  // Compute enriched blocks with levels and connector lines
  const enrichedBlocks = useMemo(() => {
    let h1Active = false;
    let h2Active = false;
    
    const withLevels = blocks.map(block => {
      let level = 0;
      if (block.type === 'h1') {
        level = block.depth;
        h1Active = true;
        h2Active = false;
      } else if (block.type === 'h2') {
        level = 1 + block.depth;
        h2Active = true;
      } else {
        let base = 0;
        if (h2Active) base = 2;
        else if (h1Active) base = 1;
        level = base + block.depth;
      }
      return { ...block, level };
    });

    return withLevels.map((block, index) => {
      const lines: { depth: number; type: 'vertical' | 'corner' | 'branch' }[] = [];
      for (let d = 0; d < block.level; d++) {
        let hasFutureInScope = false;
        for (let j = index + 1; j < withLevels.length; j++) {
          if (withLevels[j].level <= d) break;
          if (withLevels[j].level > d) { hasFutureInScope = true; break; }
        }
        const isImmediateParentLine = (d === block.level - 1);
        let type: 'vertical' | 'corner' | 'branch' = 'vertical';

        if (hasFutureInScope) {
          if (isImmediateParentLine) type = 'branch';
          else type = 'vertical';
        } else {
          if (isImmediateParentLine) type = 'corner';
        }
        
        if (!hasFutureInScope && !isImmediateParentLine) continue;
        lines.push({ depth: d, type });
      }
      return { ...block, lines } as EnrichedBlock;
    });
  }, [blocks]);

  // List counter tracking for ordered/alpha lists
  const listCounters: Record<number, { type: string, count: number }> = {};

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragBlock(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedBlockId === id) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'top' : 'bottom';

    setDropTarget({ id, position });
  };

  const handleDragEnd = () => {
    setDragBlock(null);
    setDropTarget(null);
    setHoveredHandleId(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedBlockId && dropTarget && draggedBlockId !== dropTarget.id) {
      const oldIndex = blocks.findIndex(b => b.id === draggedBlockId);
      let targetIndex = blocks.findIndex(b => b.id === dropTarget.id);
      
      if (oldIndex < targetIndex && dropTarget.position === 'top') {
        targetIndex -= 1;
      } else if (oldIndex > targetIndex && dropTarget.position === 'bottom') {
        targetIndex += 1;
      }
      
      if (oldIndex !== targetIndex) {
        moveBlock(draggedBlockId, blocks[targetIndex].id);
      }
    }
    handleDragEnd();
  };

  // Keyboard navigation handlers
  const handleBlockKeyDown = (e: React.KeyboardEvent, id: string) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      handleFormat('bold');
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      handleFormat('italic');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlock(id);
    } else if (e.key === 'Backspace') {
      const block = blocks.find(b => b.id === id);
      const isEmpty = !block?.content || block.content === '<br>' || block.content.trim() === '';
      
      if (isEmpty && blocks.length > 0) {
        e.preventDefault();
        removeBlock(id);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      indentSelection(e.shiftKey ? -1 : 1);
    } else if (e.key === 'ArrowUp') {
      const el = e.currentTarget as HTMLElement;
      if (isCursorAtStart(el)) {
        const index = blocks.findIndex(b => b.id === id);
        if (index > 0) {
          e.preventDefault();
          const prevId = blocks[index - 1].id;
          setEditingId(prevId);
          setTimeout(() => {
            const prevEl = blockRefs.current[prevId];
            if (prevEl) {
              prevEl.focus();
              const range = document.createRange();
              range.selectNodeContents(prevEl);
              range.collapse(false);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }, 0);
        }
      }
    } else if (e.key === 'ArrowDown') {
      const el = e.currentTarget as HTMLElement;
      if (isCursorAtEnd(el)) {
        const index = blocks.findIndex(b => b.id === id);
        if (index < blocks.length - 1) {
          e.preventDefault();
          const nextId = blocks[index + 1].id;
          setEditingId(nextId);
          setTimeout(() => blockRefs.current[nextId]?.focus(), 0);
        }
      }
    }
  };

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      handleFormat('bold');
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      handleFormat('italic');
      return;
    }

    if (editingId) return;

    if (selectedIds.size === 0 && blocks.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const firstId = blocks[0].id;
        lastSelectedId.current = firstId;
        anchorId.current = firstId;
      }
      return;
    }

    if (selectedIds.size === 0) return;

    const lastId = lastSelectedId.current;
    
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!lastId) return;

      const index = blocks.findIndex(b => b.id === lastId);
      if (index === -1) return;

      let nextIndex = index;
      if (e.key === 'ArrowUp' && index > 0) nextIndex = index - 1;
      else if (e.key === 'ArrowDown' && index < blocks.length - 1) nextIndex = index + 1;

      if (nextIndex !== index) {
        const nextId = blocks[nextIndex].id;
        if (e.shiftKey && anchorId.current) {
          const anchorIndex = blocks.findIndex(b => b.id === anchorId.current);
          if (anchorIndex !== -1) {
            const start = Math.min(anchorIndex, nextIndex);
            const end = Math.max(anchorIndex, nextIndex);
            lastSelectedId.current = nextId;
            blockRefs.current[nextId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        } else {
          lastSelectedId.current = nextId;
          anchorId.current = nextId;
          blockRefs.current[nextId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (lastId) addBlock(lastId);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      bulkDelete();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      indentSelection(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      clearSelection();
    } else if (e.key === '1') { e.preventDefault(); bulkUpdateType('h1'); }
    else if (e.key === '2') { e.preventDefault(); bulkUpdateType('h2'); }
    else if (e.key === '3') { e.preventDefault(); bulkUpdateType('p'); }
    else if (e.key === '4') { e.preventDefault(); bulkUpdateType('ul'); }
    else if (e.key === '5') { e.preventDefault(); bulkUpdateType('ol'); }
    else if (e.key === '6') { e.preventDefault(); bulkUpdateType('abc'); }
  };

  const handleDownload = (format: 'xml' | 'html' | 'json') => {
    let content = '';
    let mimeType = '';
    let extension = '';

    switch (format) {
      case 'xml':
        content = convertToXml(blocks as any);
        mimeType = 'application/xml';
        extension = 'xml';
        break;
      case 'html':
        content = convertToHtml(blocks as any);
        mimeType = 'text/html';
        extension = 'html';
        break;
      case 'json':
        content = JSON.stringify(blocks, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
    }

    downloadFile(content, `document.${extension}`, mimeType);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Toolbar */}
      <div className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-900">
            <X className="w-4 h-4 mr-2" />
            Close Editor
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo}>
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo}>
              <Redo className="w-4 h-4" />
            </Button>
            <span className="text-xs text-gray-400 ml-2">
              {historyIndex + 1} / {history.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleDownload('json')}>
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button variant="outline" onClick={() => handleDownload('xml')}>
            <Download className="w-4 h-4 mr-2" />
            XML
          </Button>
          <Button variant="outline" onClick={() => handleDownload('html')}>
            <Download className="w-4 h-4 mr-2" />
            HTML
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: PDF Preview */}
        {pdfUrl && (
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
                  onClick={onBack}
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
                  <a href={pdfUrl} download="document.pdf" className="text-blue-600 underline">Download instead</a>
                </div>
              </iframe>
            </div>
          </div>
        )}

        {/* Right Panel: Block Editor */}
        <div 
          className="flex-1 overflow-y-auto bg-white relative outline-none"
          tabIndex={0}
          ref={containerRef}
          onKeyDown={handleGlobalKeyDown}
          onClick={clearSelection}
        >
          <div className="max-w-3xl mx-auto py-12 pr-8 pl-16 pb-48">
            <div className="mb-8 pb-4 border-b border-gray-100 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold mb-1">Block Editor</h2>
                <p className="text-gray-500">
                  Click to select. Shift+Click range. Double-click to edit.
                </p>
              </div>
              <div className="text-xs text-gray-400 hidden sm:block text-right space-y-1">
                <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-sans">1-6</kbd> set type</div>
                <div><kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-sans">Tab</kbd> indent</div>
              </div>
            </div>

            <div className="space-y-1 min-h-[300px] relative">
              {enrichedBlocks.length === 0 ? (
                <div 
                  onClick={(e) => { e.stopPropagation(); addBlock(); }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 cursor-pointer hover:text-gray-500 transition-colors border-2 border-dashed border-gray-100 rounded-xl m-4"
                >
                  <Plus size={32} className="mb-2 opacity-50" />
                  <p className="font-medium">List is empty</p>
                  <p className="text-sm">Click here to start writing</p>
                </div>
              ) : (
                enrichedBlocks.map((block) => {
                  const isDropTarget = dropTarget?.id === block.id;
                  const isSelected = selectedIds.has(block.id);
                  const isEditing = editingId === block.id;

                  // Clear forward list counters
                  for (let d = block.depth + 1; d <= 6; d++) {
                    delete listCounters[d];
                  }

                  let listLabel = '';
                  if (block.type === 'ol' || block.type === 'abc') {
                    const current = listCounters[block.depth] || { type: block.type, count: 0 };
                    
                    if (current.type !== block.type) {
                      current.type = block.type;
                      current.count = 1;
                    } else {
                      current.count += 1;
                    }
                    listCounters[block.depth] = current;

                    if (block.type === 'ol') {
                      listLabel = `${current.count}.`;
                    } else {
                      const letters = 'abcdefghijklmnopqrstuvwxyz';
                      const idx = (current.count - 1) % 26;
                      listLabel = `${letters[idx]})`;
                    }
                  } else {
                    delete listCounters[block.depth];
                  }

                  const indentPixels = block.level * 24;
                  
                  return (
                    <div 
                      key={block.id}
                      draggable={!isEditing} 
                      onDragStart={(e) => handleDragStart(e, block.id)}
                      onDragOver={(e) => handleDragOver(e, block.id)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => handleBlockClick(e, block.id)}
                      onDoubleClick={(e) => handleBlockDoubleClick(e, block.id)}
                      className={`
                        group relative rounded-md transition-colors duration-100
                        ${draggedBlockId === block.id ? 'opacity-30 bg-gray-50' : ''}
                        ${isSelected && !isEditing ? 'bg-blue-50 ring-1 ring-blue-100' : ''}
                        ${!isSelected && !isEditing ? 'hover:bg-gray-50' : ''}
                        ${isEditing ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'cursor-default'}
                      `}
                      style={{ minHeight: '36px' }}
                    >
                      {block.lines.map(line => (
                        <div 
                          key={line.depth}
                          className="absolute pointer-events-none border-gray-300"
                          style={{ left: `${line.depth * 24}px`, top: 0, bottom: 0, width: '24px' }}
                        >
                          {(line.type === 'vertical' || line.type === 'branch') && (
                            <div className="absolute top-0 bottom-0 left-1/2 border-l border-gray-300" />
                          )}
                          {(line.type === 'corner') && (
                            <div className="absolute top-0 h-[18px] left-1/2 border-l border-gray-300" />
                          )}
                          {(line.type === 'branch' || line.type === 'corner') && (
                            <div className="absolute top-[18px] left-1/2 right-0 border-t border-gray-300" />
                          )}
                        </div>
                      ))}

                      {isDropTarget && (
                        <div className={`absolute left-0 right-0 h-0.5 bg-blue-600 z-20 shadow-sm ${dropTarget.position === 'top' ? '-top-[1px]' : '-bottom-[1px]'}`} />
                      )}

                      <div 
                        className={`absolute top-1.5 flex items-center justify-end pr-1 select-none z-10 ${isSelected || hoveredHandleId === block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        style={{ left: `${indentPixels}px`, width: '30px', transform: 'translateX(-100%)', paddingRight: '8px' }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div 
                          className="p-1 text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing rounded hover:bg-gray-200 transition-colors"
                          onMouseEnter={() => setHoveredHandleId(block.id)}
                          onMouseLeave={() => setHoveredHandleId(null)}
                        >
                          <GripVertical size={16} />
                        </div>
                      </div>

                      <div className="flex items-baseline flex-1 pr-4 py-1" style={{ paddingLeft: `${indentPixels}px` }}>
                        {block.type === 'ul' && (
                          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mr-1 select-none mt-0.5 z-10 relative">
                            <span className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
                          </div>
                        )}

                        {(block.type === 'ol' || block.type === 'abc') && (
                          <div className="w-auto min-w-[1.5rem] h-6 flex items-center justify-end flex-shrink-0 mr-2 select-none text-sm font-medium text-gray-500 mt-0.5 z-10 relative">
                            {listLabel}
                          </div>
                        )}
                        
                        <ContentBlock
                          blockRefs={blockRefs}
                          blockId={block.id}
                          html={block.content}
                          disabled={!isEditing}
                          tagName={['h1', 'h2'].includes(block.type) ? block.type : 'div'}
                          onChange={(val) => updateBlock(block.id, { content: val })}
                          onKeyDown={(e) => handleBlockKeyDown(e, block.id)}
                          onFocus={() => setEditingId(block.id)}
                          className={`
                            w-full outline-none break-words relative z-10 min-h-[28px]
                            ${block.type === 'h1' ? 'text-3xl font-bold mt-2 mb-1 text-gray-900 tracking-tight leading-tight' : ''}
                            ${block.type === 'h2' ? 'text-xl font-semibold mt-1 mb-1 text-gray-800 tracking-tight leading-tight' : ''}
                            ${['p', 'ul', 'ol', 'abc'].includes(block.type) ? 'text-base leading-7 text-gray-600' : ''}
                            ${isEditing ? 'cursor-text' : 'cursor-default pointer-events-none'}
                          `}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Floating Toolbar */}
          {(selectedIds.size > 0 || editingId) && (
            <div 
              className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-xl shadow-2xl px-2 py-2 flex items-center gap-1 z-50 animate-in slide-in-from-bottom-4 duration-300 border border-gray-700/50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              {selectedIds.size > 0 && !editingId && (
                <div className="px-3 text-sm font-medium text-gray-400 border-r border-gray-700 mr-1">
                  {selectedIds.size} selected
                </div>
              )}

              <button onClick={() => handleFormat('bold')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Bold (Ctrl+B)"><Bold size={18} /></button>
              <button onClick={() => handleFormat('italic')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Italic (Ctrl+I)"><Italic size={18} /></button>
              <div className="w-px h-6 bg-gray-700 mx-1" />
              
              <button onClick={() => bulkUpdateType('h1')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Heading 1 (1)"><Heading1 size={18} /></button>
              <button onClick={() => bulkUpdateType('h2')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Heading 2 (2)"><Heading2 size={18} /></button>
              <button onClick={() => bulkUpdateType('p')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Paragraph (3)"><Type size={18} /></button>
              <div className="w-px h-6 bg-gray-700 mx-1" />
              <button onClick={() => bulkUpdateType('ul')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Bullet List (4)"><List size={18} /></button>
              <button onClick={() => bulkUpdateType('ol')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Ordered List (5)"><ListOrdered size={18} /></button>
              <button onClick={() => bulkUpdateType('abc')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Alpha List (6)"><SortAsc size={18} /></button>
              
              <div className="w-px h-6 bg-gray-700 mx-1" />
              <button onClick={bulkDelete} className="p-2 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors" title="Delete Selected"><Trash2 size={18} /></button>
              
              <button onClick={clearSelection} className="ml-2 p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
