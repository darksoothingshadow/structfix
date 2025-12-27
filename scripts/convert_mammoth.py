import sys
import mammoth

def convert_with_mammoth(input_path, output_path):
    print(f"Converting with Mammoth: {input_path}", file=sys.stderr)
    try:
        with open(input_path, "rb") as docx_file:
            result = mammoth.convert_to_html(docx_file)
            html = result.value
            messages = result.messages
            
            for msg in messages:
                print(f"Mammoth msg: {msg}", file=sys.stderr)
                
            if output_path:
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(html)
                print(f"Saved to {output_path}", file=sys.stderr)
            else:
                print(html)
            return True
    except Exception as e:
        print(f"Mammoth failed: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    convert_with_mammoth(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
