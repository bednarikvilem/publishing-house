import { Routes, Route } from "react-router-dom";
import { NewspaperHomepage } from "./pages/NewspaperHomepage";
import { ArticlePage } from "./pages/ArticlePage";
import "./index.css";

export function App() {
  return (
    <Routes>
      <Route path="/:newspaperName" element={<NewspaperHomepage />} />
      <Route path="/:newspaperName/articles/:articleId" element={<ArticlePage />} />

    </Routes>
  );
}

export default App;
