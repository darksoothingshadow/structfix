import { Block, TreeNode } from '../types';

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const parseHtml = (html: string): Block[] => {
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

/**
 * Swiss Legal Document Pattern Detection
 * Post-processes blocks to detect legal document structure
 */
const LEGAL_PATTERNS = {
  // Art. 1, Art. 23a, Art. 1 Abs. 2
  article: /^Art\.\s*\d+[a-z]?(\s+Abs\.\s*\d+)?/i,
  // I., II., III., IV., V., VI., VII., VIII., IX., X. (with or without trailing text)
  romanSection: /^(I{1,3}|IV|VI{0,3}|IX|X{1,3})\.(\s|$)/,
  // (geändert), (neu), (aufgehoben)
  legalMarker: /\((geändert|neu|aufgehoben)\)/i,
  // 1 Text..., 2 Text... (numbered paragraph at start)
  numberedPara: /^\d+\s+[A-ZÄÖÜ]/,
  // a. text, b. text, c. text
  letteredItem: /^[a-z]\.\s/,
};

/**
 * Detects if content matches Swiss legal heading patterns
 */
export const detectLegalHeadingType = (content: string): 'h1' | 'h2' | 'h3' | null => {
  const trimmed = content.trim();
  
  // Roman numeral sections are top-level (## in MD = h2)
  if (LEGAL_PATTERNS.romanSection.test(trimmed)) {
    return 'h2';
  }
  
  // Articles are subsections (### in MD = h3)
  if (LEGAL_PATTERNS.article.test(trimmed)) {
    return 'h3';
  }
  
  return null;
};

/**
 * Detects if content is a lettered list item (a., b., c.)
 */
export const detectLetteredItem = (content: string): boolean => {
  return LEGAL_PATTERNS.letteredItem.test(content.trim());
};

/**
 * Post-process blocks to apply Swiss legal document structure
 */
export const applyLegalPatterns = (blocks: Block[]): Block[] => {
  return blocks.map(block => {
    const detectedType = detectLegalHeadingType(block.content);
    
    if (detectedType && block.type === 'p') {
      return { ...block, type: detectedType };
    }
    
    // Detect lettered items as abc list type
    if (block.type === 'p' && detectLetteredItem(block.content)) {
      return { ...block, type: 'abc' as const };
    }
    
    return block;
  });
};

/**
 * Enhanced parseHtml with Swiss legal document support
 */
export const parseHtmlLegal = (html: string): Block[] => {
  const blocks = parseHtml(html);
  return applyLegalPatterns(blocks);
};


export const convertToXml = (blocks: Block[]): string => {
    const escape = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<document>\n';
    blocks.forEach(block => {
        xml += `  <block id="${block.id}" type="${block.type}" depth="${block.depth}">\n`;
        xml += `    <content>${escape(block.content)}</content>\n`;
        xml += `  </block>\n`;
    });
    xml += '</document>';
    return xml;
};

export const convertToHtml = (blocks: Block[]): string => {
    const content = blocks.map(block => {
        const tag = ['h1', 'h2'].includes(block.type) ? block.type : 'div';
        const indent = block.depth * 20;
        return `<${tag} data-id="${block.id}" class="block-${block.type}" style="margin-left: ${indent}px">${block.content}</${tag}>`;
    }).join('\n');
    
    return `<!DOCTYPE html>
<html>
<head><title>Exported Document</title></head>
<body>
${content}
</body>
</html>`;
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
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
