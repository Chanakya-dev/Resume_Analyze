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
import { CandidateAnalysis, AnalysisResult } from "./FileUpload"; // Adjusted import for new structure

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const analysisResult = location.state.analysisResult as AnalysisResult | undefined;

  if (!analysisResult) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>No Analysis Data Found</AlertTitle>
          Please upload resumes and analyze them first.
        </Alert>
        <Button variant="contained" onClick={() => navigate("/")}>
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

      {analysisResult && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Overall Summary
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Processed {analysisResult.top_candidates.length} resumes on{" "}
            {new Date(analysisResult.timestamp).toLocaleString()}
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

const CandidateCard = ({ candidate }: { candidate: CandidateAnalysis }) => {
  const strengths = candidate.strengths.split(", "); // Assuming strengths are comma separated
  const weaknesses = candidate.weaknesses.split(", "); // Assuming weaknesses are comma separated

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6">{candidate.filename}</Typography>
          <Chip
            label={`Score: ${candidate.overall_score.toFixed(2)}`}
            color={
              candidate.overall_score >= 9
                ? "success"
                : candidate.overall_score >= 8
                ? "warning"
                : "error"
            }
          />
        </Box>

        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Recommendation: <strong>{candidate.recommendation}</strong>
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" paragraph>
          {candidate.comments}
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          Strengths:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {strengths.map((strength, index) => (
            <Chip key={index} label={strength} color="success" size="small" />
          ))}
        </Box>

        <Typography variant="subtitle2" gutterBottom>
          Weaknesses:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {weaknesses.map((weakness, index) => (
            <Chip key={index} label={weakness} color="error" size="small" />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default Results;
