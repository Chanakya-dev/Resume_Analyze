from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import shutil
import os
import requests
import fitz 
import logging

logging.basicConfig(
    level=logging.INFO,
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
logger.info(f"Upload directory set to: {UPLOAD_DIR}")

AI_API_KEY = os.getenv("AI_API_KEY")
if not AI_API_KEY:
    logger.error("AI_API_KEY not found in environment variables")
    raise RuntimeError("AI_API_KEY environment variable not set")
logger.info("Groq API key loaded successfully")

API_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
logger.info(f"API endpoint set to: {API_ENDPOINT}")

def extract_text_from_pdf(pdf_path):
    try:
        logger.info(f"Attempting to extract text from PDF: {pdf_path}")
        
        doc = fitz.open(pdf_path)
        text = "".join([page.get_text() for page in doc])
        
        logger.info(f"Successfully extracted {len(text)} characters from PDF")
        return text
    except Exception as e:
        logger.error(f"PDF extraction failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {str(e)}")

@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...), description: str = Form(...)):
    logger.info(f"Starting analyze-resume operation")
    
    file_path = None
    try:
        logger.info(f"Received file: {file.filename}")
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        file_path = os.path.join(UPLOAD_DIR, file.filename)
        logger.info(f"Saving file to: {file_path}")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File saved successfully")
        
        resume_text = extract_text_from_pdf(file_path)
        prompt = f"""
        You are an AI specializing in resume analysis. Given the following job description and resume content, provide feedback on the resume's suitability for the position, including strengths, weaknesses, and suggestions for improvement.

        Job Description:
        {description}

        Resume Content:
        {resume_text}
        """
        headers = {
            "Authorization": f"Bearer {AI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama3-70b-8192",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7
        }
        
        logger.info("Sending request to Groq API...")
        response = requests.post(API_ENDPOINT, headers=headers, json=payload, timeout=30)
        logger.info(f"Received API response (status: {response.status_code})")
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"AI API request failed: {response.text}")
        
        response_data = response.json()
        logger.info("Successfully received analysis from Groq API")
        
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        
        analysis = response_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return {"success": True, "analysis": analysis}
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request to Groq API timed out after 30 seconds")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Network error: {str(e)}")
    except Exception as e:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")