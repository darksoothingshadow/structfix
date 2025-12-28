import requests
import re
import os
import time

BASE_URL = "https://www.demokratis.ch"
# Broad crawl to find 20+ docs
SEARCH_URL_TEMPLATE = "https://www.demokratis.ch/vernehmlassungen?page={page}"
OUTPUT_DIR = "test_corpus/demokratis_docx"

def get_consultation_links(page=1):
    url = SEARCH_URL_TEMPLATE.format(page=page)
    print(f"Fetching {url}...")
    for attempt in range(3):
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            # Find links like /vernehmlassung/zuerich/slug or /consultation/zuerich/slug
            links = re.findall(r'href=["\']((?:/vernehmlassung|/consultation)/[^/]+/[^"\' #>]+)', response.text)
            return list(set(links)) # Deduplicate
        except Exception as e:
            print(f"Attempt {attempt+1} failed for {url}: {e}")
            time.sleep(2)
    return []

def get_document_links(consult_url):
    print(f"Fetching documents from {consult_url}...")
    try:
        response = requests.get(BASE_URL + consult_url, timeout=10)
        response.raise_for_status()
        # Look for download links: /vernehmlassung/slug/datei/id or /consultation/slug/fichier/id
        # We also catch /datei/... directly. Stop at #, ", ', space, or >
        file_links = re.findall(r'href=["\']((?:/vernehmlassung|/consultation)/[^/]+/(?:datei|fichier|file)/[^"\' #>]+)', response.text)
        return list(set(file_links))
    except Exception as e:
        print(f"Error fetching consultation page: {e}")
        return []

def download_file(file_url):
    try:
        # Clean the file_url (remove # fragment if any)
        file_url = file_url.split('#')[0]
        
        # Follow redirects to get the real file
        full_url = BASE_URL + file_url
        if not file_url.endswith("/download"):
            full_url += "/download"
            
        print(f"Checking {full_url}...")
        r = requests.get(full_url, stream=True, timeout=20)
        r.raise_for_status()
        
        # Check if it's a DOCX
        cd = r.headers.get('content-disposition', '')
        ctype = r.headers.get('content-type', '')
        
        # Improved DOCX detection
        is_docx = (
            ".docx" in cd.lower() or 
            "officedocument.wordprocessingml.document" in ctype or
            ".docx" in r.url.lower() or
            ".docx" in full_url.lower()
        )
        
        if not is_docx:
            print(f"Skipping non-docx file: {r.url}")
            return None

        # Extract filename
        filename_match = re.findall(r'filename="?([^"]+)"?', cd)
        if filename_match:
            filename = filename_match[0]
        else:
            filename = r.url.split('/')[-1].split('?')[0]
            if not filename.endswith(".docx"):
                filename += ".docx"
        
        # Clean filename for OS
        filename = re.sub(r'[^\w\-_\. ]', '_', filename)
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        if os.path.exists(filepath):
            print(f"Skipping {filename} (already exists)")
            return filepath

        print(f"Downloading {filename}...")
        count = 0
        with open(filepath, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                count += 1
        return filepath
    except Exception as e:
        print(f"Error downloading {file_url}: {e}")
        return None

if __name__ == "__main__":
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    doc_count = len([f for f in os.listdir(OUTPUT_DIR) if f.endswith(".docx")])
    page = 1
    
    while doc_count < 20 and page < 50: # Reach 20 docs, check up to page 50
        links = get_consultation_links(page)
        if not links:
            print("No more links found.")
            break
            
        print(f"Found {len(links)} consultations on page {page}.")
        
        for link in links:
            docs = get_document_links(link)
            for doc in docs:
                if download_file(doc):
                    doc_count += 1
                if doc_count >= 100:
                    break
                time.sleep(0.5)
            if doc_count >= 100:
                break
        
        page += 1
        print(f"Current doc count: {doc_count}")

    print(f"Scraping complete. Total docs: {doc_count}")
