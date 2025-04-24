from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
import os
import shutil
import requests
import fitz  # PyMuPDF
import logging
from pydantic import BaseModel
from datetime import datetime
import uuid
import json
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler('app.log')]
)
logger = logging.getLogger("ResumeAnalyzer")

# FastAPI app initialization
app = FastAPI(
    title="Resume Analysis API",
    version="1.0.0",
    description="Analyze resumes against job descriptions using AI",
    docs_url="/docs"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Constants
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_FILE_TYPES = ["application/pdf"]

# AI Configuration
AI_API_KEY = os.getenv("AI_API_KEY")
API_ENDPOINT = os.getenv("API_ENDPOINT", "https://api.groq.com/openai/v1/chat/completions")
AI_MODEL = "llama3-70b-8192"
TEMPERATURE = 0.7
TIMEOUT = 30

# Pydantic Models
class CandidateAnalysis(BaseModel):
    filename: str
    strengths: str
    weaknesses: str
    overall_score: float
    recommendation: str
    comments: Optional[str] = None

class AnalysisResult(BaseModel):
    success: bool
    request_id: str
    timestamp: str
    job_summary: str
    top_candidates: List[str]
    candidates: List[CandidateAnalysis]

class ErrorResponse(BaseModel):
    success: bool
    error: str
    request_id: str
    timestamp: str
    details: Optional[str] = None

# Helpers
def generate_request_id() -> str:
    return str(uuid.uuid4())

def get_timestamp() -> str:
    return datetime.now().isoformat()

def validate_file(file: UploadFile):
    """Validate file type and size."""
    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    file.file.seek(0, 2)  # Seek to the end of the file to determine its size
    file_size = file.file.tell()
    file.file.seek(0)  # Reset the file pointer to the beginning

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File '{file.filename}' is too large. Max size is {MAX_FILE_SIZE // (1024*1024)}MB."
        )

def extract_text_from_pdf(path: str) -> str:
    """Extract text from PDF file."""
    try:
        doc = fitz.open(path)
        return "".join([page.get_text() for page in doc])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF extraction error: {e}")

def call_ai_analysis(prompt: str) -> str:
    """Call AI API to analyze the resumes."""
    try:
        headers = {
            "Authorization": f"Bearer {AI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": AI_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": TEMPERATURE
        }

        res = requests.post(API_ENDPOINT, headers=headers, json=payload, timeout=TIMEOUT)
        res.raise_for_status()
        return res.json().get("choices", [{}])[0].get("message", {}).get("content", "")
    
    except requests.exceptions.RequestException as e:
        logger.error(f"AI request failed: {str(e)}")
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

def extract_json_block(text: str) -> str:
    """Extract JSON block from raw AI response."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return match.group(0) if match else ""

# Main endpoint
@app.post("/analyze-resumes", response_model=AnalysisResult, responses={500: {"model": ErrorResponse}})
async def analyze_resumes(
    files: List[UploadFile] = File(...),
    description: str = Form(...)
):
    request_id = generate_request_id()
    timestamp = get_timestamp()

    # Validate input
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")
    if not description.strip():
        raise HTTPException(status_code=400, detail="Job description is required.")

    resume_data = []
    temp_files = []

    for file in files:
        validate_file(file)
        filename = f"{uuid.uuid4()}_{file.filename}"
        path = os.path.join(UPLOAD_DIR, filename)

        try:
            with open(path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            text = extract_text_from_pdf(path)
            resume_data.append({"filename": file.filename, "content": text})
            temp_files.append(path)
        except Exception as e:
            logger.error(f"Error with {file.filename}: {e}")
        finally:
            file.file.close()

    # Clean up temporary files after processing
    for temp_file in temp_files:
        if os.path.exists(temp_file):
            os.remove(temp_file)

    # Prepare AI prompt
    prompt = f"""
You are a career coach and AI hiring assistant.
Analyze the resumes below based on this job description.

Job Description:
{description}

Resumes:
{resume_data}

Respond ONLY with valid JSON. Do NOT include explanations, markdown, or text outside the JSON object.

Return the following structure:
{{
  "job_summary": "...",
  "top_candidates": ["filename1", "filename2"],
  "candidates": [
    {{
      "filename": "...",
      "strengths": "...",
      "weaknesses": "...",
      "overall_score": 8.5,
      "recommendation": "Highly recommended",
      "comments": "Optional"
    }}
  ]
}}
"""

    # Call AI API and handle response
    ai_response = call_ai_analysis(prompt)
    logger.info(f"Received AI response: {ai_response[:500]}...")
    json_string = extract_json_block(ai_response)

    try:
        structured = json.loads(json_string)
        logger.info(f"Structured response: {structured}")
        structured.update({
            "success": True,
            "request_id": request_id,
            "timestamp": timestamp
        })
        return structured
    except Exception as e:
        logger.error(f"AI response parsing failed: {e}\nRaw response: {ai_response}")
        raise HTTPException(status_code=500, detail="Invalid response format from AI.")
