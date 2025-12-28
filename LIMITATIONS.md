# StructFix Limitations & Known Issues

> "It is remarkable how much long-term advantage people like us have gotten by trying to be consistently not stupid, instead of trying to be very intelligent." — Charlie Munger

This document maps the **Circle of Competence** for StructFix. It explicitly states what the system *cannot* do reliably, to avoid the illusion of competence.

## 1. Structural Limitations (Mammoth.js)

### Tables
- **Borders & Styling**: Table borders, custom column widths, and specific cell shading are **ignored**.
- **Merging**: Complex cell merging (rowspan/colspan) may result in flattened or misaligned content.
- **Nested Tables**: Tables within tables are not reliable and may be flattened.

### Lists
- **Mixed Formatting**: Lists that switch between bullets, numbers, and letters (`I`, `1`, `a`) may be flattened to a generic ordered list structure.
- **Deep Nesting**: Nesting beyond 5 levels is not guaranteed to preserve indentation depth.
- **Restart Logic**: Numbering restart logic is often lost; expect sequential numbering.

### Text Boxes
- **Positioning**: Content within text boxes is treated as separate paragraphs and appended *after* the containing paragraph. It does NOT visually float or align as in Word.

## 2. Formatting & Visuals

### Semantic Only
- **Fonts & Colors**: Exact font families, sizes, and colors are **intentionally ignored** to prioritize semantic HTML.
- **Alignment**: Justified text and specific tab stops are usually converted to default left alignment unless explicitly mapped.

### Images
- **Formats**: Only `PNG`, `JPEG`, and `GIF` are fully supported.
- **Vector Graphics**: `EMF`, `WMF`, and `SVG` images (common in older Word docs) will fail to render.
- **Corrupted Refs**: Documents with missing internal image files (broken XML refs) may fail silently or produce incomplete output.

## 3. Performance Constraints

- **File Size**: Tested reliable up to **444KB**. Files >1MB may experience UI lag or parsing timeouts (>5s).
- **Edit History**: The Undo stack is kept in memory. Extremely long sessions (>1000 edits) may impact performance (though we enforce limits).
