export type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'abc' | 'blockquote' | 'code';

export interface Block {
  id: string;
  content: string;
  type: BlockType;
  depth: number;
}

export interface TreeNode {
  id: string;
  content: string;
  type: BlockType;
  children?: TreeNode[];
}
