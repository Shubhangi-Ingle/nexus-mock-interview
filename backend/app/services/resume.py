import pdfplumber
from fastapi import UploadFile, HTTPException

MAX_RESUME_CHARS = 8000  # keep prompt size reasonable for the LLM call

def extract_text_from_pdf(file: UploadFile) -> str:
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        text_parts = []
        with pdfplumber.open(file.file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        full_text = "\n".join(text_parts).strip()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read the PDF. Please upload a valid PDF file.")

    if not full_text:
        raise HTTPException(status_code=400, detail="No readable text found in this PDF. It may be a scanned image.")

    return full_text[:MAX_RESUME_CHARS]