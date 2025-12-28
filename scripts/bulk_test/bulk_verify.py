import os
import subprocess
import json
import re

CORPUS_DIR = "test_corpus/demokratis_docx"
OUTPUT_HTML_DIR = "test_corpus/output_html"
MAMMOTH_BIN = "node_modules/mammoth/bin/mammoth"
STYLE_MAP = "scripts/bulk_test/mammoth_styles.txt"

def run_conversion(filepath):
    filename = os.path.basename(filepath)
    output_html = os.path.join(OUTPUT_HTML_DIR, filename + ".html")
    
    cmd = [
        "node", MAMMOTH_BIN,
        filepath,
        output_html,
        f"--style-map={STYLE_MAP}"
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return output_html
    except subprocess.CalledProcessError as e:
        print(f"Error converting {filename}: {e.stderr.decode()}")
        return None

def validate_html(html_path):
    with open(html_path, 'r') as f:
        content = f.read()
        
    # Basic structural detection counts (raw tags)
    stats = {
        "h1": len(re.findall(r'<h1', content)),
        "h2": len(re.findall(r'<h2', content)),
        "h3": len(re.findall(r'<h3', content)),
        "p": len(re.findall(r'<p', content)),
        "list_items": len(re.findall(r'<li', content)),
        "tables": len(re.findall(r'<table', content)),
        "size": len(content)
    }
    
    # Heuristic: Valid if it has many paragraphs or some headers
    is_valid = stats["h1"] > 0 or stats["h3"] > 0 or stats["p"] > 10
    
    return is_valid, stats

if __name__ == "__main__":
    if not os.path.exists(OUTPUT_HTML_DIR):
        os.makedirs(OUTPUT_HTML_DIR)
        
    results = []
    files = [f for f in os.listdir(CORPUS_DIR) if f.endswith(".docx")]
    
    print(f"Converting {len(files)} documents via Mammoth...")
    
    for f in files:
        path = os.path.join(CORPUS_DIR, f)
        html_path = run_conversion(path)
        
        if html_path:
            valid, stats = validate_html(html_path)
            status = "CONVERTED" if valid else "EMPTY/LOW_DENSITY"
            # print(f"[{status}] {f[:40]}...")
            results.append({"file": f, "status": status, "raw_stats": stats})
        else:
            print(f"[ERROR] {f} - Conversion failed")
            results.append({"file": f, "status": "ERROR"})
            
    print("\nRunning structural analysis via Vitest (calling parseHtmlLegal)...")
    try:
        subprocess.run(["npm", "run", "test:run", "--", "src/test/bulk_verify.test.ts"], check=True)
        
        # Load the summary produced by the test
        summary_path = "test_corpus/structural_analysis/summary.json"
        if os.path.exists(summary_path):
            with open(summary_path, 'r') as f:
                structural_summary = json.load(f)
                
            print("\n" + "="*80)
            print(f"{'File':<50} | {'Blocks':<6} | {'H1/H2':<7} | {'Art':<3} | {'Lists':<5} | {'Depth':<5}")
            print("-" * 80)
            for s in structural_summary:
                print(f"{s['file'][:50]:<50} | {s['blocks']:<6} | {s['h1']}/{s['h2']:<5} | {s['h3']:<3} | {s['lists']:<5} | {s['max_depth']:<5}")
            print("="*80)
            
            # Final Stats
            total_articles = sum(s['h3'] for s in structural_summary)
            total_blocks = sum(s['blocks'] for s in structural_summary)
            print(f"Total Coverage: {len(structural_summary)} files analyzed.")
            print(f"Structural Yield: {total_articles} Articles detected, {total_blocks} total blocks.")
            
    except Exception as e:
        print(f"Structural analysis failed: {e}")

    with open("test_corpus/results.json", "w") as f:
        json.dump({"results": results}, f, indent=2)
