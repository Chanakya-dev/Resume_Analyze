import React, { useState } from "react";
import { Button, TextField, Typography, Box, Paper, CircularProgress, Alert } from "@mui/material";

const FileUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        setError("Please upload a PDF file");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first!");
      return;
    }

    if (!description) {
      setError("Please enter a job description");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("description", description);

      const response = await fetch("http://127.0.0.1:8000/analyze-resume", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "File upload failed");
      }

      const result = await response.json();
      
      if (result.success) {
        setAnalysis(result.analysis);
      } else {
        throw new Error("Analysis failed");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, mx: "auto", mt: 5,ml: 25 }}>
      <Typography variant="h5" gutterBottom>Resume Analysis</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <TextField
        label="Job Description"
        fullWidth
        multiline
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        margin="normal"
        required
      />
      
      <Box sx={{ mt: 2, mb: 2 }}>
        <input 
          type="file" 
          onChange={handleFileChange} 
          accept="application/pdf"
        />
        {selectedFile && (
          <Typography variant="body1" sx={{ mt: 1 }}>
            Selected File: {selectedFile.name}
          </Typography>
        )}
      </Box>
      
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleUpload} 
        fullWidth
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : "Analyze Resume"}
      </Button>
      
      {analysis && (
        <Box sx={{ mt: 3}}>
          <Typography variant="h6" gutterBottom>Analysis Result:</Typography>
          <Paper elevation={2} sx={{ p: 2, whiteSpace: "pre-wrap",overflowY:"scroll",height:"100px"  }}>
            {analysis}
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default FileUpload;