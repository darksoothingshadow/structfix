import React, { useRef, useMemo, useState } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { useEditor } from '../hooks/useEditor';
import { Block, BlockType } from '../types';
import { convertToXml, convertToHtml, downloadFile } from '../utils/document-utils';
import { ContentBlock } from './ContentBlock';
import { Toolbar } from './Toolbar';
import { FloatingToolbar } from './FloatingToolbar';
import { PdfPreview } from './PdfPreview';

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

  // Keyboard handlers
  const handleBlockKeyDown = (e: React.KeyboardEvent, id: string) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); handleFormat('bold'); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); handleFormat('italic'); return; }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlock(id);
    } else if (e.key === 'Backspace') {
      const block = blocks.find(b => b.id === id);
      const isEmpty = !block?.content || block.content === '<br>' || block.content.trim() === '';
      if (isEmpty && blocks.length > 0) { e.preventDefault(); removeBlock(id); }
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
              window.getSelection()?.removeAllRanges();
              window.getSelection()?.addRange(range);
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
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); handleFormat('bold'); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); handleFormat('italic'); return; }

    if (editingId) return;
    if (selectedIds.size === 0 && blocks.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        lastSelectedId.current = blocks[0].id;
        anchorId.current = blocks[0].id;
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
        lastSelectedId.current = nextId;
        if (!e.shiftKey) anchorId.current = nextId;
        blockRefs.current[nextId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } else if (e.key === 'Enter') { e.preventDefault(); if (lastId) addBlock(lastId); }
    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); bulkDelete(); }
    else if (e.key === 'Tab') { e.preventDefault(); indentSelection(e.shiftKey ? -1 : 1); }
    else if (e.key === 'Escape') { e.preventDefault(); clearSelection(); }
    else if (e.key === '1') { e.preventDefault(); bulkUpdateType('h1'); }
    else if (e.key === '2') { e.preventDefault(); bulkUpdateType('h2'); }
    else if (e.key === '3') { e.preventDefault(); bulkUpdateType('p'); }
    else if (e.key === '4') { e.preventDefault(); bulkUpdateType('ul'); }
    else if (e.key === '5') { e.preventDefault(); bulkUpdateType('ol'); }
    else if (e.key === '6') { e.preventDefault(); bulkUpdateType('abc'); }
  };

  const handleDownload = (format: 'xml' | 'html' | 'json') => {
    const configs = {
      xml: { content: convertToXml(blocks as any), mimeType: 'application/xml', ext: 'xml' },
      html: { content: convertToHtml(blocks as any), mimeType: 'text/html', ext: 'html' },
      json: { content: JSON.stringify(blocks, null, 2), mimeType: 'application/json', ext: 'json' }
    };
    const { content, mimeType, ext } = configs[format];
    downloadFile(content, `document.${ext}`, mimeType);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <Toolbar
        onBack={onBack}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        historyIndex={historyIndex}
        historyLength={history.length}
        onDownload={handleDownload}
      />

      <div className="flex-1 flex overflow-hidden">
        {pdfUrl && <PdfPreview pdfUrl={pdfUrl} onClose={onBack} />}

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
                <p className="text-gray-500">Click to select. Shift+Click range. Double-click to edit.</p>
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

                  for (let d = block.depth + 1; d <= 6; d++) delete listCounters[d];

                  let listLabel = '';
                  if (block.type === 'ol' || block.type === 'abc') {
                    const current = listCounters[block.depth] || { type: block.type, count: 0 };
                    if (current.type !== block.type) { current.type = block.type; current.count = 1; }
                    else current.count += 1;
                    listCounters[block.depth] = current;
                    listLabel = block.type === 'ol' ? `${current.count}.` : `${'abcdefghijklmnopqrstuvwxyz'[(current.count - 1) % 26]})`;
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
                          {line.type === 'corner' && (
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

          <FloatingToolbar
            selectedCount={selectedIds.size}
            isEditing={!!editingId}
            onFormat={handleFormat}
            onUpdateType={bulkUpdateType}
            onDelete={bulkDelete}
            onClearSelection={clearSelection}
          />
        </div>
      </div>
    </div>
  );
}
