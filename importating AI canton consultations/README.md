# AI Canton Test Samples Documentation

## Overview
Real-world consultation documents from **Appenzell Innerrhoden (AI)** canton, Switzerland.
Documents cover constitutional reform, referendum procedures, and administrative regulations.

## File Inventory

### 01_import (14 DOCX, ~1.4MB total)
| File | Size | Description |
|------|------|-------------|
| 00-Begleitschreiben.docx | 68KB | Cover letter |
| 01-B1 BRG- Vernehmlassung.docx | 67KB | Constitutional law consultation |
| 02-B2 GPR- Vernehmlassung.docx | 73KB | Political rights consultation |
| 03-B3 GGR- Vernehmlassung.docx | 64KB | Municipality law consultation |
| 04-B4 Ref. VLG.docx | 33KB | Landsgemeinde referendum |
| 05-B5 Ref. VUA.docx | 38KB | Extraordinary voting referendum |
| 06-B6 Ref. VaU.docx | 30KB | General voting referendum |
| 07-B7 Ref. VLGV.docx | 37KB | Landsgemeinde procedures |
| 08-B8 Ref. VIV.docx | 29KB | Initiative procedures |
| 09-B9 Ref. VFR.docx | 29KB | Optional referendum |
| 10-B10 Rev. PeV.docx | 27KB | Personnel regulation revision |
| 11-B11 Rev. GrGR.docx | 66KB | Grand Council rules |
| 12-B12 Rev. VFG.docx | 30KB | Financial oversight |
| 13-B13 Bericht Folgegesetzgebung.docx | 360KB | Follow-up legislation report |
| 14-B14 Bericht Folgegesetzgebung.docx | 444KB | Follow-up legislation (part 2) |

### 02_import (9 DOCX + 9 MD outputs)
Pre-converted markdown outputs matching strukturfix format.

### 04_import_gewasser (PDF + DOCX)
Water planning documents with images/tables.

---

## Recommended Test Candidates

### For Parser Testing
| File | Why |
|------|-----|
| `10-B10 Rev. PeV.docx` | Small (27KB), has matching MD output for validation |
| `04-B4 Ref. VLG.docx` | Small (33KB), pure legal text |
| `08-B8 Ref. VIV.docx` | Small (29KB), initiative procedures |

### For Stress Testing
| File | Why |
|------|-----|
| `14-B14 Bericht.docx` | Large (444KB), complex report |
| `13-B13 Bericht.docx` | Large (360KB), multi-section |

---

## Document Structure Patterns

Based on `Revision Personalverordnung.md`:

```markdown
# Main Title
## Section (Roman numeral: I., II.)
### Article (Art. X Abs. Y)
```

### Special Patterns to Handle
- `Art. X Abs. Y (geändert)` - Article amendments
- `(neu)` / `(aufgehoben)` - New/repealed markers
- Lettered subsections: `a.`, `b.`, `c.`
- Legal references: `Art. 24 SOG vom ...`
- GS numbers: `172.310-2025`

---

## Conversion Strategy

1. **DOCX → HTML via Docling**
2. **HTML → Block[] via parseHtml**
3. **Validate against existing MD outputs**

## Test Fixtures to Create
- [ ] Golden test: `10-B10 Rev. PeV.docx` → expected blocks
- [ ] Round-trip: Convert → Edit → Export → Verify
