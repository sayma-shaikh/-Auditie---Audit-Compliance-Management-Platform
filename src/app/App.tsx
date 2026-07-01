/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { Suspense, lazy, useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  Outlet,
  useNavigate,
  useLocation,
  useParams
} from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  LayoutDashboard,
  FolderKanban,
  Archive,
  FileText,
  History,
  Users,
  LogOut,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  Search,
  Upload,
  Edit3,
  Trash2,
  Download,
  FolderUp,
  MoreVertical
} from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const ProjectsPage = lazy(() => import('../features/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const ProjectDetailsPage = lazy(() => import('../features/projects/ProjectsPage').then((module) => ({ default: module.ProjectDetailsPage })));
const AuditAreaWorkspacePage = lazy(() => import('../features/projects/ProjectsPage').then((module) => ({ default: module.AuditAreaWorkspacePage })));
const PersonalWorkspacePage = lazy(() => import('../features/projects/ProjectsPage').then((module) => ({ default: module.PersonalWorkspacePage })));
const MilestoneWorkspacePage = lazy(() => import('../features/projects/ProjectsPage').then((module) => ({ default: module.MilestoneWorkspacePage })));
const TemplateAutomationPage = lazy(() => import('../features/templates/TemplatesPage').then((module) => ({ default: module.TemplatesPage })));
const AuditorDashboardPage = lazy(() => import('../features/dashboard/AuditorDashboardPage'));

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function ModuleLoading() {
  return (
    <div className="flex min-h-[320px] items-center justify-center p-8">
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-500 shadow-sm">
        Loading module...
      </div>
    </div>
  );
}

class ModuleErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  declare props: Readonly<{ children: React.ReactNode }>;
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Module render failed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-8 rounded-lg border border-rose-100 bg-rose-50 p-6 text-sm font-bold text-rose-700">
          This module could not be loaded. Refresh the page and try again.
        </div>
      );
    }
    return this.props.children;
  }
}

function LazyModule({ children }: { children: React.ReactNode }) {
  return (
    <ModuleErrorBoundary>
      <Suspense fallback={<ModuleLoading />}>{children}</Suspense>
    </ModuleErrorBoundary>
  );
}

// --- Auth Context & Service ---
interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AUDITOR';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/auth/me', {
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) return null;
      return res.json();
    })
    .then((data) => {
      if (data?.id) {
        setUser(data);
      }
    })
    .catch(() => {
      // Ignore authentication errors
    })
    .finally(() => {
      setLoading(false);
    });
}, []);

// Replace your entire login() function with this version.
// This fixes the most common issue: backend returns non-JSON HTML error pages,
// causing `await res.json()` to throw and breaking authentication.

const login = async (email: string, pass: string) => {
  // Helper function to safely parse JSON without crashing
  const safeJson = async (res: Response) => {
    const text = await res.text();

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      console.error('Server returned non-JSON response:', text);
      throw new Error(
        `Server error (${res.status}). Check backend route /api/auth/login.`
      );
    }
  };

  try {
    // -----------------------------
    // 1. Attempt Login
    // -----------------------------
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email,
        password: pass,
      }),
    });

    const data = await safeJson(res);

    // Successful login
    if (res.ok && data?.user) {
      setUser(data.user);
      return;
    }

    // -----------------------------
    // 2. Auto-Register Demo User
    // -----------------------------
    console.warn(
      'Login failed, attempting automatic registration for demo account...'
    );

    let role: User['role'] = 'AUDITOR';

    const lowerEmail = email.toLowerCase();

    if (lowerEmail.includes('admin')) {
      role = 'ADMIN';
    }

    const regRes = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email,
        password: pass,
        name: email.split('@')[0] || 'Demo User',
        role,
      }),
    });

    const regData = await safeJson(regRes);

    // Successful registration
    if (regRes.ok && regData?.user) {
      setUser(regData.user);
      return;
    }

    // Registration failed
    throw new Error(
      regData?.message ||
        data?.message ||
        `Authentication failed (${regRes.status})`
    );
  } catch (error: any) {
    console.error('Authentication failed:', error);

    // Rethrow so LoginPage can display the error
    throw new Error(error?.message || 'Login failed');
  }
};
const logout = () => {
  localStorage.removeItem('mockUser');

  fetch('/api/auth/logout', { method: 'POST' })
    .catch(() => {})
    .finally(() => {
      setUser(null);
      window.location.href = '/login';
    });
};

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  useOutsideClick(profileMenuRef, () => setProfileOpen(false), profileOpen);

  const links = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { title: 'Projects', icon: FolderKanban, path: '/projects' },
    { title: 'Repository', icon: Archive, path: '/repository' },
    { title: 'Templates', icon: FileText, path: '/templates' },
    { title: 'Audit Logs', icon: History, path: '/audit-logs' },
    { title: 'Users', icon: Users, path: '/users', roles: ['ADMIN'] },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center overflow-hidden">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-tight text-slate-400">SMNA</span>
          <span className="font-bold tracking-tight text-lg leading-none">Auditie</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 mt-4 overflow-y-auto">
        {links.map((link) => {
          const hasAccess = !link.roles || (user?.role && link.roles.includes(user.role));
          if (!hasAccess) return null;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded text-sm font-medium transition-all",
                location.pathname === link.path
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <link.icon className="w-4 h-4" />
              {link.title}
            </Link>
          );
        })}
      </nav>

      <div ref={profileMenuRef} className="p-4 border-t border-slate-800">
        <button type="button" onClick={() => setProfileOpen((value) => !value)} className="flex w-full items-center gap-3 p-2 mb-2 rounded text-left hover:bg-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">
            {user?.name.split(' ').map(n=>n[0]).join('')}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{user?.role}</p>
          </div>
        </button>
        {profileOpen && (
          <div className="mb-2 rounded border border-slate-800 bg-slate-950 p-1">
            {['My Assignments', 'My Reviews', 'My Activity', 'Profile Settings'].map((item) => (
              <Link key={item} to={`/my-work?tab=${encodeURIComponent(item)}`} onClick={() => setProfileOpen(false)} className="block rounded px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white">
                {item}
              </Link>
            ))}
          </div>
        )}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-4 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function PageContainer({ title, subtitle, children, actions }: { title: string, subtitle?: string, children: React.ReactNode, actions?: React.ReactNode }) {
  return (
    <div
      className="flex-1 min-h-screen bg-slate-50 flex flex-col lg:ml-0"
    >
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-100 hidden md:flex">
            <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">System Status: Stable</span>
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
}

// --- Pages ---

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] bg-white rounded-lg shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <p className="text-sm font-semibold text-slate-600 tracking-tight">SMNA</p>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Auditie</h2>
          <p className="text-slate-500 text-xs mt-2">Enterprise Compliance Management</p>
        </div>

        <form
          className="p-8 space-y-6"
          onSubmit={handleSubmit}
          autoComplete="off"
        >
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider rounded border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Identity</label>
              <input
                type="email"
                name="demo-email"
                autoComplete="off"
                spellCheck={false}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                placeholder="admin@test.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Access Key</label>
              <input
                type="text"
                name="demo-password"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                spellCheck={false}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                placeholder="Enter any password"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-slate-900 text-white font-bold text-xs uppercase tracking-widest py-3 rounded hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg"
          >
            Authenticate Signature
          </button>

          <div className="pt-4 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
              Secured Internal Environment
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    framework: '',
    manager: '',
    reviewer: '',
    status: '',
    industry: '',
    client: '',
    dateRange: '',
    health: '',
  });
  const [sortKey, setSortKey] = useState<'project' | 'progress' | 'health' | 'dueDate'>('progress');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [chartTab, setChartTab] = useState<'Portfolio Health' | 'Projects' | 'Frameworks' | 'Risks' | 'Reviews' | 'Workload' | 'Observations'>('Portfolio Health');
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'AUDITOR') {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, String(value)); });
    setLoading(true);
    setError('');
    fetch(`/api/dashboard/admin${params.toString() ? `?${params.toString()}` : ''}`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Unable to load dashboard');
        setDashboard(data);
      })
      .catch((err) => setError(err.message || 'Unable to load dashboard'))
      .finally(() => setLoading(false));
  }, [user, filters.search, filters.framework, filters.manager, filters.reviewer, filters.status, filters.industry, filters.client, filters.dateRange, filters.health, refreshTick]);

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshTick((tick) => tick + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);

  if (user?.role === 'AUDITOR') {
    return (
      <PageContainer title="Auditor Workspace" subtitle="Personal execution dashboard">
        <LazyModule><AuditorDashboardPage /></LazyModule>
      </PageContainer>
    );
  }

  const filterOptions = dashboard?.filters || { frameworks: [], managers: [], reviewers: [], statuses: [], industries: [], clients: [], health: [] };
  const healthData = dashboard ? [
    { name: 'Healthy', value: dashboard.health.healthy, color: '#10b981' },
    { name: 'Warning', value: dashboard.health.warning, color: '#f59e0b' },
    { name: 'Critical', value: dashboard.health.critical, color: '#e11d48' },
  ] : [];
  const rows = dashboard?.projects?.topPriority || dashboard?.projects?.rows || [];
  const sortedRows = [...rows].sort((a, b) => {
    if (sortKey === 'progress') return b.progress - a.progress;
    if (sortKey === 'dueDate') return Number(new Date(a.dueDate || 0)) - Number(new Date(b.dueDate || 0));
    return String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''));
  });
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
  const healthBadge = (health: string) => cn(
    'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
    health === 'Healthy' ? 'bg-emerald-100 text-emerald-700' : health === 'Critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700',
  );

  return (
    <PageContainer title="Admin Dashboard" subtitle="Executive audit portfolio command center">
      {error && <div className="rounded border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
      {loading && !dashboard && <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading portfolio dashboard...</div>}
      {dashboard && (
        <>
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-500 md:flex-row md:items-center md:justify-between">
            <span>Last refreshed: {dashboard.overview?.lastRefreshed ? new Date(dashboard.overview.lastRefreshed).toLocaleString() : '-'}</span>
            <div className="flex gap-2">
              <button onClick={() => setFiltersOpen((open) => !open)} className="rounded bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-100">{filtersOpen ? 'Hide Filters' : 'Show Filters'}</button>
              <button onClick={() => setRefreshTick((tick) => tick + 1)} className="rounded bg-slate-100 px-3 py-1.5 text-slate-700 hover:bg-slate-200">Refresh now</button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            {[
              ['Active Projects', dashboard.portfolio.activeProjects, 'bg-blue-600', '/projects'],
              ['Projects At Risk', dashboard.portfolio.projectsAtRisk, 'bg-rose-600', '/projects'],
              ['Overdue Tasks', dashboard.portfolio.overdueTasks, 'bg-orange-500', ''],
              ['Portfolio Health', `${dashboard.portfolio.portfolioHealth}%`, 'bg-emerald-600', ''],
              ['Open Reviews', dashboard.portfolio.openReviews, 'bg-amber-500', ''],
              ['Reports Generated', dashboard.portfolio.reportsGenerated, 'bg-violet-600', ''],
            ].map(([label, value, tone, to]) => (
              <Link key={String(label)} to={String(to || '#')} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
                  <span className={cn('h-2.5 w-2.5 rounded-full', String(tone))} />
                </div>
                <p className="mt-3 text-3xl font-extrabold text-slate-950">{value}</p>
                <div className="mt-3 flex h-6 items-end gap-1">
                  {(dashboard.portfolio.sparkline || []).map((point: number, index: number) => <span key={index} className={cn('w-full rounded-t', String(tone))} style={{ height: `${Math.max(4, Math.min(24, point * 5))}px` }} />)}
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{dashboard.portfolio.trend >= 0 ? '+' : ''}{dashboard.portfolio.trend}% vs previous 30 days</p>
              </Link>
            ))}
          </div>

          <div className={cn('grid grid-cols-1 gap-4', filtersOpen && 'xl:grid-cols-[minmax(0,1fr)_320px]')}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 xl:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">AI Portfolio Insight</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                    {dashboard.aiInsights.map((insight: string) => <div key={insight} className="rounded border border-blue-100 bg-white p-3 text-sm font-bold text-slate-700">{insight}</div>)}
                  </div>
                </div>
                <DashboardPanel title="Review Queue">
                  <div className="grid grid-cols-2 gap-2">
                    <MiniMetric label="Pending" value={dashboard.reviews.totalPending} />
                    <MiniMetric label="Returned" value={dashboard.reviews.returned} />
                    <MiniMetric label="Overdue" value={dashboard.reviews.overdue} />
                    <MiniMetric label="Avg Days" value={dashboard.reviews.averageReviewTime} />
                  </div>
                </DashboardPanel>
              </div>

              <DashboardChart title="Portfolio Analytics">
                <div className="mb-4 flex flex-wrap gap-2">
                  {(['Portfolio Health', 'Projects', 'Frameworks', 'Risks', 'Reviews', 'Workload', 'Observations'] as const).map((tab) => (
                    <button key={tab} onClick={() => setChartTab(tab)} className={cn('rounded px-3 py-1.5 text-xs font-bold', chartTab === tab ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{tab}</button>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  {chartTab === 'Portfolio Health' ? (
                    <PieChart><Pie data={healthData} dataKey="value" nameKey="name" innerRadius={80} outerRadius={125} paddingAngle={4}>{healthData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                  ) : chartTab === 'Frameworks' ? (
                    <BarChart data={dashboard.charts.frameworks} layout="vertical" margin={{ left: 30 }}><XAxis type="number" allowDecimals={false} /><YAxis dataKey="framework" type="category" width={90} /><Tooltip /><Bar dataKey="count" fill="#0f766e" radius={[0, 4, 4, 0]} /></BarChart>
                  ) : chartTab === 'Risks' ? (
                    <BarChart data={dashboard.charts.risks}><XAxis dataKey="risk" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#e11d48" radius={[4, 4, 0, 0]} /></BarChart>
                  ) : chartTab === 'Reviews' ? (
                    <BarChart data={dashboard.charts.reviews}><XAxis dataKey="status" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart>
                  ) : chartTab === 'Workload' ? (
                    <BarChart data={dashboard.charts.workload}><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="workloadPercent" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart>
                  ) : chartTab === 'Observations' ? (
                    <BarChart data={dashboard.charts.observations}><XAxis dataKey="severity" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} /></BarChart>
                  ) : (
                    <BarChart data={dashboard.charts.projects}><XAxis dataKey="status" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart>
                  )}
                </ResponsiveContainer>
              </DashboardChart>

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950">Active Projects</h3>
                    <p className="text-xs font-semibold text-slate-500">Progress, health, due dates, ownership, and status across the portfolio.</p>
                  </div>
                  <select value={sortKey} onChange={(event) => setSortKey(event.target.value as any)} className="h-9 rounded border border-slate-200 bg-slate-50 px-3 text-xs outline-none">
                    <option value="progress">Sort by Progress</option>
                    <option value="project">Sort by Project</option>
                    <option value="health">Sort by Health</option>
                    <option value="dueDate">Sort by Due Date</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500"><tr><th className="px-4 py-3">Project</th><th className="px-4 py-3">Framework</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Health</th><th className="px-4 py-3">Due Date</th><th className="px-4 py-3">Manager</th><th className="px-4 py-3">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedRows.map((row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3"><Link to={`/projects/${row.id}`} className="font-bold text-slate-950 hover:text-blue-700">{row.project}</Link><p className="text-xs text-slate-500">{row.client}</p></td>
                          <td className="px-4 py-3 text-slate-600">{row.framework}</td>
                          <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-2 w-24 rounded bg-slate-200"><div className="h-full rounded bg-blue-600" style={{ width: `${row.progress}%` }} /></div><span className="text-xs font-bold">{row.progress}%</span></div></td>
                          <td className="px-4 py-3"><span className={healthBadge(row.health)}>{row.health}</span></td>
                          <td className="px-4 py-3">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-3">{row.manager}</td>
                          <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-700">{row.status}</span></td>
                        </tr>
                      ))}
                      {!pagedRows.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm font-bold text-slate-500">No projects match the selected filters.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs font-bold text-slate-600">
                  <span>Page {page} of {totalPages}</span>
                  <div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <DashboardPanel title="Team Workload">
                  <div className="space-y-2">{dashboard.team.length === 0 && <EmptyLine text="No assigned workload yet." />}{dashboard.team.slice(0, 8).map((member: any) => <div key={member.userId} className="rounded border border-slate-100 p-2"><div className="flex justify-between text-xs font-bold"><span>{member.name}</span><span>{member.status}</span></div><div className="mt-2 h-2 rounded bg-slate-200"><div className="h-full rounded bg-blue-600" style={{ width: `${member.workloadPercent}%` }} /></div><p className="mt-1 text-[10px] font-semibold text-slate-500">{member.assignedAreas} areas · {member.checklistRows} rows · {member.reviewsPending} reviews</p></div>)}</div>
                </DashboardPanel>
                <DashboardPanel title="Upcoming Deadlines">
                  <div className="space-y-2">{dashboard.deadlines.length === 0 && <EmptyLine text="No upcoming deadlines." />}{dashboard.deadlines.map((item: any, index: number) => <Link to={`/projects/${item.projectId}`} key={`${item.type}-${index}`} className="block rounded border border-slate-100 p-2 hover:border-blue-300"><p className="text-xs font-bold text-slate-900">{item.title}</p><p className="text-[10px] font-semibold text-slate-500">{item.type} · {item.project} · {new Date(item.dueDate).toLocaleDateString()}</p></Link>)}</div>
                </DashboardPanel>
                <DashboardPanel title="Observation Summary">
                  <div className="grid grid-cols-2 gap-2"><MiniMetric label="Critical" value={dashboard.observations.critical} /><MiniMetric label="High" value={dashboard.observations.high} /><MiniMetric label="Medium" value={dashboard.observations.medium} /><MiniMetric label="Low" value={dashboard.observations.low} /><MiniMetric label="Closed" value={dashboard.observations.closed} /><MiniMetric label="Pending" value={dashboard.observations.pendingReview} /></div>
                </DashboardPanel>
              </div>

              <DashboardPanel title="Framework Health">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {dashboard.frameworkHealth.map((item: any) => (
                    <div key={item.framework} className="rounded border border-slate-100 p-3">
                      <div className="flex items-center justify-between"><p className="text-sm font-extrabold text-slate-950">{item.framework}</p><span className={healthBadge(item.health)}>{item.health}</span></div>
                      <div className="mt-3 h-2 rounded bg-slate-200"><div className="h-full rounded bg-blue-600" style={{ width: `${item.progress}%` }} /></div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-500"><span>{item.projects} projects</span><span>{item.completedControls} done</span><span>{item.pendingControls} pending</span></div>
                    </div>
                  ))}
                </div>
              </DashboardPanel>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <DashboardPanel title="Risk Matrix">
                  <div className="grid grid-cols-[80px_repeat(4,minmax(0,1fr))] gap-1 text-center text-xs font-bold">
                    <span />
                    {['Low', 'Medium', 'High', 'Critical'].map((impact) => <span key={impact} className="rounded bg-slate-50 p-2 text-slate-500">{impact}</span>)}
                    {dashboard.riskMatrix.map((row: any) => (
                      <React.Fragment key={row.likelihood}>
                        <span className="rounded bg-slate-50 p-2 text-slate-500">{row.likelihood}</span>
                        {row.cells.map((cell: any) => <Link to="/projects" key={`${row.likelihood}-${cell.impact}`} className={cn('rounded p-3 text-slate-950', cell.count > 0 ? 'bg-rose-100 hover:bg-rose-200' : 'bg-slate-50 hover:bg-slate-100')}>{cell.count}</Link>)}
                      </React.Fragment>
                    ))}
                  </div>
                </DashboardPanel>
                <DashboardPanel title="Business Activity">
                  <div className="space-y-4">
                    {dashboard.recentBusinessActivities.map((group: any) => (
                      <div key={group.date}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{new Date(group.date).toLocaleDateString()}</p>
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">{group.items.map((item: any) => <div key={item.type} className="rounded border border-slate-100 bg-slate-50 p-2 text-xs font-bold text-slate-700">{item.message}</div>)}</div>
                      </div>
                    ))}
                  </div>
                </DashboardPanel>
              </div>

              <DashboardPanel title="Quick Actions">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {dashboard.quickActions.map((action: any) => <Link key={action.label} to={action.href === '#export-dashboard' ? '#' : action.href} onClick={(event) => { if (action.href === '#export-dashboard') { event.preventDefault(); window.print(); } }} className="rounded border border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-extrabold text-slate-800 hover:border-blue-300 hover:bg-blue-50">{action.label}</Link>)}
                </div>
              </DashboardPanel>
            </div>

            {filtersOpen && <aside className="space-y-4">
              <DashboardPanel title="Project Filters">
                <div className="space-y-2">
                  <input value={filters.search} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, search: e.target.value })); }} placeholder="Search portfolio..." className="h-9 w-full rounded border border-slate-200 bg-slate-50 px-3 text-xs outline-none" />
                  <FilterSelect label="Framework" value={filters.framework} options={filterOptions.frameworks} onChange={(value) => { setPage(1); setFilters((f) => ({ ...f, framework: value })); }} />
                  <FilterSelect label="Project Manager" value={filters.manager} options={filterOptions.managers.map((m: any) => ({ label: m.name, value: m.id }))} onChange={(value) => { setPage(1); setFilters((f) => ({ ...f, manager: value })); }} />
                  <FilterSelect label="Reviewer" value={filters.reviewer} options={filterOptions.reviewers.map((m: any) => ({ label: m.name, value: m.id }))} onChange={(value) => { setPage(1); setFilters((f) => ({ ...f, reviewer: value })); }} />
                  <FilterSelect label="Status" value={filters.status} options={filterOptions.statuses} onChange={(value) => { setPage(1); setFilters((f) => ({ ...f, status: value })); }} />
                  <FilterSelect label="Industry" value={filters.industry} options={filterOptions.industries} onChange={(value) => { setPage(1); setFilters((f) => ({ ...f, industry: value })); }} />
                  <FilterSelect label="Client" value={filters.client} options={filterOptions.clients} onChange={(value) => { setPage(1); setFilters((f) => ({ ...f, client: value })); }} />
                  <FilterSelect label="Date Range" value={filters.dateRange} options={[{ label: 'Overdue', value: 'overdue' }, { label: 'Next 7 days', value: 'next7' }, { label: 'Next 30 days', value: 'next30' }]} onChange={(value) => { setPage(1); setFilters((f) => ({ ...f, dateRange: value })); }} />
                  <FilterSelect label="Health" value={filters.health} options={filterOptions.health} onChange={(value) => { setPage(1); setFilters((f) => ({ ...f, health: value })); }} />
                  <button onClick={() => { setPage(1); setFilters({ search: '', framework: '', manager: '', reviewer: '', status: '', industry: '', client: '', dateRange: '', health: '' }); }} className="h-9 w-full rounded border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200">Clear Filters</button>
                  {loading && <p className="rounded bg-slate-50 p-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Refreshing</p>}
                </div>
              </DashboardPanel>
              <DashboardPanel title="Recent Activity">
                <div className="space-y-3">{dashboard.activity.length === 0 && <EmptyLine text="No recent activity." />}{dashboard.activity.slice(0, 12).map((log: any) => <div key={log.id} className="flex gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-50 text-[10px] font-bold text-slate-600"><History className="h-3.5 w-3.5" /></div><div><p className="text-xs font-semibold text-slate-800">{log.message}</p><p className="text-[10px] font-semibold text-slate-400">{log.user} · {new Date(log.createdAt).toLocaleString()} · {log.document}</p></div></div>)}</div>
              </DashboardPanel>
            </aside>}
          </div>
        </>
      )}
    </PageContainer>
  );
}

function DashboardChart({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-sm font-extrabold text-slate-950">{title}</h3>{children}</div>;
}

function DashboardPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><h3 className="mb-3 text-sm font-extrabold text-slate-950">{title}</h3>{children}</div>;
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded border border-slate-100 bg-slate-50 p-2"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p><p className="mt-1 text-lg font-extrabold text-slate-950">{value}</p></div>;
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded border border-dashed border-slate-200 p-3 text-center text-xs font-bold text-slate-400">{text}</p>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<string | { label: string; value: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded border border-slate-200 bg-slate-50 px-3 text-xs outline-none">
        <option value="">All</option>
        {options.map((option) => {
          const normalized = typeof option === 'string' ? { label: option, value: option } : option;
          return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>;
        })}
      </select>
    </label>
  );
}

function LegacyDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [prioritySearch, setPrioritySearch] = useState('');
  const [priorityStatusFilter, setPriorityStatusFilter] = useState('');
  const priorityRows = [
    { projectName: 'Global ISO 27001 Readiness', framework: 'ISO 27001, ITGC', progress: 25, status: 'Active' },
  ];
  const filteredPriorityRows = priorityRows.filter((row) => {
    const searchable = [row.projectName, row.framework, row.status].join(' ').toLowerCase();
    return (!prioritySearch.trim() || searchable.includes(prioritySearch.trim().toLowerCase()))
      && (!priorityStatusFilter || row.status === priorityStatusFilter);
  });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetch('/api/audit/stats').then(res => res.json()).then(setStats);
    }
    fetch('/api/audit').then(res => res.json()).then(data => setRecentLogs(Array.isArray(data) ? data.slice(0, 4) : []));
  }, [user]);

  return (
    <PageContainer title="Admin Dashboard" subtitle="Global overview of compliance projects and artifacts">
      {user?.role === 'ADMIN' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Projects', value: stats.projects, icon: FolderKanban, color: 'text-slate-900', trend: '+2 this mo.', trendColor: 'text-green-600' },
            { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-slate-900', trend: 'Critical: 5', trendColor: 'text-amber-600' },
            { label: 'Approved Docs', value: stats.documents, icon: FileText, color: 'text-emerald-600', trend: '89% compliance', trendColor: 'text-slate-400' },
            { label: 'Review Latency', value: '4.2d', icon: History, color: 'text-slate-900', trend: '-0.5d vs LY', trendColor: 'text-emerald-600' },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2 }}
              className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm"
            >
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{item.label}</p>
              <div className="flex items-end gap-2">
                <span className={cn("text-2xl font-bold tracking-tight", item.color)}>{item.value}</span>
                <span className={cn("text-[10px] font-semibold mb-1", item.trendColor)}>{item.trend}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Priority Control Mapping</h3>
              <Link to="/projects" className="text-xs font-semibold text-blue-600 hover:underline">View All Projects</Link>
            </div>
            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_160px_140px]">
              <input
                value={prioritySearch}
                onChange={(event) => setPrioritySearch(event.target.value)}
                placeholder="Filter projects..."
                className="h-9 rounded border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={priorityStatusFilter}
                onChange={(event) => setPriorityStatusFilter(event.target.value)}
                className="h-9 rounded border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setPrioritySearch('');
                  setPriorityStatusFilter('');
                }}
                className="h-9 rounded border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Clear Filters
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 bg-slate-50/50">
                    <th className="px-6 py-3 font-bold tracking-widest">Project Name</th>
                    <th className="px-6 py-3 font-bold tracking-widest">Framework</th>
                    <th className="px-6 py-3 font-bold tracking-widest">Progress</th>
                    <th className="px-6 py-3 font-bold tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPriorityRows.map((row) => (
                    <tr key={row.projectName}>
                      <td className="px-6 py-4 font-medium text-slate-900 tracking-tight text-sm">{row.projectName}</td>
                      <td className="px-6 py-4 text-slate-500">{row.framework}</td>
                      <td className="px-6 py-4">
                        <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${row.progress}%` }}></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">{row.status}</span>
                      </td>
                    </tr>
                  ))}
                  {filteredPriorityRows.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-sm font-semibold text-slate-400">No priority mappings match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-sm tracking-tight text-sm">System Activity</h2>
            </div>
            <div className="p-4 space-y-5">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] font-bold",
                    log.actionType === 'APPROVE' ? 'bg-emerald-50 text-emerald-700' :
                    log.actionType === 'REJECT' ? 'bg-rose-50 text-rose-700' :
                    log.actionType === 'UPLOAD' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700'
                  )}>
                    {log.actionType === 'APPROVE' ? '✓' : log.actionType === 'REJECT' ? '✕' : log.actionType === 'UPLOAD' ? '↑' : '⚙'}
                  </div>
                  <div>
                    <p className="text-xs text-slate-800 leading-snug">
                      <span className="font-bold">{log.user.name}</span> {log.details}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium tracking-wide">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.document?.title || 'System'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg shadow-xl relative overflow-hidden group">
            <div className="relative z-10 transition-transform group-hover:-translate-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Session Integrity</p>
              <h3 className="text-white text-lg font-bold tracking-tight mb-4">{user?.role} Access Mode</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                All artifacts processed in this session are cryptographically signed. Non-repudiation is enforced system-wide.
              </p>
              <button className="flex items-center gap-2 text-[10px] font-bold text-white bg-white/5 border border-white/10 px-4 py-2 rounded hover:bg-white/10 transition-all uppercase tracking-widest">
                Security Policy <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <ShieldCheck className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 pointer-events-none" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetch('/api/audit').then(res => res.json()).then(data => setLogs(Array.isArray(data) ? data : []));
  }, []);

  const actionOptions = Array.from(new Set(logs.map((log) => log.actionType).filter(Boolean))).sort();
  const filteredLogs = logs.filter((log) => {
    const searchable = [
      log.user?.name,
      log.actionType,
      log.document?.title,
      log.details,
      log.timestamp,
    ].filter(Boolean).join(' ').toLowerCase();
    return (!search.trim() || searchable.includes(search.trim().toLowerCase()))
      && (!actionFilter || log.actionType === actionFilter);
  });

  return (
    <PageContainer title="System Activity" subtitle="Tamper-proof audit infrastructure for global compliance mapping">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_180px]">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Search</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="User, action, target..."
              className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Action</label>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {actionOptions.map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">&nbsp;</label>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActionFilter('');
              }}
              className="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
       <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signature</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action Vector</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Artifact Target</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chronology</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-800 tracking-tight">{log.user?.name || 'System'}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                    log.actionType === 'APPROVE' ? 'bg-emerald-50 text-emerald-600' :
                    log.actionType === 'REJECT' ? 'bg-rose-50 text-rose-600' :
                    log.actionType === 'LOGIN' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                  )}>
                    {log.actionType}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 font-medium tracking-tight truncate max-w-[200px]">{log.document?.title || <span className="text-slate-300 italic uppercase text-[9px] font-bold tracking-widest">System Operation</span>}</td>
                <td className="px-6 py-4 text-slate-400 font-mono text-[10px] font-medium">{new Date(log.timestamp).toISOString().replace('T', ' ').split('.')[0]}</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm font-semibold text-slate-400">No activity logs match the current filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}

interface RepositoryItem {
  id: string;
  name: string;
  type: 'FOLDER' | 'FILE';
  parentId: string | null;
  path?: string | null;
  mimeType?: string | null;
  size?: number | null;
  source?: string | null;
  externalId?: string | null;
  createdBy: { name: string };
  createdAt: string;
  updatedAt: string;
  children?: RepositoryItem[];
}

function findFolderPath(tree: RepositoryItem[], folderId?: string): RepositoryItem[] {
  if (!folderId) return [];

  const search = (nodes: RepositoryItem[], ancestors: RepositoryItem[]): RepositoryItem[] => {
    for (const node of nodes) {
      const currentAncestors = [...ancestors, node];
      if (node.id === folderId) {
        return currentAncestors;
      }
      if (node.children?.length) {
        const found = search(node.children, currentAncestors);
        if (found.length) {
          return found;
        }
      }
    }
    return [];
  };

  return search(tree, []);
}

function DriveConnectControls() {
  const { user } = useAuth();
  const [status, setStatus] = useState<{ connected: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/repository/drive/status', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { if (mounted) setStatus(data); })
      .catch(() => {})
    return () => { mounted = false };
  }, []);

  const handleConnect = async () => {
    if (!user) return alert('Please sign in first');
    setLoading(true);
    try {
      const res = await fetch('/api/repository/drive/auth-url', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch auth url');
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('Auth url missing');
      }
    } catch (err: any) {
      alert(err?.message || 'Unable to connect to Drive');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Drive for your account?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/repository/drive/disconnect', { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setStatus({ connected: false });
        alert('Drive disconnected');
      } else {
        throw new Error(data?.error || 'Failed to disconnect');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to disconnect Drive');
    } finally { setLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500">Drive:</span>
      {status?.connected ? (
        <button onClick={handleDisconnect} disabled={loading} className="text-xs px-3 py-1 rounded bg-rose-50 text-rose-700 border border-rose-100">
          Disconnect
        </button>
      ) : (
        <button onClick={handleConnect} disabled={loading} className="text-xs px-3 py-1 rounded bg-green-50 text-green-700 border border-green-100">
          Connect Google Drive
        </button>
      )}
    </div>
  );
}

function RepositoryPage() {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tree, setTree] = useState<RepositoryItem[]>([]);
  const [items, setItems] = useState<RepositoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeItemMenu, setActiveItemMenu] = useState<string | null>(null);
  const [infoItem, setInfoItem] = useState<RepositoryItem | null>(null);
  const [infoMetadata, setInfoMetadata] = useState<any>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const topMenuRef = useRef<HTMLDivElement | null>(null);

  const currentPath = findFolderPath(tree, folderId);
  const currentFolder = currentPath[currentPath.length - 1] || null;
  const pageTitle = currentFolder ? currentFolder.name : 'Repository';

  const loadRepository = async () => {
    setLoading(true);
    setError(null);

    try {
      const statusResponse = await fetch('/api/repository/drive/status', { credentials: 'include' });
      const connected = statusResponse.ok ? !!(await statusResponse.json())?.connected : false;
      setDriveConnected(connected);

      if (connected) {
        const syncResponse = await fetch('/api/repository/drive/sync', { credentials: 'include' });
        if (!syncResponse.ok) {
          const syncBody = await syncResponse.json().catch(() => ({}));
          console.warn('Drive sync failed', syncBody?.error || syncResponse.statusText);
        }
      }

      const treeResponse = await fetch('/api/repository', { credentials: 'include' });
      if (!treeResponse.ok) {
        throw new Error('Failed to load repository tree');
      }
      const treeData = await treeResponse.json();
      setTree(Array.isArray(treeData) ? treeData : []);

      if (folderId) {
        const folderResponse = await fetch(`/api/repository/${folderId}`, { credentials: 'include' });
        if (!folderResponse.ok) {
          throw new Error('Failed to load folder contents');
        }
        const folderData = await folderResponse.json();
        setItems(Array.isArray(folderData) ? folderData : []);
      } else {
        setItems(Array.isArray(treeData) ? treeData : []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unable to load repository');
      setItems([]);
      setDriveConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepository();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  useEffect(() => {
    const handleWindowFocus = () => {
      if (driveConnected) {
        loadRepository();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && driveConnected) {
        loadRepository();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [driveConnected, folderId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (topMenuRef.current && !topMenuRef.current.contains(event.target as Node)) {
        setTopMenuOpen(false);
      }
    };

    if (topMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [topMenuOpen]);

  const refreshRepository = async () => {
    await loadRepository();
  };

  const handleCreateFolder = async () => {
    if (!user) {
      setError('You must be logged in to create a folder');
      return;
    }

    const name = prompt('Enter folder name');
    if (!name?.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/repository/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          parentId: folderId || null,
          source: driveConnected ? 'gdrive' : 'internal',
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error || 'Failed to create folder');
      }

      await refreshRepository();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unable to create folder');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
      folderInputRef.current.setAttribute('mozdirectory', '');
    }
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length || !user) return;

    setActionLoading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i] as any;
        formData.append('files', file, file.webkitRelativePath || file.name);
      }
      if (folderId) {
        formData.append('parentId', folderId);
      }
      formData.append('source', driveConnected ? 'gdrive' : 'internal');

      const res = await fetch('/api/repository/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error || 'Failed to upload files');
      }

      await refreshRepository();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unable to upload files');
    } finally {
      setActionLoading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleUploadFolderClick = () => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
      folderInputRef.current.setAttribute('mozdirectory', '');
    }
    folderInputRef.current?.click();
  };

  const handleUploadFolder = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length || !user) return;

    setActionLoading(true);
    try {
      const formData = new FormData();
      const filePaths: string[] = [];

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i] as any;
        const filePath = file.webkitRelativePath || file.name;
        formData.append('files', file);
        filePaths.push(filePath);
        console.log(`[DEBUG] File ${i}: ${file.name} → path: ${filePath}`);
      }

      formData.append('filePaths', JSON.stringify(filePaths));
      console.log(`[DEBUG] Uploading ${files.length} files with paths:`, filePaths);
      if (folderId) {
        formData.append('parentId', folderId);
      }
      formData.append('source', driveConnected ? 'gdrive' : 'internal');

      const res = await fetch('/api/repository/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error || 'Failed to upload folder');
      }

      await refreshRepository();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unable to upload folder');
    } finally {
      setActionLoading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleCreateGoogleDoc = async () => {
    const name = prompt('Enter Google Doc name', 'Untitled Document');
    if (!name?.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/repository/drive/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, parentId: folderId || null }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error || 'Failed to create Google Doc');
      }
      await refreshRepository();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unable to create Google Doc');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateGoogleSheet = async () => {
    const name = prompt('Enter Google Sheet name', 'Untitled Spreadsheet');
    if (!name?.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/repository/drive/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, parentId: folderId || null }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error || 'Failed to create Google Sheet');
      }
      await refreshRepository();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unable to create Google Sheet');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRename = async (item: RepositoryItem) => {
    const name = prompt('Enter new name', item.name);
    if (!name?.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/repository/${item.id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error || 'Failed to rename item');
      }
      await refreshRepository();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unable to rename item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (item: RepositoryItem) => {
    if (!window.confirm(`Delete ${item.type.toLowerCase()} "${item.name}"? This cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/repository/${item.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error || 'Failed to delete item');
      }
      await refreshRepository();
      if (folderId && item.type === 'FOLDER' && item.id === folderId) {
        navigate('/repository');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unable to delete item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = (item: RepositoryItem) => {
    window.open(`/api/repository/${item.id}/download`, '_blank');
    setActiveItemMenu(null);
  };

  const handleShowInfo = async (item: RepositoryItem) => {
    setInfoItem(item);
    setInfoMetadata(null);
    setActiveItemMenu(null);

    if (item.source === 'gdrive' && item.externalId) {
      try {
        const res = await fetch(`/api/repository/drive/${item.id}/metadata`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load Drive metadata');
        const metadata = await res.json();
        setInfoMetadata(metadata);
      } catch (err: any) {
        console.error(err);
      }
    }
  };

  const findFolderByPath = (nodes: RepositoryItem[], path: string): RepositoryItem | null => {
    const segments = path.split('/').map((s) => s.trim()).filter(Boolean);
    if (segments.length === 0) return null;

    const search = (children: RepositoryItem[], segmentIndex: number): RepositoryItem | null => {
      for (const node of children) {
        if (node.type !== 'FOLDER') continue;
        if (node.name === segments[segmentIndex]) {
          if (segmentIndex === segments.length - 1) return node;
          if (node.children) {
            const found = search(node.children, segmentIndex + 1);
            if (found) return found;
          }
        }
      }
      return null;
    };

    return search(tree, 0);
  };

  const handleMove = async (item: RepositoryItem) => {
    const destination = prompt('Enter destination folder path (e.g. Auditie/Shared) or leave empty to move to root');
    if (destination === null) return;

    let parentId: string | null = null;
    if (destination.trim()) {
      const destinationFolder = findFolderByPath(tree, destination.trim());
      if (!destinationFolder) {
        setError('Destination folder path not found');
        return;
      }
      parentId = destinationFolder.id;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/repository/${item.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parentId }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error || 'Failed to move item');
      }
      await refreshRepository();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unable to move item');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Drive view/edit/versions UI ---
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState<string | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsList, setVersionsList] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsTarget, setVersionsTarget] = useState<RepositoryItem | null>(null);

  const handleViewItem = async (item: RepositoryItem) => {
    try {
      const res = await fetch(`/api/repository/${item.id}/view`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to get view link');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('Drive link not returned');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to open view link');
    }
  };
 
  const handleEditItem = async (item: RepositoryItem) => {
    try {
      const res = await fetch(`/api/repository/${item.id}/edit`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to get edit link');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('Drive link not returned');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to open edit link');
    }
  };

  const openVersionsModal = async (item: RepositoryItem) => {
    setVersionsTarget(item);
    setVersionsOpen(true);
    setVersionsLoading(true);
    try {
      const [revRes, auditRes] = await Promise.all([
        fetch(`/api/repository/${item.id}/versions`, { credentials: 'include' }),
        fetch('/api/audit', { credentials: 'include' }),
      ]);

      const revData = revRes.ok ? await revRes.json() : [];
      const auditData = auditRes.ok ? await auditRes.json() : [];

      // Filter audit entries for this item
      const itemAudits = Array.isArray(auditData) ? auditData.filter((a: any) => a.repositoryItemId === item.id) : [];

      // Normalize and merge
      const merged: any[] = [];
      if (Array.isArray(revData)) {
        for (const r of revData) {
          merged.push({ kind: 'revision', id: r.id || r.revisionId || null, timestamp: r.modifiedTime || r.modifiedAt || r.modified_on || null, actor: r.lastModifyingUser?.displayName || r.lastModifyingUser?.emailAddress || null, details: `Drive revision ${r.id || ''}` });
        }
      }
      for (const a of itemAudits) {
        merged.push({ kind: 'audit', id: a.id, timestamp: a.timestamp || a.createdAt || null, actor: a.user?.name || null, details: a.details || a.actionType || '' });
      }

      merged.sort((x, y) => (new Date(y.timestamp || 0).getTime() - new Date(x.timestamp || 0).getTime()));
      setVersionsList(merged);
    } catch (err: any) {
      setError(err?.message || 'Failed to load versions');
    } finally {
      setVersionsLoading(false);
    }
  };

  const closeVersionsModal = () => {
    setVersionsOpen(false);
    setVersionsList([]);
    setVersionsTarget(null);
  };

  const closeInfoModal = () => setInfoItem(null);

  // Folder tree UI removed for a cleaner Repository view

  return (
    <PageContainer
      title={pageTitle}
      subtitle="Secure access to approved compliance assets"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" ref={topMenuRef}>
            <button
              onClick={() => setTopMenuOpen(!topMenuOpen)}
              disabled={actionLoading}
              className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center gap-2"
            >
              <MoreVertical className="w-3.5 h-3.5" />
              Actions
            </button>
            {topMenuOpen && (
              <div className="absolute right-0 top-10 z-50 w-52 rounded-2xl border border-slate-200 bg-white shadow-xl p-1">
                {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
                  <>
                    <button
                      onClick={() => {
                        handleCreateFolder();
                        setTopMenuOpen(false);
                      }}
                      disabled={actionLoading}
                      className="w-full text-left px-3 py-2.5 rounded text-sm font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      New Folder
                    </button>
                    <button
                      onClick={() => {
                        handleUploadClick();
                        setTopMenuOpen(false);
                      }}
                      disabled={actionLoading}
                      className="w-full text-left px-3 py-2.5 rounded text-sm font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Files
                    </button>
                    <button
                      onClick={() => {
                        handleUploadFolderClick();
                        setTopMenuOpen(false);
                      }}
                      disabled={actionLoading}
                      className="w-full text-left px-3 py-2.5 rounded text-sm font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
                    >
                      <FolderUp className="w-4 h-4" />
                      Upload Folder
                    </button>
                    {driveConnected && (
                      <>
                        <div className="h-px bg-slate-200 my-1" />
                        <button
                          onClick={() => {
                            handleCreateGoogleDoc();
                            setTopMenuOpen(false);
                          }}
                          disabled={actionLoading}
                          className="w-full text-left px-3 py-2.5 rounded text-sm font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          New Google Doc
                        </button>
                        <button
                          onClick={() => {
                            handleCreateGoogleSheet();
                            setTopMenuOpen(false);
                          }}
                          disabled={actionLoading}
                          className="w-full text-left px-3 py-2.5 rounded text-sm font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
                        >
                          <Archive className="w-4 h-4" />
                          New Google Sheet
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            onClick={refreshRepository}
            disabled={actionLoading}
            className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Refresh
          </button>
          <DriveConnectControls />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUploadFiles}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            {...({ webkitdirectory: '', directory: '' } as any)}
            onChange={handleUploadFolder}
          />
        </div>
      }
    >
      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}
      <div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-bold">Current Folder</p>
                <h2 className="text-xl font-semibold text-slate-900">{currentFolder ? currentFolder.name : 'Root'}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                <button onClick={() => navigate('/repository')} className="hover:text-slate-900">Root</button>
                {currentPath.map((folder) => (
                  <span key={folder.id} className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3" />
                    <button
                      onClick={() => navigate(`/repository/${folder.id}`)}
                      className="hover:text-slate-900"
                    >
                      {folder.name}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500 shadow-sm">Loading repository contents...</div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400 uppercase tracking-[0.25em] text-[10px] font-bold shadow-sm">
              No repository items found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  onDoubleClick={() => item.type === 'FOLDER' && navigate(`/repository/${item.id}`)}
                  onMouseLeave={() => activeItemMenu === item.id && setActiveItemMenu(null)}
                  className={cn(
                    'bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4',
                    item.type === 'FOLDER' ? 'cursor-pointer' : ''
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold">{item.type}</p>
                      <h3 className="text-base font-semibold text-slate-900 truncate">{item.name}</h3>
                      {item.externalId && item.source === 'gdrive' && (
                        <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] uppercase tracking-[0.25em] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Drive
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveItemMenu(activeItemMenu === item.id ? null : item.id)}
                        className="absolute top-3 right-3 text-slate-500 hover:text-slate-900 p-2 rounded-full transition"
                      >
                        <Menu className="w-4 h-4" />
                      </button>
                      {activeItemMenu === item.id && (
                        <div className="absolute right-3 top-10 z-10 w-44 rounded-2xl border border-slate-200 bg-white shadow-lg p-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(item)}
                            className="w-full text-left px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-100 transition"
                          >
                            Download
                          </button>
                          {item.source === 'gdrive' && item.externalId ? (
                            <>
                              <button
                                type="button"
                                onClick={async () => { setActiveItemMenu(null); handleViewItem(item); }}
                                className="w-full text-left px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-100 transition"
                              >
                                Open in Drive
                              </button>
                              {item.type === 'FILE' && (
                                <button
                                  type="button"
                                  onClick={async () => { setActiveItemMenu(null); handleEditItem(item); }}
                                  className="w-full text-left px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-100 transition"
                                >
                                  Edit in Drive
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => { setActiveItemMenu(null); openVersionsModal(item); }}
                                className="w-full text-left px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-100 transition"
                              >
                                Versions
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => { setActiveItemMenu(null); openVersionsModal(item); }}
                              className="w-full text-left px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-100 transition"
                            >
                              Versions
                            </button>
                          )}
                          {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleMove(item)}
                                className="w-full text-left px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-100 transition"
                              >
                                Move
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRename(item)}
                                className="w-full text-left px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-100 transition"
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="w-full text-left px-3 py-2 rounded text-sm text-rose-700 hover:bg-rose-100 transition"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleShowInfo(item)}
                            className="w-full text-left px-3 py-2 rounded text-sm text-slate-700 hover:bg-slate-100 transition"
                          >
                            {item.type === 'FOLDER' ? 'Folder information' : 'File information'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <div className="text-[11px] text-slate-500 leading-6">
                      Created by {item.createdBy?.name || 'System'}
                      {item.size != null && item.type === 'FILE' && ` • ${Math.round(item.size / 1024)} KB`}
                    </div>
                  </div>
                  {item.source === 'gdrive' && item.externalId && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewItem(item)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-100 transition"
                      >
                        Open in Drive
                      </button>
                      {item.type === 'FILE' && (
                        <button
                          type="button"
                          onClick={() => handleEditItem(item)}
                          className="rounded-full border border-slate-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300 hover:bg-blue-100 transition"
                        >
                          Edit in Drive
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {infoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-bold">
                  {infoItem.type === 'FOLDER' ? 'Folder Information' : 'File Information'}
                </p>
                <h3 className="text-lg font-semibold text-slate-900 truncate">{infoItem.name}</h3>
              </div>
              <button
                type="button"
                onClick={closeInfoModal}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 p-6 text-sm text-slate-600">
              <div><span className="font-semibold text-slate-900">Type:</span> {infoItem.type}</div>
              {infoItem.path && <div><span className="font-semibold text-slate-900">Path:</span> {infoItem.path}</div>}
              {infoItem.mimeType && <div><span className="font-semibold text-slate-900">Mime type:</span> {infoItem.mimeType}</div>}
              {infoItem.size != null && <div><span className="font-semibold text-slate-900">Size:</span> {Math.round(infoItem.size / 1024)} KB</div>}
              <div><span className="font-semibold text-slate-900">Created by:</span> {infoItem.createdBy?.name || 'System'}</div>
              {infoItem.createdAt && <div><span className="font-semibold text-slate-900">Created at:</span> {new Date(infoItem.createdAt).toLocaleString()}</div>}
              {infoItem.externalId && <div><span className="font-semibold text-slate-900">External ID:</span> {infoItem.externalId}</div>}
            {infoMetadata?.owners?.[0]?.displayName && <div><span className="font-semibold text-slate-900">Owner:</span> {infoMetadata.owners[0].displayName}</div>}
            {infoMetadata?.lastModifyingUser?.displayName && <div><span className="font-semibold text-slate-900">Last modified by:</span> {infoMetadata.lastModifyingUser.displayName}</div>}
            {infoMetadata?.modifiedTime && <div><span className="font-semibold text-slate-900">Modified at:</span> {new Date(infoMetadata.modifiedTime).toLocaleString()}</div>}
            {infoMetadata?.createdTime && <div><span className="font-semibold text-slate-900">Created at:</span> {new Date(infoMetadata.createdTime).toLocaleString()}</div>}
            {infoMetadata?.webViewLink && (
              <div>
                <span className="font-semibold text-slate-900">Drive link:</span>{' '}
                <a href={infoMetadata.webViewLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  Open in Drive
                </a>
              </div>
            )}
            </div>
            <div className="border-t border-slate-200 px-6 py-4 text-right">
              <button
                type="button"
                onClick={closeInfoModal}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {viewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-6xl h-[80vh] rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
              <h3 className="font-bold text-slate-900">Drive View</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setViewUrl(null); }} className="text-sm px-3 py-1 rounded bg-slate-100">Close</button>
                <a href={viewUrl} target="_blank" rel="noreferrer" className="text-sm px-3 py-1 rounded bg-blue-600 text-white">Open in Drive</a>
              </div>
            </div>
            <div className="flex h-full flex-col">
              <div className="p-6 border-b border-slate-200">
                <p className="text-sm text-slate-700">Google Drive preview links often cannot be rendered inside an iframe due to Drive security headers. Use the button below to open the item directly in Google Drive.</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe title="Drive View" src={viewUrl} className="w-full h-full border-0" />
              </div>
            </div>
          </div>
        </div>
      )}

      {editUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-6xl h-[80vh] rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
              <h3 className="font-bold text-slate-900">Drive Edit</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditUrl(null); }} className="text-sm px-3 py-1 rounded bg-slate-100">Close</button>
                <button onClick={() => { setEditUrl(null); refreshRepository(); }} className="text-sm px-3 py-1 rounded bg-emerald-500 text-white">Done editing (Refresh)</button>
                <a href={editUrl} target="_blank" rel="noreferrer" className="text-sm px-3 py-1 rounded bg-blue-600 text-white">Open in Drive</a>
              </div>
            </div>
            <div className="flex h-full flex-col">
              <div className="p-6 border-b border-slate-200">
                <p className="text-sm text-slate-700">Google Drive edit pages may not render inside an iframe. Click Open in Drive to continue editing in Google Drive.</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe title="Drive Edit" src={editUrl} className="w-full h-full border-0" />
              </div>
            </div>
          </div>
        </div>
      )}

      {versionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-4xl h-[70vh] rounded-3xl bg-white shadow-2xl overflow-auto">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
              <h3 className="font-bold text-slate-900">Versions & Audit ({versionsTarget?.name})</h3>
              <div className="flex items-center gap-2">
                <button onClick={closeVersionsModal} className="text-sm px-3 py-1 rounded bg-slate-100">Close</button>
                <button onClick={() => { closeVersionsModal(); refreshRepository(); }} className="text-sm px-3 py-1 rounded bg-emerald-500 text-white">Refresh</button>
              </div>
            </div>
            <div className="p-4">
              {versionsLoading ? (
                <div className="text-slate-500">Loading versions...</div>
              ) : versionsList.length === 0 ? (
                <div className="text-slate-400">No versions or audits available.</div>
              ) : (
                <ul className="space-y-3">
                  {versionsList.map((v, i) => (
                    <li key={i} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs text-slate-400">{v.kind === 'revision' ? 'Drive Revision' : 'Audit Log'}</div>
                          <div className="font-semibold text-slate-800">{v.actor || 'System'}</div>
                          <div className="text-sm text-slate-600">{v.details}</div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div>{v.timestamp ? new Date(v.timestamp).toLocaleString() : ''}</div>
                          {v.kind === 'revision' && versionsTarget?.externalId && (
                            <a className="inline-block mt-2 text-blue-600 text-xs" target="_blank" rel="noreferrer" href={`https://drive.google.com/file/d/${versionsTarget.externalId}/view`}>
                              Open in Drive
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

// --- User Management Page ---

function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showAssignProjectModal, setShowAssignProjectModal] = useState(false);
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    onLeaveUsers: 0,
  });

  const getOpenActivityCount = (userRecord: any) =>
    (userRecord.taskAssignments?.length || 0) + (userRecord.assignedAreas?.length || 0);

  useEffect(() => {
    loadUsers();
    loadWorkload();
  }, [search, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      const url = new URLSearchParams({
        page: '1',
        limit: '100',
        search,
        role: roleFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/users?${url}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`Failed to fetch users: ${res.status}`);
      }
      const data = await res.json();
      setUsers(data.users || []);
      
      setStats({
        totalUsers: data.total || 0,
        activeUsers: (data.users || []).filter((u: any) => u.status === 'ACTIVE').length,
        inactiveUsers: (data.users || []).filter((u: any) => u.status === 'INACTIVE').length,
        onLeaveUsers: (data.users || []).filter((u: any) => u.status === 'ON_LEAVE').length,
      });
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkload = async () => {
    try {
      const res = await fetch('/api/users/workload', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`Failed to fetch workload: ${res.status}`);
      }
      const data = await res.json();
      setWorkload(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading workload:', error);
      setWorkload([]);
    }
  };

  const handleAddUser = async (formData: any) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowAddModal(false);
        loadUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create user');
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEditUser = async (formData: any) => {
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers((prev) => prev.map((item) => item.id === updatedUser.id ? { ...item, ...updatedUser } : item));
        setShowEditModal(false);
        setEditingUser(null);
        loadUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update user');
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Permanently delete this employee? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        loadUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete employee');
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update status');
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleViewProfile = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { credentials: 'include' });
      const data = await res.json();
      setSelectedUser(data);
      setShowProfileDrawer(true);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  return (
    <PageContainer
      title="User Management"
      subtitle="Manage team members, assign projects, and track performance"
      actions={user?.role === 'ADMIN' && (
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
        >
          <Plus className="w-3.5 h-3.5" />
          Add User
        </button>
      )}
    >
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-slate-900' },
          { label: 'Active Users', value: stats.activeUsers, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Inactive Users', value: stats.inactiveUsers, icon: AlertCircle, color: 'text-slate-400' },
          { label: 'On Leave', value: stats.onLeaveUsers, icon: Clock, color: 'text-amber-600' },
        ].map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -2 }}
            className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm"
          >
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{item.label}</p>
            <div className="flex items-end gap-2">
              <span className={cn("text-2xl font-bold tracking-tight", item.color)}>{item.value}</span>
              <item.icon className="w-4 h-4 text-slate-300 mb-1" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, or employee ID..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="AUDITOR">Auditor</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">&nbsp;</label>
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
              }}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tasks</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-slate-400">Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-slate-400 italic">No users found</td>
              </tr>
            ) : (
              users.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {u.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                        <p className="text-[10px] text-slate-400">Emp ID: {u.employeeId || '-'} {u.phone ? `| ${u.phone}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{u.department || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-tighter">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600">
                      <span className="font-bold">{getOpenActivityCount(u)}</span>
                      <span className="text-[10px] text-slate-400"> open</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user?.role === 'ADMIN' ? (
                      <select
                        value={u.status}
                        onChange={(e) => handleUpdateUserStatus(u.id, e.target.value)}
                        className={cn(
                          "rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-tighter outline-none",
                          u.status === 'ACTIVE' ? "border-emerald-100 bg-emerald-50 text-emerald-600" :
                          u.status === 'INACTIVE' ? "border-slate-100 bg-slate-50 text-slate-600" :
                          u.status === 'ON_LEAVE' ? "border-amber-100 bg-amber-50 text-amber-600" : "border-rose-100 bg-rose-50 text-rose-600"
                        )}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="ON_LEAVE">ON_LEAVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                    ) : (
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
                        u.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" :
                        u.status === 'INACTIVE' ? "bg-slate-50 text-slate-600" :
                        u.status === 'ON_LEAVE' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {u.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewProfile(u.id)}
                        className="p-1.5 hover:bg-slate-100 rounded transition"
                        title="View Profile"
                      >
                        <FileText className="w-4 h-4 text-slate-400" />
                      </button>
                      {user?.role === 'ADMIN' && (
                        <>
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 hover:bg-blue-50 rounded transition"
                            title="Edit User"
                          >
                            <Edit3 className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 hover:bg-rose-50 rounded transition"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Workload Chart */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4">Team Workload</h3>
        <div className="space-y-4">
          {workload.slice(0, 10).map((item: any) => (
            <div key={item.userId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                <span className={cn(
                  "text-xs font-bold",
                  item.workloadStatus === 'red' ? 'text-rose-600' :
                  item.workloadStatus === 'yellow' ? 'text-amber-600' : 'text-emerald-600'
                )}>
                  {Math.round(item.capacityPercent)}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    item.workloadStatus === 'red' ? 'bg-rose-500' :
                    item.workloadStatus === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(item.capacityPercent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <UserFormModal
          title="Add New User"
          onSubmit={handleAddUser}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <UserFormModal
          title="Edit User"
          initialData={editingUser}
          onSubmit={handleEditUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* User Profile Drawer */}
      {showProfileDrawer && selectedUser && (
        <UserProfileDrawer
          user={selectedUser}
          onClose={() => {
            setShowProfileDrawer(false);
            setSelectedUser(null);
          }}
        />
      )}
    </PageContainer>
  );
}

// User Form Modal Component
function UserFormModal({ title, initialData, onSubmit, onClose }: any) {
  const [formData, setFormData] = useState(initialData || {});
  const modalRef = useRef<HTMLDivElement | null>(null);
  useOutsideClick(modalRef, onClose);

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
            <input
              type="email"
              required
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="john@example.com"
            />
          </div>

          {!initialData && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                required
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Employee ID</label>
            <input
              type="text"
              value={formData.employeeId || ''}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="EMP-001"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role</label>
            <select
              value={formData.role || 'AUDITOR'}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="ADMIN">Admin</option>
              <option value="AUDITOR">Auditor</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
            <select
              value={formData.status || 'ACTIVE'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Department</label>
            <input
              type="text"
              value={formData.department || ''}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="IT Security"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Designation</label>
            <input
              type="text"
              value={formData.designation || ''}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Senior Auditor"
            />
          </div>
          </div>

          <div className="flex shrink-0 gap-3 border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 rounded text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-900 rounded text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const controlStatusConfig = [
  { key: 'completed', label: 'Completed', color: '#16a34a', textClass: 'text-emerald-600', bgClass: 'bg-emerald-50' },
  { key: 'underReview', label: 'Under Review', color: '#f59e0b', textClass: 'text-amber-600', bgClass: 'bg-amber-50' },
  { key: 'inProgress', label: 'In Progress', color: '#2563eb', textClass: 'text-blue-600', bgClass: 'bg-blue-50' },
  { key: 'delayed', label: 'Delayed', color: '#dc2626', textClass: 'text-rose-600', bgClass: 'bg-rose-50' },
  { key: 'notStarted', label: 'Not Started', color: '#94a3b8', textClass: 'text-slate-600', bgClass: 'bg-slate-100' },
] as const;

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function ControlStatusDistributionChart({ performance }: { performance: any }) {
  const segments = controlStatusConfig.map((status) => ({
    ...status,
    value: Number(performance?.[status.key] || 0),
  }));
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const size = 260;
  const radius = 86;
  const center = size / 2;
  const gapDegrees = total > 0 ? 1.5 : 0;
  let currentAngle = 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h5 className="text-sm font-bold text-slate-900">Control Status Distribution</h5>
          <p className="text-[11px] font-medium text-slate-500">Assigned controls split by current status.</p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 shadow-sm">
          {total} total
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
        <div className="relative w-full max-w-[280px] shrink-0">
          <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[260px] w-[260px]">
            {total > 0 ? (
              segments.map((segment) => {
                if (segment.value <= 0) return null;
                const sweep = (segment.value / total) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + Math.max(sweep - gapDegrees, 0);
                currentAngle += sweep;

                const midAngle = startAngle + (endAngle - startAngle) / 2;
                const labelPoint = polarToCartesian(center, center, radius * 0.68, midAngle);
                const percentage = Math.round((segment.value / total) * 100);

                return (
                  <g key={segment.key}>
                    <path d={describeArc(center, center, radius, startAngle, endAngle)} fill={segment.color}>
                      <title>{`${segment.label}: ${segment.value} controls (${percentage}%)`}</title>
                    </path>
                    {percentage > 0 ? (
                      <text
                        x={labelPoint.x}
                        y={labelPoint.y}
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="700"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {percentage}%
                      </text>
                    ) : null}
                  </g>
                );
              })
            ) : (
              <circle cx={center} cy={center} r={radius} fill="#e2e8f0" />
            )}
            <circle cx={center} cy={center} r={46} fill="#ffffff" />
            <text x={center} y={center - 6} textAnchor="middle" className="fill-slate-900 text-[18px] font-bold">
              {total}
            </text>
            <text x={center} y={center + 14} textAnchor="middle" className="fill-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
              Controls
            </text>
          </svg>
        </div>

        <div className="grid w-full gap-2">
          {segments.map((segment) => {
            const percentage = total > 0 ? Math.round((segment.value / total) * 100) : 0;
            return (
              <div key={segment.key} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-sm font-semibold text-slate-700">{segment.label}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{percentage}%</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{segment.value} count</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// User Profile Drawer Component
function UserProfileDrawer({ user, onClose }: any) {
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState<any[]>([]);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const assignedAreas = user.assignedAreas || [];
  const taskAssignments = user.taskAssignments || [];
  const hasAssignedWork = taskAssignments.length > 0 || assignedAreas.length > 0;

  useEffect(() => {
    if (activeTab === 'activity') {
      fetch(`/api/users/${user.id}/activity?limit=20`, { credentials: 'include' })
        .then(res => res.json())
        .then(setActivities)
        .catch(console.error);
    }
  }, [activeTab]);
  useOutsideClick(drawerRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <motion.div
        ref={drawerRef}
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
          <h2 className="font-bold text-slate-900">User Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-start gap-6 p-6 border-b border-slate-200 shrink-0">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600">
            {user.name.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{user.name}</h3>
            <p className="text-slate-500 text-sm">{user.email}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
              {user.role} • {user.status}
            </p>
          </div>
        </div>

        <div className="flex gap-1 p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          {['overview', 'tasks', 'activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded text-sm font-semibold capitalize transition",
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
                  <p className="text-sm text-slate-800 font-semibold">{user.department || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Designation</p>
                  <p className="text-sm text-slate-800 font-semibold">{user.designation || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee ID</p>
                  <p className="text-sm text-slate-800 font-semibold">{user.employeeId || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                  <p className="text-sm text-slate-800 font-semibold">{user.phone || '—'}</p>
                </div>
              </div>

              {user.performance && (
                <div className="border-t border-slate-200 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="font-bold text-slate-800">Progress</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Controls</p>
                      <p className="text-xl font-bold text-slate-900">{user.performance.assignedControls ?? user.performance.tasksAssigned ?? 0}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completed</p>
                      <p className="text-xl font-bold text-emerald-600">{user.performance.completed ?? user.performance.tasksCompleted ?? 0}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Under Review</p>
                      <p className="text-xl font-bold text-amber-600">{user.performance.underReview || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">In Progress</p>
                      <p className="text-xl font-bold text-blue-600">{user.performance.inProgress || 0}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Delayed</p>
                      <p className="text-xl font-bold text-rose-600">{user.performance.delayed ?? user.performance.overdueTasks ?? 0}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Not Started</p>
                      <p className="text-xl font-bold text-slate-900">{user.performance.notStarted || 0}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ControlStatusDistributionChart performance={user.performance} />
                  </div>
                </div>
              )}

              {user.userProjects.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="font-bold text-slate-800 mb-3">Assigned Projects</h4>
                  <div className="space-y-2">
                    {user.userProjects.map((up: any) => (
                      <div key={up.projectId} className="p-2 bg-slate-50 rounded text-sm">
                        <p className="font-semibold text-slate-800">{up.project.projectName}</p>
                        <p className="text-[10px] text-slate-400">{up.projectRole}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="p-6">
              {hasAssignedWork ? (
                <div className="space-y-5">
                  {assignedAreas.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Assigned Areas</h4>
                      <div className="space-y-3">
                        {assignedAreas.map((area: any) => (
                          <div key={area.id} className="p-3 border border-slate-200 rounded hover:bg-slate-50 transition">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{area.areaName}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {area.project?.projectName || 'Project activity'}
                                  {area.project?.clientName ? ` | ${area.project.clientName}` : ''}
                                </p>
                              </div>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap",
                                area.status === 'Completed' || area.status === 'COMPLETED'
                                  ? "bg-emerald-50 text-emerald-600"
                                  : area.status === 'In Progress' || area.status === 'IN_PROGRESS'
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-blue-50 text-blue-600"
                              )}>
                                {area.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Due: {area.dueDate ? new Date(area.dueDate).toLocaleDateString() : 'Not set'}
                            </p>
                            {area.remarks ? (
                              <p className="text-xs text-slate-500 mt-2">{area.remarks}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {taskAssignments.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Direct Tasks</h4>
                      <div className="space-y-3">
                        {taskAssignments.map((task: any) => (
                          <div key={task.id} className="p-3 border border-slate-200 rounded hover:bg-slate-50 transition">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-slate-800 text-sm">{task.description || `Task ${task.id}`}</p>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
                                task.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                              )}>
                                {task.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-slate-400 text-sm">No activities assigned</p>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="p-6">
              {activities.length === 0 ? (
                <p className="text-center text-slate-400 text-sm">No activity</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((act: any) => (
                    <div key={act.id} className="p-3 border border-slate-200 rounded text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{act.action}</span>
                        <span className="text-[10px] text-slate-400">{new Date(act.createdAt).toLocaleString()}</span>
                      </div>
                      {act.entityName && (
                        <p className="text-[10px] text-slate-500 mt-1">{act.entityName}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// --- Main App Component ---

function MainLayout() {
  const { loading, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans relative">
      {/* Sidebar - Desktop and Mobile Sidebar Wrapper */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 w-64 shrink-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar />
      </div>

      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header (Visible only on small screens) */}
        <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-tight text-slate-400">SMNA</span>
              <span className="font-bold tracking-tight leading-none">Auditie</span>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full flex flex-col"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Bar */}
        <footer className="bg-white border-t border-slate-200 h-10 px-8 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
          <div className="flex items-center gap-4 hidden sm:flex font-bold uppercase tracking-tighter">
             <span className="text-slate-500">Workflow: <span className="text-emerald-500">Enforced</span></span>
          </div>
          <div className="truncate">
            Instance: <span className="font-mono text-slate-300">COMP-PRD-{user.id.slice(0,5).toUpperCase()}</span> • Auth: <span className="text-blue-500 font-bold uppercase tracking-widest">{user.role}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/my-work" element={<LazyModule><PersonalWorkspacePage /></LazyModule>} />
            <Route path="/projects" element={<LazyModule><ProjectsPage /></LazyModule>} />
            <Route path="/projects/:id" element={<LazyModule><ProjectDetailsPage /></LazyModule>} />
            <Route path="/projects/:id/milestones/:milestoneId" element={<LazyModule><MilestoneWorkspacePage /></LazyModule>} />
            <Route path="/projects/:id/areas/:areaId" element={<LazyModule><AuditAreaWorkspacePage /></LazyModule>} />
            <Route path="/templates" element={<LazyModule><TemplateAutomationPage /></LazyModule>} />
            <Route path="/repository" element={<RepositoryPage />} />
            <Route path="/repository/:folderId" element={<RepositoryPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
