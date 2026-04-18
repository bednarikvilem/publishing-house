import { Routes, Route } from "react-router-dom";
import { NewspaperHomepage } from "./pages/NewspaperHomepage";
import { ArticlePage } from "./pages/ArticlePage";
import { CategoryPage } from "./pages/CategoryPage";
import { AuthorPage } from "./pages/AuthorPage";
import { SignUpPage } from "./pages/SignUpPage";
import { LoginPage } from "./pages/LoginPage";
import { SearchResultsPage } from "./pages/SearchResultsPage";
import { PasswordResetPage } from "./pages/PasswordResetPage";
import "./index.css";

export function App() {
  return (
    <Routes>
      <Route path="/:newspaperName" element={<NewspaperHomepage />} />
      <Route path="/:newspaperName/articles/:articleId" element={<ArticlePage />} />
      <Route path="/:newspaperName/category/:categoryName" element={<CategoryPage />} />
      <Route path="/:newspaperName/authors/:authorId" element={<AuthorPage />} />
      <Route path="/:newspaperName/register" element={<SignUpPage />} />
      <Route path="/:newspaperName/login" element={<LoginPage />} />
      <Route path="/:newspaperName/search" element={<SearchResultsPage />} />
      <Route path="/:newspaperName/forgot-password" element={<PasswordResetPage />} />
    </Routes>
  );
}

export default App;
