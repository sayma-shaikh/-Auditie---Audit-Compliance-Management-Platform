import React, { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  FolderKanban,
  Keyboard,
  RefreshCw,
  Search,
  Send,
  Upload,
  Zap,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DashboardTask = {
  id: string;
  task: string;
  projectId?: string;
  project: string;
  auditArea: string;
  framework: string;
  priority: string;
  status: string;
  dueDate?: string | null;
  reviewer: string;
  progress: number;
  href: string;
  action: string;
};

type AuditorDashboard = {
  user: { name: string };
  generatedAt: string;
  hero: { greeting: string; attentionTasks: number; pendingReviews: number; dueToday: number; resume?: DashboardTask | null };
  summary: Record<string, number>;
  performance: { completionRate: number; onTimeDelivery: number; averageReviewTime: number; pendingWorkload: number; trend: number[] };
  workload: { label: string; utilization: number; openTasks: number };
  tasks: DashboardTask[];
  priority: DashboardTask[];
  projects: Array<{ id: string; logo: string; clientName: string; projectName: string; framework: string; currentPhase: string; progress: number; startDate?: string | null; endDate?: string | null; team: string[]; deadlineCountdown: string; href: string; pinned: boolean }>;
  pinnedProjects: Array<{ id: string; clientName: string; href: string; framework: string }>;
  assignedAreas: Array<{ name: string; controls: number; completed: number; pending: number; returned: number; href: string }>;
  reviews: Array<{ id: string; submittedBy: string; project: string; area: string; submittedTime?: string | null; href: string; priority: string }>;
  returnedToMe: Array<{ id: string; task: string; project: string; reason: string; returnedBy: string; date?: string | null; priority: string; href: string }>;
  deadlines: Array<{ id: string; label: string; title: string; project: string; dueDate?: string | null; href: string; type: string }>;
  activity: Array<{ id: string; time: string; action: string; subject: string }>;
  files: Array<{ id: string; fileName: string; project: string; area: string; href: string; uploadedAt?: string }>;
  quickAccess: Array<{ label: string; href: string }>;
  notifications: Array<{ id: string; title: string; body: string; unread: boolean; href: string }>;
  productivity: {
    draftChecklists: DashboardTask[];
    calendar: Array<{ id: string; label: string; title: string; project: string; href: string }>;
    uploadQueue: Array<{ id: string; fileName: string; status: string }>;
    offlineRecovery?: { title: string; href: string; savedAt?: string | null } | null;
    shortcuts: string[];
  };
};

const card = 'rounded-xl border border-slate-200 bg-white shadow-sm';

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (value.includes('overdue')) return 'bg-rose-50 text-rose-700 ring-rose-100';
  if (value.includes('returned')) return 'bg-orange-50 text-orange-700 ring-orange-100';
  if (value.includes('review')) return 'bg-amber-50 text-amber-700 ring-amber-100';
  if (value.includes('approved') || value.includes('completed')) return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (value.includes('progress')) return 'bg-blue-50 text-blue-700 ring-blue-100';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function priorityClass(priority: string) {
  const value = priority.toLowerCase();
  if (value === 'critical') return 'text-rose-700 bg-rose-50';
  if (value === 'high') return 'text-orange-700 bg-orange-50';
  if (value === 'medium') return 'text-blue-700 bg-blue-50';
  return 'text-slate-700 bg-slate-100';
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">{text}</div>;
}

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-200" />)}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}

function MetricCard({ label, value, detail, tone = 'blue' }: { label: string; value: string | number; detail: string; tone?: 'blue' | 'red' | 'green' | 'slate' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn(card, 'p-4 transition hover:-translate-y-0.5 hover:shadow-md', tone === 'red' && 'border-rose-200 bg-rose-50', tone === 'green' && 'border-emerald-200 bg-emerald-50')}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={cn('mt-2 text-2xl font-extrabold text-slate-950', tone === 'red' && 'text-rose-700', tone === 'green' && 'text-emerald-700')}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </motion.div>
  );
}

function ProgressBar({ value, color = 'bg-blue-600' }: { value: number; color?: string }) {
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} className={cn('h-full rounded-full', color)} />
    </div>
  );
}

function AuditorDashboardPage() {
  const [dashboard, setDashboard] = useState<AuditorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '', project: '', priority: '', reviewer: '', framework: '', due: '' });

  const loadDashboard = () => {
    setLoading(true);
    setError('');
    fetch('/api/my-dashboard', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Unable to load auditor workspace');
        setDashboard(data);
      })
      .catch((err) => setError(err.message || 'Unable to load auditor workspace'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === '/') {
        event.preventDefault();
        alert('Shortcuts: Ctrl+S save draft, Ctrl+Enter submit, Ctrl+F search checklist, Ctrl+/ shortcuts');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (dashboard?.tasks || []).filter((task) => {
      const haystack = [task.task, task.project, task.auditArea, task.framework, task.reviewer].join(' ').toLowerCase();
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      return (!filters.search || haystack.includes(filters.search.toLowerCase()))
        && (!filters.status || task.status === filters.status)
        && (!filters.project || task.project === filters.project)
        && (!filters.priority || task.priority === filters.priority)
        && (!filters.reviewer || task.reviewer === filters.reviewer)
        && (!filters.framework || task.framework === filters.framework)
        && (!filters.due || (filters.due === 'today' && dueDate?.toDateString() === today.toDateString()) || (filters.due === 'overdue' && dueDate && dueDate < today));
    });
  }, [dashboard, filters]);

  const options = (key: keyof DashboardTask): string[] => Array.from(new Set((dashboard?.tasks || []).map((task) => String(task[key] || '')).filter(Boolean)));

  if (loading && !dashboard) return <Skeleton />;
  if (error && !dashboard) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
        <p className="font-bold text-rose-700">{error}</p>
        <button onClick={loadDashboard} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" /> Retry</button>
      </div>
    );
  }
  if (!dashboard) return null;

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long' });
  const unread = dashboard.notifications.filter((item) => item.unread).length;

  return (
    <div className="space-y-6 pb-20">
      {error && <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">Welcome Back, {dashboard.user.name.split(' ')[0] || 'Auditor'}</p>
          <p className="text-xs font-semibold text-slate-400">Today is {todayLabel}</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-blue-400 md:w-80" placeholder="Search everything..." />
          </div>
          <div className="relative">
            <button onClick={() => setNotificationsOpen((value) => !value)} className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unread ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">{unread}</span> : null}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {dashboard.notifications.length === 0 && <p className="p-3 text-sm font-semibold text-slate-500">No notifications.</p>}
                {dashboard.notifications.map((item) => (
                  <Link key={item.id} to={item.href} className="block rounded-lg p-3 hover:bg-slate-50">
                    <p className="text-sm font-extrabold text-slate-900">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{item.body}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link to="/my-work" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white"><Zap className="h-4 w-4" /> Quick Actions</Link>
        </div>
      </div>

      <section className={cn(card, 'overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white')}>
        <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-center">
          <div>
            <p className="text-sm font-bold text-blue-200">{dashboard.hero.greeting}</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-normal md:text-5xl">Your audit workspace is ready.</h1>
            <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-200 sm:grid-cols-3">
              <span>{dashboard.hero.attentionTasks} tasks require attention today.</span>
              <span>{dashboard.hero.pendingReviews} reviews pending.</span>
              <span>{dashboard.hero.dueToday} deadline today.</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={dashboard.hero.resume?.href || '/my-work'} className="rounded-lg bg-white px-4 py-2 text-sm font-extrabold text-slate-950">Resume Last Task</Link>
              <Link to="/my-work" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-extrabold text-white">Open My Tasks</Link>
              <Link to="/projects" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-extrabold text-white ring-1 ring-white/20">View Projects</Link>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Continue Where You Left Off</p>
            <h2 className="mt-3 text-xl font-extrabold">{dashboard.hero.resume?.task || 'No active checklist'}</h2>
            <p className="mt-1 text-sm font-semibold text-blue-100">{dashboard.hero.resume?.project || 'You are all caught up.'}</p>
            <Link to={dashboard.hero.resume?.href || '/my-work'} className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-white">Resume <ChevronRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Assigned Tasks" value={dashboard.summary.assignedTasks} detail={`+${dashboard.summary.newToday} new today`} />
        <MetricCard label="Pending Reviews" value={dashboard.summary.pendingReviews} detail="Waiting for your approval" />
        <MetricCard label="Overdue" value={dashboard.summary.overdueTasks} detail="Requires immediate attention" tone="red" />
        <MetricCard label="Completed This Week" value={dashboard.summary.completedThisWeek} detail="+12% weekly pace" tone="green" />
        <MetricCard label="Projects Assigned" value={`${dashboard.summary.projectsAssigned}`} detail="Active projects" />
        <div className={cn(card, 'p-4')}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Overall Completion</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-lg font-black text-blue-700 ring-8 ring-blue-100">{dashboard.summary.overallCompletion}%</div>
            <div className="min-w-0 flex-1"><ProgressBar value={dashboard.summary.overallCompletion} /></div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className={cn(card, 'overflow-hidden')}>
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">My Tasks</h2>
                <p className="text-sm font-semibold text-slate-500">Filter, submit, upload evidence, and continue checklist work.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><Send className="h-4 w-4" /> Submit</button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><CheckCircle2 className="h-4 w-4" /> Mark Complete</button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><Download className="h-4 w-4" /> Export</button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
              <Select value={filters.status} onChange={(value) => setFilters((f) => ({ ...f, status: value }))} label="Status" options={options('status')} />
              <Select value={filters.project} onChange={(value) => setFilters((f) => ({ ...f, project: value }))} label="Project" options={options('project')} />
              <Select value={filters.priority} onChange={(value) => setFilters((f) => ({ ...f, priority: value }))} label="Priority" options={options('priority')} />
              <Select value={filters.reviewer} onChange={(value) => setFilters((f) => ({ ...f, reviewer: value }))} label="Reviewer" options={options('reviewer')} />
              <Select value={filters.framework} onChange={(value) => setFilters((f) => ({ ...f, framework: value }))} label="Framework" options={options('framework')} />
              <Select value={filters.due} onChange={(value) => setFilters((f) => ({ ...f, due: value }))} label="Due Date" options={[{ label: 'Today', value: 'today' }, { label: 'Overdue', value: 'overdue' }]} />
            </div>
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                <tr><th className="px-4 py-3">Task</th><th>Project</th><th>Audit Area</th><th>Priority</th><th>Status</th><th>Due</th><th>Reviewer</th><th>Progress</th><th className="px-4">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-extrabold text-slate-950">{task.task}</td>
                    <td className="font-semibold text-slate-600">{task.project}</td>
                    <td className="font-semibold text-slate-600">{task.auditArea}</td>
                    <td><span className={cn('rounded-full px-2 py-1 text-[10px] font-black uppercase', priorityClass(task.priority))}>{task.priority}</span></td>
                    <td><span className={cn('rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1', statusClass(task.status))}>{task.status}</span></td>
                    <td className="font-semibold text-slate-600">{formatDate(task.dueDate)}</td>
                    <td className="font-semibold text-slate-600">{task.reviewer}</td>
                    <td className="w-32"><ProgressBar value={task.progress} color={task.status === 'Overdue' ? 'bg-rose-600' : 'bg-blue-600'} /><p className="mt-1 text-[10px] font-bold text-slate-500">{task.progress}%</p></td>
                    <td className="px-4"><Link to={task.href} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">{task.action}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-4 lg:hidden">
            {filteredTasks.map((task) => <TaskCard key={task.id} task={task} />)}
          </div>
          {filteredTasks.length === 0 && <div className="p-4"><EmptyState text="No tasks match the current filters." /></div>}
        </div>

        <aside className="space-y-6">
          <Panel title="Today's Priority" icon={<AlertCircle className="h-4 w-4" />}>
            <div className="space-y-3">
              {dashboard.priority.map((task) => <TaskCard key={task.id} task={task} compact />)}
              {dashboard.priority.length === 0 && <EmptyState text="No urgent work right now." />}
            </div>
          </Panel>
          <Panel title="Workload" icon={<Clock className="h-4 w-4" />}>
            <p className="text-3xl font-extrabold text-slate-950">{dashboard.workload.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{dashboard.workload.openTasks} open items assigned</p>
            <div className="mt-4"><ProgressBar value={dashboard.workload.utilization} color={dashboard.workload.label === 'Heavy' ? 'bg-rose-600' : 'bg-emerald-600'} /></div>
          </Panel>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="My Projects" icon={<FolderKanban className="h-4 w-4" />} className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard.projects.map((project) => (
              <Link to={project.href} key={project.id} className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-xs font-black text-blue-700">{project.logo}</div>
                    <div>
                      <h3 className="font-extrabold text-slate-950">{project.clientName}</h3>
                      <p className="text-xs font-bold text-slate-500">{project.framework} - {project.currentPhase}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-500">{project.deadlineCountdown}</span>
                </div>
                <div className="mt-4"><ProgressBar value={project.progress} /><p className="mt-1 text-xs font-bold text-slate-500">{project.progress}% complete</p></div>
                <p className="mt-3 text-xs font-semibold text-slate-500">{formatDate(project.startDate)} to {formatDate(project.endDate)} - {project.team.join(', ') || 'Team pending'}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold text-blue-700">Open Project <ChevronRight className="h-4 w-4" /></p>
              </Link>
            ))}
            {dashboard.projects.length === 0 && <EmptyState text="No projects assigned." />}
          </div>
        </Panel>
        <Panel title="My Assigned Areas" icon={<FileText className="h-4 w-4" />}>
          <div className="space-y-3">
            {dashboard.assignedAreas.map((area) => (
              <Link to={area.href} key={area.name} className="block rounded-xl border border-slate-200 p-3 hover:border-blue-300">
                <div className="flex items-center justify-between gap-3"><h3 className="font-extrabold text-slate-950">{area.name}</h3><ChevronRight className="h-4 w-4 text-slate-400" /></div>
                <p className="mt-2 text-xs font-semibold text-slate-500">{area.controls} controls - {area.completed} completed - {area.pending} pending - {area.returned} returned</p>
              </Link>
            ))}
            {dashboard.assignedAreas.length === 0 && <EmptyState text="No assigned audit areas." />}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="Review Queue" icon={<CheckCircle2 className="h-4 w-4" />}>
          <div className="space-y-3">
            {dashboard.reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-extrabold text-slate-950">{review.area}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{review.submittedBy} - {review.project} - {formatTime(review.submittedTime)}</p>
                <div className="mt-3 flex gap-2"><Link to={review.href} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Open Review</Link><button className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Approve</button><button className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">Return</button></div>
              </div>
            ))}
            {dashboard.reviews.length === 0 && <EmptyState text="No reviews waiting." />}
          </div>
        </Panel>
        <Panel title="Returned To Me" icon={<RefreshCw className="h-4 w-4" />}>
          <div className="space-y-3">
            {dashboard.returnedToMe.map((item) => (
              <Link to={item.href} key={item.id} className="block rounded-xl border border-orange-200 bg-orange-50 p-3">
                <p className="text-sm font-extrabold text-orange-950">{item.task}</p>
                <p className="mt-1 text-xs font-semibold text-orange-700">{item.reason}</p>
                <p className="mt-2 text-[11px] font-bold text-orange-600">Returned by {item.returnedBy} - {formatDate(item.date)}</p>
              </Link>
            ))}
            {dashboard.returnedToMe.length === 0 && <EmptyState text="Nothing has been returned to you." />}
          </div>
        </Panel>
        <Panel title="Upcoming Deadlines" icon={<CalendarDays className="h-4 w-4" />}>
          <Timeline items={dashboard.deadlines} />
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <Panel title="Recent Activity" icon={<Clock className="h-4 w-4" />} className="xl:col-span-2">
          <div className="space-y-3">
            {dashboard.activity.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="w-16 shrink-0 text-xs font-black text-slate-400">{formatTime(item.time)}</div>
                <div className="min-w-0 border-l border-slate-200 pl-3">
                  <p className="text-sm font-extrabold text-slate-950">{item.action}</p>
                  <p className="text-xs font-semibold text-slate-500">{item.subject}</p>
                </div>
              </div>
            ))}
            {dashboard.activity.length === 0 && <EmptyState text="No recent activity." />}
          </div>
        </Panel>
        <Panel title="My Performance" icon={<Zap className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3">
            <SmallMetric label="Completion Rate" value={`${dashboard.performance.completionRate}%`} />
            <SmallMetric label="On Time Delivery" value={`${dashboard.performance.onTimeDelivery}%`} />
            <SmallMetric label="Avg Review Time" value={`${dashboard.performance.averageReviewTime} days`} />
            <SmallMetric label="Pending Workload" value={dashboard.performance.pendingWorkload} />
          </div>
          <div className="mt-4 flex h-12 items-end gap-1">{dashboard.performance.trend.map((value, index) => <span key={index} className="w-full rounded-t bg-blue-500" style={{ height: `${Math.max(10, value / 1.5)}%` }} />)}</div>
        </Panel>
        <Panel title="Quick Access" icon={<Zap className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            {dashboard.quickAccess.map((item) => <Link key={item.label} to={item.href} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs font-extrabold text-slate-700 hover:border-blue-300 hover:bg-blue-50">{item.label}</Link>)}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <Panel title="Recent Files" icon={<FileText className="h-4 w-4" />}>
          <div className="space-y-2">
            {dashboard.files.slice(0, 5).map((file) => <Link to={file.href} key={file.id} className="block rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-700 hover:bg-blue-50">{file.fileName}<span className="block font-semibold text-slate-400">{file.area}</span></Link>)}
            {dashboard.files.length === 0 && <EmptyState text="No recent files." />}
          </div>
        </Panel>
        <Panel title="Draft Checklists" icon={<FileText className="h-4 w-4" />}>
          <div className="space-y-2">{dashboard.productivity.draftChecklists.map((task) => <Link to={task.href} key={task.id} className="block rounded-lg bg-slate-50 p-2 text-xs font-bold text-slate-700">{task.task}</Link>)}{dashboard.productivity.draftChecklists.length === 0 && <EmptyState text="No drafts." />}</div>
        </Panel>
        <Panel title="Evidence Upload Queue" icon={<Upload className="h-4 w-4" />}>
          {dashboard.productivity.uploadQueue.length === 0 ? <EmptyState text="No uploads in progress." /> : null}
        </Panel>
        <Panel title="Shortcuts" icon={<Keyboard className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">{dashboard.productivity.shortcuts.map((shortcut) => <span key={shortcut} className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-black text-slate-700">{shortcut}</span>)}</div>
          {dashboard.productivity.offlineRecovery ? <Link to={dashboard.productivity.offlineRecovery.href} className="mt-3 block rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-700">Recover draft: {dashboard.productivity.offlineRecovery.title}</Link> : null}
        </Panel>
      </section>

      {dashboard.hero.resume ? (
        <Link to={dashboard.hero.resume.href} className="fixed bottom-14 right-5 z-30 rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-xl shadow-blue-600/30 transition hover:bg-blue-700">
          Continue {dashboard.hero.resume.auditArea} <ChevronRight className="inline h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<string | { label: string; value: string }>; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-400">
      <option value="">{label}</option>
      {options.map((option) => typeof option === 'string' ? <option key={option} value={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function Panel({ title, icon, className, children }: { title: string; icon: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn(card, 'p-4', className)}>
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700">{icon}</span>
        <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TaskCard({ task, compact = false }: { key?: React.Key; task: DashboardTask; compact?: boolean }) {
  return (
    <Link to={task.href} className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-slate-950">{task.task}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{task.framework} - {task.auditArea}</p>
        </div>
        <span className={cn('rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1', statusClass(task.status))}>{task.status}</span>
      </div>
      {!compact && <p className="mt-2 text-xs font-semibold text-slate-500">{task.project} - Due {formatDate(task.dueDate)}</p>}
      <div className="mt-3"><ProgressBar value={task.progress} color={task.status === 'Overdue' ? 'bg-rose-600' : 'bg-blue-600'} /></div>
      <p className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-blue-700">{task.action} <ChevronRight className="h-3.5 w-3.5" /></p>
    </Link>
  );
}

function Timeline({ items }: { items: Array<{ id: string; label: string; title: string; project: string; href: string; type: string }> }) {
  if (items.length === 0) return <EmptyState text="No upcoming deadlines." />;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link key={`${item.type}-${item.id}`} to={item.href} className="grid grid-cols-[76px_1fr] gap-3 rounded-lg p-2 hover:bg-slate-50">
          <span className="text-xs font-black text-blue-700">{item.label}</span>
          <span className="border-l border-slate-200 pl-3">
            <span className="block text-sm font-extrabold text-slate-950">{item.title}</span>
            <span className="block text-xs font-semibold text-slate-500">{item.project} - {item.type}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

export default AuditorDashboardPage;
