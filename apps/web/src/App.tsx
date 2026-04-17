import { Routes, Route } from "react-router-dom";
import { NewspaperHomepage } from "./pages/NewspaperHomepage";
import { ArticlePage } from "./pages/ArticlePage";
import { CategoryPage } from "./pages/CategoryPage";
import { AuthorPage } from "./pages/AuthorPage";
import { SignUpPage } from "./pages/SignUpPage";
import "./index.css";

export function App() {
  return (
    <Routes>
      <Route path="/:newspaperName" element={<NewspaperHomepage />} />
      <Route path="/:newspaperName/articles/:articleId" element={<ArticlePage />} />
      <Route path="/:newspaperName/category/:categoryName" element={<CategoryPage />} />
      <Route path="/:newspaperName/authors/:authorId" element={<AuthorPage />} />
      <Route path="/:newspaperName/register" element={<SignUpPage />} />
    </Routes>
  );
}

export default App;
