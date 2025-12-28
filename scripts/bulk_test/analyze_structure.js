import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { parseHtmlLegal } from '../../src/utils/document-utils.js';

const HTML_DIR = 'test_corpus/output_html';
const RESULTS_DIR = 'test_corpus/structural_analysis';

// Polyfill DOM for parseHtmlLegal
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.DOMParser = dom.window.DOMParser;
global.Node = dom.window.Node;
global.HTMLElement = dom.window.HTMLElement;

async function analyze() {
    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(HTML_DIR).filter(f => f.endswith('.html'));
    console.log(`Analyzing structural integrity of ${files.length} documents...`);

    const summary = [];

    for (const f of files) {
        const html = fs.readFileSync(path.join(HTML_DIR, f), 'utf-8');
        const blocks = parseHtmlLegal(html);

        const stats = {
            filename: f,
            total_blocks: blocks.length,
            h1: blocks.filter(b => b.type === 'h1').length,
            h2: blocks.filter(b => b.type === 'h2').length,
            h3: blocks.filter(b => b.type === 'h3').length,
            p: blocks.filter(b => b.type === 'p').length,
            ul: blocks.filter(b => b.type === 'ul').length,
            ol: blocks.filter(b => b.type === 'ol').length,
            abc: blocks.filter(b => b.type === 'abc').length,
            max_depth: Math.max(0, ...blocks.map(b => b.depth))
        };

        summary.push(stats);
        
        // Save detailed blocks for the first few or anomalies
        if (blocks.length > 0) {
            fs.writeFileSync(
                path.join(RESULTS_DIR, f + '.json'),
                JSON.stringify(blocks, null, 2)
            );
        }
    }

    fs.writeFileSync(
        path.join(RESULTS_DIR, 'summary.json'),
        JSON.stringify(summary, null, 2)
    );

    console.table(summary.map(s => ({
        File: s.filename.substring(0, 30) + '...',
        Blocks: s.total_blocks,
        'H1/H2': `${s.h1}/${s.h2}`,
        'Art (H3)': s.h3,
        'Lists (ul/ol/abc)': `${s.ul}/${s.ol}/${s.abc}`,
        Depth: s.max_depth
    })));
}

analyze().catch(err => {
    console.error(err);
    process.exit(1);
});
