import React, { useState, useRef, useCallback } from 'react';
import { Block, BlockType } from '../types';
import { generateId } from '../utils/document-utils';

export const useEditor = (initialBlocks: Block[] = []) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [history, setHistory] = useState<Block[][]>([initialBlocks]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  
  const lastSelectedId = useRef<string | null>(null);
  const anchorId = useRef<string | null>(null);
  const blockRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const textChangeTimeoutRef = useRef<any>(null);

  const pushHistory = useCallback((newBlocks: Block[]) => {
      setHistory(prev => {
          const currentHistory = prev.slice(0, historyIndex + 1);
          if (currentHistory.length > 50) currentHistory.shift();
          return [...currentHistory, newBlocks];
      });
      setHistoryIndex(prev => {
          const currentHistory = history.slice(0, prev + 1);
          if (currentHistory.length > 50) return currentHistory.length; // adjusted logic slightly
          return prev + 1;
      });
      // Fix history index update logic to match state update
      setHistoryIndex(prev => Math.min(prev + 1, 50)); // Simplified for now, actually need to sync with history length
  }, [history, historyIndex]);

  // Correct history logic
  const commitBlocks = useCallback((newBlocks: Block[], saveHistory = true) => {
      setBlocks(newBlocks);
      if (saveHistory) {
          setHistory(prev => {
              const currentHistory = prev.slice(0, historyIndex + 1);
              if (currentHistory.length > 50) currentHistory.shift();
              return [...currentHistory, newBlocks];
          });
          setHistoryIndex(prev => {
             const newLen = Math.min(prev + 1, 50); // approximate
             // Better:
             return historyIndex + 1 >= 50 ? 49 : historyIndex + 1;
          });
          // Actually, let's just use the simple logic from original file but adapted for hooks
          setHistoryIndex(prev => prev + 1); 
      }
  }, [historyIndex]);

  // Re-implementing history logic correctly
  const updateHistory = (newBlocks: Block[]) => {
      const currentHistory = history.slice(0, historyIndex + 1);
      if (currentHistory.length > 50) currentHistory.shift();
      const nextHistory = [...currentHistory, newBlocks];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
  };

  const commit = (newBlocks: Block[], saveHistory = true) => {
      setBlocks(newBlocks);
      if (saveHistory) {
          updateHistory(newBlocks);
      }
  };

  const undo = () => {
      if (historyIndex > 0) {
          const prevIndex = historyIndex - 1;
          const prevBlocks = history[prevIndex];
          setBlocks(prevBlocks);
          setHistoryIndex(prevIndex);
          setEditingId(null); 
      }
  };

  const redo = () => {
      if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          const nextBlocks = history[nextIndex];
          setBlocks(nextBlocks);
          setHistoryIndex(nextIndex);
          setEditingId(null);
      }
  };

  const initEditor = (initialBlocks: Block[]) => {
      setBlocks(initialBlocks);
      setHistory([initialBlocks]);
      setHistoryIndex(0);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
    setBlocks(newBlocks);

    if (textChangeTimeoutRef.current) clearTimeout(textChangeTimeoutRef.current);
    textChangeTimeoutRef.current = setTimeout(() => {
        updateHistory(newBlocks);
    }, 1000);
  };

  const addBlock = (afterId?: string) => {
    let targetIndex = blocks.length - 1;
    let targetBlock = blocks[targetIndex];

    if (afterId) {
      targetIndex = blocks.findIndex(b => b.id === afterId);
      targetBlock = blocks[targetIndex];
    }

    if (blocks.length === 0) {
      const newBlock: Block = { id: generateId(), content: '', type: 'p', depth: 0 };
      const newBlocks = [newBlock];
      commit(newBlocks);
      
      setEditingId(newBlock.id);
      setSelectedIds(new Set([newBlock.id]));
      lastSelectedId.current = newBlock.id;
      anchorId.current = newBlock.id;
      setTimeout(() => blockRefs.current[newBlock.id]?.focus(), 10);
      return;
    }
    
    if (targetIndex === -1) return;
    
    const nextType = (['ul', 'ol', 'abc'].includes(targetBlock.type)) ? targetBlock.type : 'p';

    const newBlock: Block = {
      id: generateId(),
      content: '',
      type: nextType,
      depth: targetBlock.depth
    };
    
    const newBlocks = [...blocks];
    newBlocks.splice(targetIndex + 1, 0, newBlock);
    
    commit(newBlocks);
    
    setEditingId(newBlock.id);
    setSelectedIds(new Set([newBlock.id]));
    lastSelectedId.current = newBlock.id;
    anchorId.current = newBlock.id;

    setTimeout(() => {
      blockRefs.current[newBlock.id]?.focus();
    }, 10);
  };

  const removeBlock = (id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;

    const prevBlockId = index > 0 ? blocks[index - 1].id : null;
    
    const newBlocks = blocks.filter(b => b.id !== id);
    commit(newBlocks);

    if (prevBlockId) {
      setSelectedIds(new Set([prevBlockId]));
      setEditingId(prevBlockId);
      lastSelectedId.current = prevBlockId;
      anchorId.current = prevBlockId;
      setTimeout(() => {
        const el = blockRefs.current[prevBlockId];
        if (el) {
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
      }, 10);
    } else if (newBlocks.length > 0) {
         const nextBlockId = newBlocks[0].id;
         setSelectedIds(new Set([nextBlockId]));
         setEditingId(nextBlockId);
         lastSelectedId.current = nextBlockId;
         anchorId.current = nextBlockId;
    } else {
        setSelectedIds(new Set());
        setEditingId(null);
        lastSelectedId.current = null;
        anchorId.current = null;
    }
  };

  const handleBlockClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editingId === id) return;

    if (e.metaKey || e.ctrlKey) {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        lastSelectedId.current = id;
        anchorId.current = id;
        setEditingId(null);
        return;
    }
    
    if (e.shiftKey && anchorId.current) {
      const anchorIndex = blocks.findIndex(b => b.id === anchorId.current);
      const currentIndex = blocks.findIndex(b => b.id === id);
      
      if (anchorIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(anchorIndex, currentIndex);
          const end = Math.max(anchorIndex, currentIndex);
          const newSelected = new Set<string>();
          for (let i = start; i <= end; i++) {
            newSelected.add(blocks[i].id);
          }
          
          setSelectedIds(newSelected);
          lastSelectedId.current = id; 
          setEditingId(null);
          return;
      }
    }

    setSelectedIds(new Set([id]));
    lastSelectedId.current = id;
    anchorId.current = id;
    setEditingId(null);
  };

  const handleBlockDoubleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEditingId(id);
    setSelectedIds(new Set([id]));
    lastSelectedId.current = id;
    anchorId.current = id;
    setTimeout(() => blockRefs.current[id]?.focus(), 0);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    lastSelectedId.current = null;
    anchorId.current = null;
    setEditingId(null);
  };

  const bulkUpdateType = (type: BlockType) => {
    const newBlocks = blocks.map(b => selectedIds.has(b.id) ? { ...b, type } : b);
    commit(newBlocks);
  };

  const bulkDelete = () => {
    if (selectedIds.size === 0) return;

    const sortedIndices = blocks
        .map((b, i) => ({ id: b.id, index: i }))
        .filter(item => selectedIds.has(item.id))
        .sort((a, b) => a.index - b.index);
    
    const firstIdx = sortedIndices[0].index;
    let nextFocusId: string | null = null;
    
    if (firstIdx > 0) {
        nextFocusId = blocks[firstIdx - 1].id;
    } else if (firstIdx + sortedIndices.length < blocks.length) {
        nextFocusId = blocks[firstIdx + sortedIndices.length].id;
    }

    const newBlocks = blocks.filter(b => !selectedIds.has(b.id));
    commit(newBlocks);
    
    if (nextFocusId && newBlocks.some(b => b.id === nextFocusId)) {
        setSelectedIds(new Set([nextFocusId]));
        lastSelectedId.current = nextFocusId;
        anchorId.current = nextFocusId;
    } else {
        clearSelection();
    }
  };

  const handleFormat = (command: 'bold' | 'italic') => {
    if (editingId) {
      document.execCommand(command, false);
    } else {
      const tag = command === 'bold' ? 'b' : 'i';
      const newBlocks = blocks.map(b => {
        if (selectedIds.has(b.id)) {
           const isWrapped = b.content.startsWith(`<${tag}>`) && b.content.endsWith(`</${tag}>`);
           if (isWrapped) {
               return { ...b, content: b.content.slice(tag.length + 2, -(tag.length + 3)) };
           } else {
               return { ...b, content: `<${tag}>${b.content}</${tag}>` };
           }
        }
        return b;
      });
      commit(newBlocks);
    }
  };

  const indentSelection = (delta: number) => {
    const newBlocks = blocks.map(b => {
      if (selectedIds.has(b.id)) {
        const newDepth = delta === -1 
          ? Math.max(0, b.depth - 1) 
          : Math.min(5, b.depth + 1);
        return { ...b, depth: newDepth };
      }
      return b;
    });
    commit(newBlocks);
  };

  const moveBlock = (dragId: string, targetId: string) => {
    const dragIndex = blocks.findIndex(b => b.id === dragId);
    const targetIndex = blocks.findIndex(b => b.id === targetId);
    
    if (dragIndex === -1 || targetIndex === -1 || dragIndex === targetIndex) return;
    
    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(targetIndex, 0, draggedBlock);
    
    commit(newBlocks);
  };

  return {
    blocks,
    setBlocks,
    history,
    historyIndex,
    historyLength: history.length,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    selectedIds,
    setSelectedIds,
    editingId,
    setEditingId,
    draggedBlockId,
    setDragBlock: setDraggedBlockId,
    moveBlock,
    handleBlockClick,
    handleBlockDoubleClick,
    clearSelection,
    addBlock,
    removeBlock,
    updateBlock,
    bulkUpdateType,
    bulkDelete,
    handleFormat,
    indentSelection,
    blockRefs,
    initEditor,
    lastSelectedId,
    anchorId,
    commit
  };
};
