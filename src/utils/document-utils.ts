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

export const convertToXml = (nodes: TreeNode[]): string => {
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

export const convertToHtml = (nodes: TreeNode[]): string => {
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
