import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import Loading from "../components/common/Loading";
import { useAuth } from "../context/AuthContext";
import AdminDashboard from "../pages/admin/AdminDashboard";
import EmployeeManagement from "../pages/admin/EmployeeManagement";
import YouTubeResourceManagement from "../pages/admin/YouTubeResourceManagement";
import Reports from "../pages/admin/Reports";
import Login from "../pages/auth/Login";
import AIAssistant from "../pages/employee/AIAssistant";
import Analytics from "../pages/employee/Analytics";
import Assessment from "../pages/employee/Assessment";
import AssessmentAttempt from "../pages/employee/AssessmentAttempt";
import AssessmentResult from "../pages/employee/AssessmentResult";
import CourseDetails from "../pages/employee/CourseDetails";
import Dashboard from "../pages/employee/Dashboard";
import GeneratedQuiz from "../pages/employee/GeneratedQuiz";
import LearningPath from "../pages/employee/LearningPath";
import MySkills from "../pages/employee/MySkills";
import Notifications from "../pages/employee/Notifications";
import QuizGenerator from "../pages/employee/QuizGenerator";
import QuizResult from "../pages/employee/QuizResult";
import Recommendations from "../pages/employee/Recommendations";
import Settings from "../pages/employee/Settings";
import SkillGap from "../pages/employee/SkillGap";
import NotFound from "../pages/NotFound";
import Landing from "../pages/public/Landing";
import YouTubeCatalog from "../pages/employee/YouTubeCatalog";
import YouTubeLesson from "../pages/employee/YouTubeLesson";
import StudyResources from "../pages/employee/StudyResources";
import StudyResourceManagement from "../pages/admin/StudyResourceManagement";
import VideoQuiz from "../pages/employee/VideoQuiz";
import VideoQuizResult from "../pages/employee/VideoQuizResult";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        <Route
          element={<ProtectedRoute roles={["STUDENT", "TRAINER", "ADMIN"]} />}
        >
          <Route element={<DashboardLayout variant="employee" />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/skills" element={<MySkills />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/assessment/attempt/:attemptId" element={<AssessmentAttempt />} />
            <Route path="/assessment/history" element={<AssessmentResult />} />
            <Route path="/assessment/result/:resultId" element={<AssessmentResult />} />
            <Route path="/skill-gaps" element={<SkillGap />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/courses/:id" element={<CourseDetails />} />
            <Route path="/youtube-learning" element={<YouTubeCatalog />} />
            <Route path="/youtube-learning/items/:itemId" element={<YouTubeLesson />} />
            <Route path="/youtube-learning/items/:itemId/quiz" element={<VideoQuiz />} />
            <Route path="/youtube-learning/quiz/:quizId/result" element={<VideoQuizResult />} />
            <Route path="/study-resources" element={<StudyResources />} />
            <Route path="/assistant" element={<AIAssistant />} />
            <Route path="/quiz-generator" element={<QuizGenerator />} />
            <Route path="/quiz" element={<GeneratedQuiz />} />
            <Route path="/quiz/result" element={<QuizResult />} />
            <Route path="/learning-path" element={<LearningPath />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
          <Route element={<DashboardLayout variant="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/employees" element={<EmployeeManagement />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/youtube-learning" element={<YouTubeResourceManagement />} />
            <Route path="/admin/study-resources" element={<StudyResourceManagement />} />
          </Route>
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedRoute({ roles }) {
  const { booting, isAuthenticated, user } = useAuth();
  if (booting) return <Loading label="Restoring session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(user?.role)) {
    return (
      <Navigate to={user?.role === "ADMIN" ? "/admin" : "/dashboard"} replace />
    );
  }
  return <Outlet />;
}
