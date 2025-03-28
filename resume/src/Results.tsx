import React from "react";
import { 
  Box, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  Chip, 
  Container,
  Divider,
  Grid,
  Alert,
  AlertTitle,
  Button
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { Candidate, AnalysisResult } from "./FileUpload";

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const analysisResult = location.state?.analysisResult as AnalysisResult | undefined;

  if (!analysisResult) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>No Analysis Data Found</AlertTitle>
          Please upload resumes and analyze them first.
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate("/")}
        >
          Go Back to Upload
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ mb: 4 }}>
        Analysis Results
      </Typography>

      {analysisResult.overall_summary && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Overall Summary
          </Typography>
          <Typography variant="body1" paragraph>
            {analysisResult.overall_summary}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Processed {analysisResult.processed_files} resumes on {new Date(analysisResult.timestamp).toLocaleString()}
          </Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        {analysisResult.candidates.map((candidate) => (
          <Grid item xs={12} md={6} lg={4} key={candidate.filename}>
            <CandidateCard candidate={candidate} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

const CandidateCard = ({ candidate }: { candidate: Candidate }) => {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6" component="div">
            #{candidate.ranking} - {candidate.filename}
          </Typography>
          <Chip 
            label={`Score: ${candidate.suitability_score}`}
            color={
              candidate.suitability_score >= 80 ? "success" :
              candidate.suitability_score >= 50 ? "warning" : "error"
            }
          />
        </Box>

        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Recommendation: <strong>{candidate.recommendation}</strong>
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" paragraph>
          {candidate.summary}
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          Strengths:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {candidate.strengths.map((strength, index) => (
            <Chip key={index} label={strength} color="success" size="small" />
          ))}
        </Box>

        <Typography variant="subtitle2" gutterBottom>
          Weaknesses:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {candidate.weaknesses.map((weakness, index) => (
            <Chip key={index} label={weakness} color="error" size="small" />
          ))}
        </Box>

        {candidate.improvement_suggestions && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Improvement Suggestions:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0 }}>
              {candidate.improvement_suggestions.map((suggestion, index) => (
                <Box component="li" key={index}>
                  <Typography variant="body2">{suggestion}</Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Results;