import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Building2, ChartNoAxesColumnIncreasing, CircleHelp, GraduationCap, Lightbulb, LockKeyhole, Mail, ShieldCheck, Sparkles, Target, Trophy, Users } from "lucide-react";
import Button from "../../components/common/Button";
import logo from "../../assets/images/logo.png";
import hero from "../../assets/images/hero.png";
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

  const inputClass = "h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

  return (
    <main className="min-h-svh bg-slate-50 lg:grid lg:grid-cols-[minmax(500px,42%)_1fr]">
      <section className="flex min-h-svh flex-col bg-[radial-gradient(ellipse_at_30%_15%,#eef5ff,white_60%)] px-5 py-6 sm:px-10 lg:px-12 xl:px-16">
        <Link to="/" className="mx-auto flex w-full max-w-xl items-center gap-3 lg:mx-0">
          <img src={logo} alt="SkillBridge AI" className="h-12 w-12 rounded-xl object-cover shadow-sm" />
          <span><span className="block text-xl font-extrabold tracking-tight text-[#101d42] sm:text-2xl">SkillBridge <span className="text-blue-600">AI</span></span><span className="block text-xs text-slate-500 sm:text-sm">Your Personalized Learning Companion</span></span>
        </Link>

        <div className="mx-auto my-8 w-full max-w-xl rounded-[28px] border border-white bg-white/90 p-5 shadow-[0_22px_70px_-35px_rgba(31,68,135,0.32)] backdrop-blur sm:my-10 sm:p-7 lg:my-auto">
          {mode === "signin" ? <div className="mb-7 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
            <button type="button" onClick={() => switchLoginType("student")} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-sm font-bold transition ${loginType === "student" ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200" : "text-slate-600 hover:bg-white/70"}`}><GraduationCap size={19} /> Student Login</button>
            <button type="button" onClick={() => switchLoginType("admin")} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-sm font-bold transition ${loginType === "admin" ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200" : "text-slate-600 hover:bg-white/70"}`}><ShieldCheck size={18} /> Admin Login</button>
          </div> : <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><Sparkles size={14} /> Student registration</div>}

          <h1 className="text-3xl font-extrabold tracking-tight text-[#111d40] sm:text-[34px]">{loginType === "admin" ? "Welcome, Admin" : mode === "signin" ? <>Welcome Back! <span aria-hidden="true">👋</span></> : "Create your account"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">{loginType === "admin" ? "Sign in to manage your SkillBridge learning community." : mode === "signin" ? "Sign in to continue your learning journey with SkillBridge AI." : "Join SkillBridge AI and start learning at your own pace."}</p>

          <form className="mt-7 space-y-4" onSubmit={submit}>
            {mode === "signup" && loginType === "student" ? <>
              <label className="block text-sm font-semibold text-[#142144]">Full name<div className="relative mt-2"><Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" required /></div></label>
              <label className="block text-sm font-semibold text-[#142144]">Student ID<div className="relative mt-2"><GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" className={inputClass} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Enter your student ID" required /></div></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[#142144]">Department<div className="relative mt-2"><Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input type="text" className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department" /></div></label>
                <label className="block text-sm font-semibold text-[#142144]">Designation<input type="text" className={`${inputClass} mt-2 pl-4`} value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Designation" /></label>
              </div>
            </> : null}

            <label className="block text-sm font-semibold text-[#142144]">{loginType === "admin" ? "Admin Email" : mode === "signup" ? "Email address" : "Email / Student ID"}<div className="relative mt-2"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type={loginType === "admin" ? "email" : "text"} className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={loginType === "admin" ? "admin@skillbridge.edu" : "Enter your email or student ID"} required /></div></label>
            <label className="block text-sm font-semibold text-[#142144]">Password<div className="relative mt-2"><LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required /></div></label>

            {mode === "signin" ? <div className="flex items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 text-slate-600"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-blue-600" />Remember me</label><button type="button" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline" onClick={() => push("Password recovery will be available soon")}>Forgot Password?</button></div> : null}

            <Button type="submit" className="h-[54px] w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-base font-bold shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-blue-600" disabled={loading}>{loading ? "Please wait..." : mode === "signin" ? loginType === "admin" ? "Admin Sign In" : <>Sign In <ArrowRight size={18} /></> : <>Create Account <ArrowRight size={18} /></>}</Button>

            {mode === "signin" ? <div className="space-y-4 pt-1"><div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or continue with<span className="h-px flex-1 bg-slate-200" /></div><Button type="button" variant="secondary" className="h-14 w-full rounded-xl border-slate-200 text-sm font-bold" onClick={handleSSO} disabled={loading}><Building2 size={19} className="text-blue-700" /> SSO Login (Campus) <ArrowRight size={17} className="ml-auto text-slate-400" /></Button></div> : null}
          </form>

          {loginType === "student" ? <p className="mt-6 text-center text-sm text-slate-500">{mode === "signin" ? "Don't have an account?" : "Already registered?"}{" "}<button type="button" className="font-bold text-blue-600 hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Sign Up" : "Sign In"}</button></p> : null}
          {loginType === "admin" ? <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs leading-5 text-slate-600"><p className="font-bold text-[#142144]">Administrator access</p><p className="mt-1">Only accounts with the <strong>ADMIN</strong> role can access the administration panel.</p></div> : null}
        </div>

        <div className="mx-auto hidden w-full max-w-xl grid-cols-4 gap-3 pb-1 text-center sm:grid">
          {[[BookOpen, "Personalized", "Learning", "text-emerald-600 bg-emerald-50"], [ChartNoAxesColumnIncreasing, "Track", "Progress", "text-violet-600 bg-violet-50"], [Target, "Achieve", "Goals", "text-orange-600 bg-orange-50"], [Users, "Join", "Community", "text-rose-600 bg-rose-50"]].map(([Icon, first, second, tone]) => <div key={first} className="flex flex-col items-center gap-1.5 text-xs font-medium text-slate-600"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={20} /></span><span>{first}<br />{second}</span></div>)}
        </div>
      </section>

      <aside className="relative hidden min-h-svh overflow-hidden bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-800 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(88,117,255,0.8),transparent_35%),radial-gradient(circle_at_75%_90%,rgba(20,210,231,0.55),transparent_32%)]" />
        <header className="relative z-10 flex items-center justify-end gap-8 px-10 py-7 text-sm font-semibold text-white/90 xl:px-14"><span className="mr-auto inline-flex items-center gap-2 rounded-full bg-blue-950/30 px-4 py-2 text-xs"><Trophy size={15} className="text-amber-300" /> Mission Karmayogi aligned</span><a href="/#home" className="hover:text-white">About</a><a href="/#features" className="hover:text-white">Features</a><a href="/#contact" className="inline-flex items-center gap-1 hover:text-white"><CircleHelp size={16} /> Help</a></header>
        <div className="relative z-10 grid flex-1 grid-cols-[0.85fr_1.15fr] items-center gap-4 px-8 pb-8 xl:px-14">
          <div className="self-center pb-12"><div className="text-5xl font-black leading-[1.02] xl:text-6xl">Learn<br /><span className="text-teal-300">Grow</span><br /><span className="text-amber-300">Excel</span><br /><span className="text-3xl leading-tight xl:text-4xl">with Confidence</span></div><p className="mt-5 max-w-sm text-sm leading-6 text-blue-100">SkillBridge AI helps students learn smarter with personalized learning paths, AI guidance, and resources to build future-ready skills.</p>
            <div className="mt-7 space-y-4">{[[BookOpen, "Personalized Learning Paths", "Learn at your own pace", "bg-fuchsia-500"], [Lightbulb, "AI-Powered Guidance", "Get instant doubt support", "bg-sky-500"], [ChartNoAxesColumnIncreasing, "Track Your Progress", "Set goals and stay motivated", "bg-emerald-500"], [Users, "Learn, Practice & Grow", "Access resources and community", "bg-orange-500"]].map(([Icon, title, subtitle, tone]) => <div key={title} className="flex items-center gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={21} /></span><span><strong className="block text-sm">{title}</strong><small className="text-xs text-blue-100">{subtitle}</small></span></div>)}</div>
          </div>
          <div className="relative self-center"><div className="absolute -inset-6 rounded-full bg-cyan-300/20 blur-3xl" /><img src={hero} alt="Learner using SkillBridge AI study tools" className="relative max-h-[68vh] w-full rounded-[34px] border border-white/20 object-cover object-[48%_center] shadow-2xl shadow-blue-950/40" /><div className="absolute -bottom-5 -left-8 max-w-xs rounded-2xl border border-white/15 bg-blue-950/55 p-4 text-sm italic leading-6 text-white shadow-xl backdrop-blur"><span className="text-3xl font-black leading-none text-blue-200">“</span> Education is the most powerful weapon which you can use to change the world.<span className="mt-1 block text-right text-xs not-italic text-blue-200">— Nelson Mandela</span></div></div>
        </div>
        <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full border border-white/10" /><div className="pointer-events-none absolute -bottom-44 left-1/3 h-96 w-96 rounded-full border border-white/10" />
      </aside>
    </main>
  );
}

