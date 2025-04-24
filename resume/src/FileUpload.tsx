import React, { useState } from "react";
import { 
  Button, 
  TextField, 
  Typography, 
  Box, 
  Paper, 
  CircularProgress, 
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Container
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";

export interface CandidateAnalysis {
  filename: string;
  strengths: string;
  weaknesses: string;
  overall_score: number;
  recommendation: string;
  comments?: string;
}

export interface AnalysisResult {
  success: boolean;
  request_id: string;
  timestamp: string;
  job_summary: string;
  top_candidates: string[]; // List of filenames of top candidates
  candidates: CandidateAnalysis[]; // List of candidate analysis details
}


const FileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const invalidFiles = files.filter(file => file.type !== "application/pdf");

      if (invalidFiles.length > 0) {
        setError(`Invalid file type: ${invalidFiles.map(f => f.name).join(", ")}. Only PDF files are allowed.`);
        return;
      }

      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one resume");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a job description");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("description", description);

      const response = await fetch("http://127.0.0.1:8070/analyze-resumes", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const result: AnalysisResult = await response.json();
      if (!result.success) {
        throw new Error("Analysis failed");
      }
      console.log(result);
      navigate("/results", { state: { analysisResult: result } });
    } catch (error) {
      console.error("Upload error:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Upload Resumes</Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Job Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={4}
          sx={{ mb: 3 }}
        />

        <Button variant="contained" component="label" sx={{ mb: 2 }}>
          Select PDF Resumes
          <input type="file" accept="application/pdf" multiple hidden onChange={handleFileChange} />
        </Button>

        <List dense>
          {selectedFiles.map((file, index) => (
            <ListItem
              key={index}
              secondaryAction={
                <IconButton edge="end" onClick={() => removeFile(index)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={file.name} />
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 3 }}>
          <Button 
            variant="contained" 
            onClick={handleUpload} 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Analyze Resumes"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default FileUpload;
