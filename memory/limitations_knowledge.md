# StructFix Agent Knowledge Base: Limitations

> "It is remarkable how much long-term advantage people like us have gotten by trying to be consistently not stupid, instead of trying to be very intelligent."

## 1. The Circle of Competence (What we CAN do)
- **Text**: Paragraphs and headers (h1-h3) are robust.
- **Lists**: `ul`, `ol`, and `abc` (lettered) lists are supported via heuristics.
- **Tables**: Basic grid extraction works (2D arrays). Complex merging/styling is intentionally ignored.
- **Formatting**: `b`, `i`, `u`, `sub`, `sup`, `code` are preserved.

## 2. The Danger Zone (What we CANNOT do)
- **Vectors**: SVG/EMF images from Word will typically fail or disappear.
- **Complex layout**: Text boxes, floating images, and multi-column layouts are flattened.
- **Scripting**: All scripts are aggressively stripped by DOMPurify.

## 3. Protocol for Bugs
If a user reports a "missing feature" that falls into Zone 2:
1.  **Do NOT try to fix code**. The limitation is structural (Mammoth/Parser).
2.  **Refer to LIMITATIONS.md**.
3.  **Explain**: "This is outside our current Circle of Competence."
