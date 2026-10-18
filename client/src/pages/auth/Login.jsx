import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import logo from "../../assets/images/logo.png";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function Login() {
  const [mode, setMode] = useState("signin");
  const [loginType, setLoginType] = useState("student");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { push } = useToast();

  function switchLoginType(type) {
    setLoginType(type);
    setMode("signin");

    // Clear fields when switching login type
    setEmail("");
    setPassword("");
  }

  async function submit(e) {
    e.preventDefault();

    if (!email.trim()) {
      push("Please enter your email or employee ID", "error");
      return;
    }

    if (!password) {
      push("Please enter your password", "error");
      return;
    }

    // Admin can only sign in
    if (loginType === "admin" && mode === "signup") {
      push("Admin accounts cannot be created from this page", "error");
      return;
    }

    setLoading(true);

    try {
      let user;

      if (mode === "signin") {
        user = await login({
          identifier: email.trim(),
          password,
        });

        if (loginType === "admin" && user.role !== "ADMIN") {
          push("This account does not have admin privileges", "error");
          return;
        }

        if (loginType === "student" && user.role === "ADMIN") {
          push("Please use Admin Login for this account", "error");
          return;
        }

        push(
          loginType === "admin"
            ? "Admin signed in successfully"
            : "Student signed in successfully",
        );

        navigate(user.role === "ADMIN" ? "/admin" : "/dashboard");
      } else {
        user = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          employeeId: employeeId.trim(),
          department: department.trim(),
          designation: designation.trim(),
        });

        push("Account created. Welcome aboard.");

        navigate("/dashboard");
      }
    } catch (err) {
      push(err.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleSSO() {
    push("Campus SSO integration is not configured yet", "error");
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* LEFT SIDE */}
      <div className="flex items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-md">
          {/* LOGO */}
          <Link to="/" className="mb-8 flex items-center gap-2">
            <img
              src={logo}
              alt="SkillBridge AI"
              className="h-10 w-10 rounded-lg object-cover"
            />

            <span className="text-sm font-bold text-navy">
              SkillBridge AI
            </span>
          </Link>

          {/* LOGIN TYPE */}
          {mode === "signin" ? (
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => switchLoginType("student")}
                className={`rounded-md py-2 transition ${
                  loginType === "student"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted hover:text-slate-700"
                }`}
              >
                Student Login
              </button>

              <button
                type="button"
                onClick={() => switchLoginType("admin")}
                className={`rounded-md py-2 transition ${
                  loginType === "admin"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted hover:text-slate-700"
                }`}
              >
                Admin Login
              </button>
            </div>
          ) : null}

          {/* TITLE */}
          <h1 className="text-[24px] font-semibold text-navy">
            {loginType === "admin"
              ? "Admin Login"
              : mode === "signin"
                ? "Welcome Back!"
                : "Create your student account"}
          </h1>

          <p className="mt-1 text-sm text-muted">
            {loginType === "admin"
              ? "Sign in to manage SkillBridge AI."
              : mode === "signin"
                ? "Sign in to continue your learning journey."
                : "Join SkillBridge AI as a student learner."}
          </p>

          {/* FORM */}
          <form className="mt-6 space-y-4" onSubmit={submit}>
            {/* SIGNUP FIELDS */}
            {mode === "signup" && loginType === "student" ? (
              <>
                {/* NAME */}
                <label className="block text-xs font-semibold text-slate-600">
                  Full name

                  <input
                    type="text"
                    className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </label>

                {/* STUDENT ID */}
                <label className="block text-xs font-semibold text-slate-600">
                  Student ID

                  <input
                    type="text"
                    className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Enter student ID"
                    required
                  />
                </label>

                {/* DEPARTMENT + DESIGNATION */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-600">
                    Department

                    <input
                      type="text"
                      className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Department"
                    />
                  </label>

                  <label className="block text-xs font-semibold text-slate-600">
                    Designation

                    <input
                      type="text"
                      className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="Designation"
                    />
                  </label>
                </div>
              </>
            ) : null}

            {/* EMAIL / EMPLOYEE ID */}
            <label className="block text-xs font-semibold text-slate-600">
              {loginType === "admin"
                ? "Admin Email"
                : "Email / Student ID"}

              <input
                type={loginType === "admin" ? "email" : "text"}
                className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  loginType === "admin"
                    ? "admin@skillbridge.edu"
                    : "Email or Student ID"
                }
                required
              />
            </label>

            {/* PASSWORD */}
            <label className="block text-xs font-semibold text-slate-600">
              Password

              <input
                type="password"
                className="mt-1 h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </label>

            {/* REMEMBER + FORGOT */}
            {mode === "signin" ? (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    className="rounded border-line"
                  />

                  Remember me
                </label>

                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() =>
                    push("Password recovery will be available soon")
                  }
                >
                  Forgot Password?
                </button>
              </div>
            ) : null}

            {/* SUBMIT */}
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "signin"
                  ? loginType === "admin"
                    ? "Admin Sign In"
                    : "Sign In"
                  : "Create Account"}
            </Button>

            {/* SSO */}
            {mode === "signin" ? (
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full"
                onClick={handleSSO}
                disabled={loading}
              >
                SSO Login (Campus)
              </Button>
            ) : null}
          </form>

          {/* SIGNUP / SIGNIN SWITCH */}
          {loginType === "student" ? (
            <p className="mt-6 text-center text-xs text-muted">
              {mode === "signin"
                ? "Don't have an account?"
                : "Already registered?"}{" "}

              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() =>
                  setMode(mode === "signin" ? "signup" : "signin")
                }
              >
                {mode === "signin" ? "Sign Up" : "Sign In"}
              </button>
            </p>
          ) : null}

          {/* ADMIN INFORMATION */}
          {loginType === "admin" ? (
            <div className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-navy">
                Administrator Access
              </p>

              <p className="mt-1">
                Only accounts with the <strong>ADMIN</strong> role can access
                the administration panel.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_40%)]" />

        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <p className="text-sm font-medium text-indigo-100">
            Mission Karmayogi aligned
          </p>

          <div className="text-[44px] font-bold leading-[1.05]">
            Learn
            <br />
            Grow
            <br />
            Excel
            <br />
            <span className="text-indigo-200">
              with confidence
            </span>
          </div>

          <p className="max-w-sm text-sm text-indigo-100">
            Build stronger study habits, discover your learning gaps, and get
            personalized guidance for academic success.
          </p>
        </div>
      </div>
    </div>
  );
}

