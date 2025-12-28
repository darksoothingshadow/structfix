import React, { useState, useRef, useEffect, useMemo, useLayoutEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  GripVertical, 
  Type, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  Trash2, 
  ArrowRight, 
  FileText, 
  Check,
  Code,
  RefreshCw,
  X,
  Plus,
  Upload,
  Loader2,
  Eye,
  Bold,
  Italic,
  SortAsc,
  Download,
  ChevronDown,
  FileJson,
  FileCode,
  Undo,
  Redo
} from 'lucide-react';

// --- Types ---

type BlockType = 'p' | 'h1' | 'h2' | 'ul' | 'ol' | 'abc';

interface Block {
  id: string;
  content: string; // Now stores HTML string
  type: BlockType;
  depth: number;
}

interface TreeNode {
  id: string;
  content: string;
  type: BlockType;
  children?: TreeNode[];
}

// --- Utils ---

const generateId = () => Math.random().toString(36).substring(2, 9);

const parseHtml = (html: string): Block[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: Block[] = [];

  const clean = (text: string) => text.replace(/[\s\n]+/g, ' ').trim();

  const walk = (node: Node, depth: number, listType: 'ul' | 'ol' | 'abc' | null) => {
    if (node.nodeType === Node.COMMENT_NODE) return;
    if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE') return;

    const tagName = node.nodeName.toLowerCase();

    // Atomic Blocks
    if (/^h[1-6]$/.test(tagName)) {
      const type = tagName === 'h1' ? 'h1' : 'h2';
      const content = clean(node.textContent || '');
      if (content) {
        blocks.push({ id: generateId(), content, type, depth: Math.min(depth, 5) });
      }
      return;
    }
    if (tagName === 'p') {
      // For P, we want to capture inner HTML for bold/italics if possible
      let content = '';
      if (node instanceof HTMLElement) {
         content = node.innerHTML.trim(); // Grab inner HTML to preserve <b>, <i> etc.
         // Basic sanitation: strip div/p tags if nested, but keep inline formatting
         content = content.replace(/<\/?(div|p|h[1-6]|ul|ol|li)[^>]*>/gi, ''); 
      } else {
         content = clean(node.textContent || '');
      }
      
      if (content) {
        blocks.push({ id: generateId(), content, type: listType || 'p', depth: Math.min(depth, 5) });
      }
      return;
    }

    // Container / Mixed Traversal
    const childNodes = Array.from(node.childNodes);
    let buffer = '';

    const flush = () => {
      const content = buffer.trim(); // Keep whitespace handling simple
      if (content) {
        blocks.push({
          id: generateId(),
          content,
          type: listType || 'p',
          depth: Math.min(depth, 5)
        });
      }
      buffer = '';
    };

    for (const child of childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        buffer += child.textContent || '';
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childTag = child.nodeName.toLowerCase();
        
        // Inline formatting tags we want to preserve
        const isFormatting = ['b', 'strong', 'i', 'em', 'u', 's', 'code', 'span', 'sub', 'sup', 'a'].includes(childTag);
        
        if (isFormatting) {
             buffer += (child as HTMLElement).outerHTML;
             continue;
        }

        // Block-level elements that cause a break
        const isBlock = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'br', 'section', 'article', 'blockquote', 'header', 'footer', 'main', 'nav'].includes(childTag);
        
        if (isBlock) {
          flush();
          
          if (childTag === 'br') {
             // just flush
          } else if (childTag === 'ul' || childTag === 'ol') {
             const nextDepth = listType ? depth + 1 : 0;
             // Detect type="a" for abc lists?
             let nextListType: 'ul' | 'ol' | 'abc' = childTag as 'ul' | 'ol';
             if (childTag === 'ol' && (child as HTMLElement).getAttribute('type') === 'a') {
                 nextListType = 'abc';
             }
             walk(child, nextDepth, nextListType);
          } else {
             walk(child, depth, listType);
          }
        } else {
          // Other elements -> treat as text content
          buffer += child.textContent || '';
        }
      }
    }
    flush();
  };

  walk(doc.body, 0, null);
  return blocks;
};

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

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const convertToXml = (nodes: TreeNode[]): string => {
    const escape = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    const visit = (node: TreeNode, indent: string) => {
        let xml = `${indent}<block id="${node.id}" type="${node.type}">\n`;
        xml += `${indent}  <content>${escape(node.content)}</content>\n`;
        
        if (node.children && node.children.length > 0) {
            xml += `${indent}  <children>\n`;
            node.children.forEach(child => {
                xml += visit(child, indent + '    ');
            });
            xml += `${indent}  </children>\n`;
        }
        
        xml += `${indent}</block>\n`;
        return xml;
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<document>\n';
    nodes.forEach(node => {
        xml += visit(node, '  ');
    });
    xml += '</document>';
    return xml;
};

const convertToHtml = (nodes: TreeNode[]): string => {
     const visit = (node: TreeNode) => {
         let html = '';
         const tag = ['h1', 'h2'].includes(node.type) ? node.type : 'div';
         html += `<${tag} data-id="${node.id}" class="block-${node.type}">${node.content}`;
         
         if (node.children && node.children.length > 0) {
             html += '<div class="children" style="margin-left: 20px;">';
             node.children.forEach(c => html += visit(c));
             html += '</div>';
         }
         html += `</${tag}>`;
         return html;
     };
     
     return `<!DOCTYPE html>
<html>
<head><title>Exported Document</title></head>
<body>
${nodes.map(visit).join('\n')}
</body>
</html>`;
};

// --- Components ---

// ContentEditable Component to replace Textarea
const ContentBlock = ({ 
  html, 
  tagName, 
  className, 
  onChange, 
  onKeyDown, 
  onFocus, 
  disabled,
  blockId,
  blockRefs
}: {
  html: string,
  tagName: string,
  className: string,
  onChange: (val: string) => void,
  onKeyDown: (e: React.KeyboardEvent) => void,
  onFocus: () => void,
  disabled: boolean,
  blockId: string,
  blockRefs: React.MutableRefObject<{ [key: string]: HTMLElement | null }>
}) => {
    const contentEditableRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const el = contentEditableRef.current;
        if (el) {
            blockRefs.current[blockId] = el;
        }
        return () => {
            if (blockRefs.current && blockRefs.current[blockId] === el) {
                delete blockRefs.current[blockId];
            }
        };
    }, [blockId, blockRefs, tagName]);

    useLayoutEffect(() => {
        if (contentEditableRef.current && contentEditableRef.current.innerHTML !== html) {
            contentEditableRef.current.innerHTML = html;
        }
    }, [html, tagName]);

    const handleInput = (e: React.FormEvent<HTMLElement>) => {
        onChange(e.currentTarget.innerHTML);
    };

    const Tag = tagName as any;

    return (
        <Tag
            ref={contentEditableRef}
            className={className}
            contentEditable={!disabled}
            onInput={handleInput}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            suppressContentEditableWarning
            spellCheck={false}
        />
    );
};


const App = () => {
  const [rawText, setRawText] = useState('');
  const [isEditorMode, setIsEditorMode] = useState(false);
  
  // Main data state
  const [blocks, setBlocks] = useState<Block[]>([]);
  
  // History state for Undo/Redo
  const [history, setHistory] = useState<Block[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Drag and Drop State
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'top' | 'bottom' } | null>(null);
  const [hoveredHandleId, setHoveredHandleId] = useState<string | null>(null);

  // Selection & Editing State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const lastSelectedId = useRef<string | null>(null);
  const anchorId = useRef<string | null>(null);
  
  // Refs
  const blockRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textChangeTimeoutRef = useRef<any>(null);

  // --- History Logic ---

  const pushHistory = (newBlocks: Block[]) => {
      const currentHistory = history.slice(0, historyIndex + 1);
      if (currentHistory.length > 50) currentHistory.shift();
      const nextHistory = [...currentHistory, newBlocks];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
  };

  const undo = () => {
      if (historyIndex > 0) {
          const prevIndex = historyIndex - 1;
          const prevBlocks = history[prevIndex];
          setBlocks(prevBlocks);
          setHistoryIndex(prevIndex);
          // Reset editing state on undo to avoid ghost cursors
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

  // Helper to update blocks and save structural history
  const commitBlocks = (newBlocks: Block[], saveHistory = true) => {
      setBlocks(newBlocks);
      if (saveHistory) {
          pushHistory(newBlocks);
      }
  };

  // Initialize history when entering editor mode
  const initEditor = (initialBlocks: Block[]) => {
      setBlocks(initialBlocks);
      setHistory([initialBlocks]);
      setHistoryIndex(0);
      setIsEditorMode(true);
  };

  // --- Actions ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (e) => {
            setPdfUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    } else {
        setPdfUrl(null);
    }

    try {
      const apiEndpoint = 'https://docling.91.92.202.157.nip.io/v1/convert/file';
      const formData = new FormData();
      formData.append('files', file);
      formData.append('to_formats', 'html');

      const response = await fetch(apiEndpoint, {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Conversion failed: ${response.status} ${err}`);
      }

      const result = await response.json();
      if (result && result.document && result.document.html_content) {
          const htmlContent = result.document.html_content;
          setRawText(htmlContent);
          
          let newBlocks = parseHtml(htmlContent);
          if (newBlocks.length === 0) {
             newBlocks = [{ id: generateId(), content: 'No structured content found.', type: 'p', depth: 0 }];
          }
          
          initEditor(newBlocks);
      } else {
         throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error("File upload error", error);
      alert(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPdfUrl(null);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConvert = () => {
    let newBlocks: Block[] = [];
    const isHtml = /<(?=.*? .*?\/?>|br|hr|input|!--|!DOCTYPE)[a-z]+.*?>|<([a-z]+).*?<\/\1>/i.test(rawText);

    if (isHtml) {
      try {
        newBlocks = parseHtml(rawText);
      } catch (e) {
        console.error("Failed to parse HTML", e);
      }
    }

    if (newBlocks.length === 0) {
      const lines = rawText.split('\n');
      newBlocks = lines.map((line) => ({
        id: generateId(),
        content: line.trim(),
        type: 'p' as BlockType,
        depth: 0,
      })).filter(b => b.content.length > 0);
    }

    if (newBlocks.length === 0) {
      newBlocks.push({ id: generateId(), content: '', type: 'p', depth: 0 });
    }

    initEditor(newBlocks);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
    setBlocks(newBlocks);

    // Debounce history save for text updates to avoid 1 char = 1 undo step
    if (textChangeTimeoutRef.current) clearTimeout(textChangeTimeoutRef.current);
    textChangeTimeoutRef.current = setTimeout(() => {
        pushHistory(newBlocks);
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
      commitBlocks(newBlocks);
      
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
    
    commitBlocks(newBlocks);
    
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
    commitBlocks(newBlocks);

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
         // If first block deleted but others remain
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

  // --- Selection & Interaction Logic ---

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
    commitBlocks(newBlocks);
    containerRef.current?.focus();
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
    commitBlocks(newBlocks);
    
    if (nextFocusId && newBlocks.some(b => b.id === nextFocusId)) {
        setSelectedIds(new Set([nextFocusId]));
        lastSelectedId.current = nextFocusId;
        anchorId.current = nextFocusId;
    } else {
        clearSelection();
    }
    
    containerRef.current?.focus();
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
      commitBlocks(newBlocks);
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
    commitBlocks(newBlocks);
  };

  // --- Keyboard Handling ---

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    // Global undo/redo interception
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

    // Formatting shortcuts (Global / Selection Mode)
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
            setSelectedIds(new Set([firstId]));
            lastSelectedId.current = firstId;
            anchorId.current = firstId;
        }
        return;
    }

    if (selectedIds.size === 0) return;

    if (!anchorId.current && lastSelectedId.current) {
        anchorId.current = lastSelectedId.current;
    }

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

          if (e.shiftKey) {
              const anchorIndex = blocks.findIndex(b => b.id === anchorId.current);
              if (anchorIndex !== -1) {
                  const start = Math.min(anchorIndex, nextIndex);
                  const end = Math.max(anchorIndex, nextIndex);
                  const newSelected = new Set<string>();
                  for (let i = start; i <= end; i++) {
                      newSelected.add(blocks[i].id);
                  }
                  setSelectedIds(newSelected);
                  lastSelectedId.current = nextId; 
                  blockRefs.current[nextId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }
          } else {
              setSelectedIds(new Set([nextId]));
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

  const handleBlockKeyDown = (e: React.KeyboardEvent, id: string) => {
    // Formatting shortcuts handled by contentEditable default or global handler fallback?
    // Actually, we should let default behavior happen for editing if possible, 
    // but we added global handler that might catch it if we didn't stop prop.
    // However, `editingId` check in global handler prevents double firing.
    
    // Explicitly handle here to be safe? 
    // Note: We removed the explicit document.execCommand calls here because we want standard behavior 
    // OR unified handling. Standard behavior (Browser built-in Ctrl+B) usually works fine in contentEditable.
    // But let's keep the override to ensure consistent experience across browsers if needed.
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
                 setSelectedIds(new Set([prevId]));
                 lastSelectedId.current = prevId;
                 anchorId.current = prevId;
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
                 setSelectedIds(new Set([nextId]));
                 lastSelectedId.current = nextId;
                 anchorId.current = nextId;
                 setTimeout(() => blockRefs.current[nextId]?.focus(), 0);
             }
        }
    } else if (e.key === 'Escape') {
        setEditingId(null);
        containerRef.current?.focus();
    }
  };

  // --- Drag and Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedBlockId(id);
    e.dataTransfer.effectAllowed = 'move';
    if (!selectedIds.has(id)) {
        setSelectedIds(new Set([id]));
        setEditingId(null);
        lastSelectedId.current = id;
        anchorId.current = id;
    }
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
    setDraggedBlockId(null);
    setDropTarget(null);
    setHoveredHandleId(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedBlockId && dropTarget && draggedBlockId !== dropTarget.id) {
      let itemsToMove = Array.from(selectedIds);
      if (!selectedIds.has(draggedBlockId)) itemsToMove = [draggedBlockId];
      
      const oldIndex = blocks.findIndex(b => b.id === draggedBlockId);
      const newBlocks = [...blocks];
      const [movedBlock] = newBlocks.splice(oldIndex, 1);
      
      let targetIndex = newBlocks.findIndex(b => b.id === dropTarget.id);
      if (dropTarget.position === 'bottom') targetIndex += 1;
      
      newBlocks.splice(targetIndex, 0, movedBlock);
      
      commitBlocks(newBlocks);
    }
    handleDragEnd();
  };

  // --- Processed Data ---

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
      return { ...block, lines };
    });
  }, [blocks]);

  const treeBlocks = useMemo(() => {
    const root: { children: TreeNode[] } = { children: [] };
    const stack: { node: { children?: TreeNode[] }, level: number }[] = [{ node: root, level: -1 }];

    enrichedBlocks.forEach(block => {
      const node: TreeNode = { 
        id: block.id,
        type: block.type,
        content: block.content,
        children: []
      };
      while (stack.length > 1 && stack[stack.length - 1].level >= block.level) {
        stack.pop();
      }
      const parent = stack[stack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
      stack.push({ node, level: block.level });
    });

    const clean = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
            if (node.children && node.children.length === 0) {
                delete node.children;
            } else if (node.children) {
                clean(node.children);
            }
        });
    };
    clean(root.children);
    return root.children;
  }, [enrichedBlocks]);

  const getCleanJsonForClipboard = () => {
    const clean = (nodes: TreeNode[]): any[] => {
        return nodes.map(({ id, ...rest }) => {
            const node: any = { ...rest };
            if (node.children) node.children = clean(node.children);
            return node;
        });
    };
    return JSON.stringify(clean(treeBlocks), null, 2);
  };
  
  const handleExport = (format: 'json' | 'xml' | 'html') => {
      setShowExportMenu(false);
      if (format === 'json') {
          downloadFile(getCleanJsonForClipboard(), 'document.json', 'application/json');
      } else if (format === 'xml') {
          downloadFile(convertToXml(treeBlocks), 'document.xml', 'application/xml');
      } else if (format === 'html') {
          downloadFile(convertToHtml(treeBlocks), 'document.html', 'text/html');
      }
  };

  // List counters tracking (depth -> { type, count })
  const listCounters: Record<number, { type: string, count: number }> = {};

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-black text-white p-1.5 rounded-lg shadow-sm">
            <FileText size={20} />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-gray-900">StructFix</h1>
        </div>
        <div className="flex items-center gap-4">
          {!isEditorMode ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Step 1: Import Data
            </div>
          ) : (
            <div className="flex items-center gap-2">
                 {/* Undo/Redo Buttons */}
                 <div className="flex items-center gap-1 mr-2 text-gray-600">
                    <button 
                        onClick={undo} 
                        disabled={historyIndex <= 0}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo size={18} />
                    </button>
                    <button 
                        onClick={redo} 
                        disabled={historyIndex >= history.length - 1}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo size={18} />
                    </button>
                 </div>

                 <div className="w-px h-4 bg-gray-300 mx-1"></div>

                 <div className="relative">
                    <button 
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-blue-50"
                    >
                        <Download size={16} />
                        Export
                        <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showExportMenu && (
                        <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                            <button 
                                onClick={() => handleExport('xml')}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                            >
                                <Code size={14} className="text-blue-500" /> XML
                            </button>
                            <button 
                                onClick={() => handleExport('json')}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                            >
                                <FileJson size={14} className="text-yellow-500" /> JSON
                            </button>
                            <button 
                                onClick={() => handleExport('html')}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                            >
                                <FileCode size={14} className="text-orange-500" /> HTML
                            </button>
                        </div>
                    )}
                </div>
                {showExportMenu && <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {!isEditorMode && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="w-full max-w-2xl space-y-6">
              <div className="space-y-2 text-center sm:text-left">
                <h2 className="text-3xl font-bold tracking-tight">Fix Broken Documents</h2>
                <p className="text-gray-500 text-lg">Paste your unstructured OCR, PDF text, or HTML below.</p>
              </div>
              <div className="relative group">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full h-80 p-6 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none shadow-sm text-base font-mono bg-white transition-shadow group-hover:shadow-md"
                  placeholder="Paste unstructured text or HTML here..."
                />
                <div className="absolute bottom-4 right-4 text-xs text-gray-400 pointer-events-none">
                  {rawText.length} chars
                </div>
              </div>

              <div className="flex gap-4">
                 <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.doc" onChange={handleFileUpload} />
                 <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex-1 py-4 bg-white border-2 border-gray-100 text-gray-900 rounded-xl font-semibold text-lg hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                 >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
                    Upload File
                 </button>
                 
                 <button
                  onClick={handleConvert}
                  disabled={!rawText.trim() || isLoading}
                  className="flex-1 py-4 bg-black text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Convert Text <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditorMode && (
          <div className="flex-1 flex w-full overflow-hidden">
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
                                onClick={() => { setPdfUrl(null); }}
                                className="p-1 hover:bg-gray-200 rounded text-gray-500"
                                title="Close PDF Preview"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 w-full h-full relative bg-gray-200/50">
                        <object 
                            data={pdfUrl} 
                            type="application/pdf" 
                            className="w-full h-full block"
                        >
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
                                <p className="mb-2">Unable to render PDF.</p>
                                <a href={pdfUrl} download="document.pdf" className="text-blue-600 underline">Download instead</a>
                            </div>
                        </object>
                    </div>
                </div>
            )}

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

                       // Clear forward list counters if depth decreases? No, just overwrite.
                       for (let d = block.depth + 1; d <= 6; d++) {
                         delete listCounters[d];
                       }

                       let listLabel = '';
                       if (block.type === 'ol' || block.type === 'abc') {
                         // Initialize or increment
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
                             // a, b, c ...
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

              {/* Toolbar */}
              {(selectedIds.size > 0 || editingId) && (
                <div 
                  className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-xl shadow-2xl px-2 py-2 flex items-center gap-1 z-50 animate-in slide-in-from-bottom-4 duration-300 border border-gray-700/50"
                  onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
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
        )}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}