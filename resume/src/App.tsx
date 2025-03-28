import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FileUpload from "./FileUpload";
import Results from "./Results";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FileUpload />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;