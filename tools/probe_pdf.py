import sys, pymupdf, re, json, os

def dump(path, pages=None, limit=4000):
    doc = pymupdf.open(path)
    print(f"FILE: {path}  pages={doc.page_count}")
    for i, page in enumerate(doc):
        if pages and i not in pages:
            continue
        t = page.get_text("text")
        print(f"\n===== page {i+1} ({len(t)} chars) =====")
        print(t[:limit])

if __name__ == "__main__":
    p = sys.argv[1]
    pages = None
    if len(sys.argv) > 2:
        pages = set(int(x)-1 for x in sys.argv[2].split(","))
    dump(p, pages, int(sys.argv[3]) if len(sys.argv) > 3 else 4000)
