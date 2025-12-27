#!/usr/bin/env python3
"""
Docling DOCX to HTML Converter Script
Usage: python convert.py <input_file.docx> [output_file.html]
"""
import sys
from pathlib import Path
from docling.document_converter import DocumentConverter
from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.backend.docling_parse_backend import DoclingParseDocumentBackend

def convert_docx_to_html(input_path: str, output_path: str = None) -> str:
    """Convert a DOCX file to HTML using Docling."""
    
    try:
        print(f"Converting: {input_path}", file=sys.stderr)
        
        # Explicitly configure pipeline options if needed (though defaults should work)
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.document_converter import PdfFormatOption
        
        converter = DocumentConverter()
        result = converter.convert(input_path)
        
        # Export to HTML
        html_content = result.document.export_to_html()
        
        if output_path:
            Path(output_path).write_text(html_content, encoding='utf-8')
            print(f"Saved to: {output_path}", file=sys.stderr)
        
        return html_content
        
    except Exception as e:
        print(f"Error converting {input_path}: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python convert.py <input_file.docx> [output_file.html]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    html = convert_docx_to_html(input_file, output_file)
    
    if not output_file:
        print(html)
