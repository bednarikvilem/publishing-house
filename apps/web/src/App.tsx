import { Routes, Route } from "react-router-dom";
import { NewspaperHomepage } from "./pages/NewspaperHomepage";
import { ArticlePage } from "./pages/ArticlePage";
import { CategoryPage } from "./pages/CategoryPage";
import { AuthorPage } from "./pages/AuthorPage";
import { SignUpPage } from "./pages/SignUpPage";
import { LoginPage } from "./pages/LoginPage";
import { SearchResultsPage } from "./pages/SearchResultsPage";
import { PasswordResetPage } from "./pages/PasswordResetPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { DashboardPage } from "./pages/DashboardPage";
import { ArticleEditorPage } from "./pages/ArticleEditorPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { SubscriptionConfirmPage } from "./pages/SubscriptionConfirmPage";
import { GlobalLoginPage } from "./pages/GlobalLoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { DirectorDashboardPage } from "./pages/DirectorDashboardPage";
import "./index.css";

export function App() {
  return (
    <Routes>
      {/* Global portals — must come before /:newspaperName catch-all */}
      <Route path="/admin" element={<GlobalLoginPage title="Platform Administration" subtitle="System Administrator Login" redirectTo="/admin/dashboard" />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/director" element={<GlobalLoginPage title="Editorial Direction" subtitle="Director Login" redirectTo="/director/dashboard" />} />
      <Route path="/director/dashboard" element={<DirectorDashboardPage />} />

      <Route path="/:newspaperName" element={<NewspaperHomepage />} />
      <Route
        path="/:newspaperName/articles/new"
        element={<ArticleEditorPage />}
      />
      <Route
        path="/:newspaperName/articles/:articleId/edit"
        element={<ArticleEditorPage />}
      />
      <Route
        path="/:newspaperName/articles/:articleId"
        element={<ArticlePage />}
      />
      <Route
        path="/:newspaperName/category/:categoryName"
        element={<CategoryPage />}
      />
      <Route
        path="/:newspaperName/authors/:authorId"
        element={<AuthorPage />}
      />
      <Route path="/:newspaperName/register" element={<SignUpPage />} />
      <Route path="/:newspaperName/login" element={<LoginPage />} />
      <Route path="/:newspaperName/search" element={<SearchResultsPage />} />
      <Route
        path="/:newspaperName/forgot-password"
        element={<PasswordResetPage />}
      />
      <Route
        path="/:newspaperName/verify-email"
        element={<VerifyEmailPage />}
      />
      <Route
        path="/:newspaperName/subscription/confirm"
        element={<SubscriptionConfirmPage />}
      />
      <Route path="/:newspaperName/profile" element={<UserProfilePage />} />
      <Route
        path="/:newspaperName/author-dashboard"
        element={<DashboardPage />}
      />
    </Routes>
  );
}

export default App;
