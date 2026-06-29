import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type ColumnOrderState, type ColumnSizingState, type SortingState } from '@tanstack/react-table';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  FileText,
  Filter,
  Folder,
  Download,
  ExternalLink,
  MoreVertical,
  Paperclip,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useOutsideClick } from '../../hooks/useOutsideClick';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type UserRole = 'ADMIN' | 'AUDITOR';

type ProjectUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  designation?: string | null;
};

type AreaStatus = 'Draft' | 'Not Started' | 'In Progress' | 'Submitted For Review' | 'Approved' | 'Rework Required' | 'Completed' | 'Delayed';
type StageStatus = 'Pending' | 'In Progress' | 'Completed' | 'Delayed' | 'Blocked';

type ProjectAreaAllocation = {
  id: string;
  projectId: string;
  areaName: string;
  assignedUserId?: string | null;
  makerUserId?: string | null;
  reviewerUserId?: string | null;
  checklistType?: 'TABLE_CHECKLIST' | 'QUESTION_CHECKLIST';
  checklistTemplateId?: string | null;
  parentAreaId?: string | null;
  workpaperKind?: 'AREA_GROUP' | 'WORKING_PAPER' | string;
  workpaperType?: string | null;
  status: AreaStatus;
  workStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'Not Started' | 'In Progress' | 'Submitted';
  reviewStatus?: 'NOT_REVIEWED' | 'AWAITING_REVIEW' | 'APPROVED' | 'REWORK_REQUIRED' | 'Not Reviewed' | 'Approved' | 'Rework Required';
  remarks?: string | null;
  dueDate?: string | null;
  checklistSnapshot?: string | ChecklistItem[] | null;
  evidenceRecords?: string | null;
  reviewComments?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  effectiveReviewerId?: string | null;
  checklistRows?: Array<{
    id: string;
    status: string;
    rowData?: Record<string, any> | string;
    comments?: string | null;
    observation?: string | null;
    evidenceLink?: string | null;
    evidence?: Array<{ id: string; fileName: string; filePath: string; fileType?: string | null; uploadedAt?: string }>;
  }>;
  workingPapers?: ProjectAreaAllocation[];
  observations?: ObservationRecord[];
  capas?: CAPARecord[];
  reworkCount?: number;
};

type ChecklistColumnDef = {
  id: string;
  columnName: string;
  columnKey: string;
  columnType: 'text' | 'select' | 'date' | 'number' | 'boolean';
  isRequired?: boolean;
  options?: string[] | null;
};

type ChecklistTemplateDef = {
  id: string;
  name: string;
  type: 'TABLE_CHECKLIST' | 'QUESTION_CHECKLIST';
  evidenceRequirement?: string | null;
  columns: ChecklistColumnDef[];
};

type TableChecklistRow = {
  id: string;
  rowData: Record<string, any>;
  status: 'Pending' | 'Compliant' | 'Non-Compliant' | 'Observation' | 'Not Applicable';
  comments?: string | null;
  observation?: string | null;
  evidenceLink?: string | null;
  evidence?: Array<{ id: string; fileName: string; filePath: string; fileType?: string | null; uploadedAt?: string }>;
};

const tableChecklistColumnHelper = createColumnHelper<TableChecklistRow>();

type GridCellCoord = { rowIndex: number; columnIndex: number };
type GridColumnDef = {
  id: string;
  label: string;
  kind: 'rowData' | 'field';
  field?: 'status' | 'comments' | 'observation' | 'evidenceLink';
  columnKey?: string;
  type?: ChecklistColumnDef['columnType'] | 'status';
  options?: string[] | null;
  width: number;
};

type GridColumnFilter = {
  values: string[];
};
type GridFilterOption = { key: string; label: string; sortLabel: string };

type FilterMenuPosition = { top: number; left: number };

type AreaEvidenceRecord = EvidenceRecord & {
  source?: string;
  rowId?: string;
  evidenceKind?: 'row-file' | 'repository-link' | 'area-evidence';
};

type ObservationRecord = {
  id: string;
  rowId?: string | null;
  isoClause?: string | null;
  department?: string | null;
  controlArea?: string | null;
  description: string;
  evidenceReference?: string | null;
  auditorName?: string | null;
  status: string;
  reviewed?: boolean;
  capa?: CAPARecord | null;
};

type CAPARecord = {
  id: string;
  observationId: string;
  riskRating?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  targetDate?: string | null;
  closureEvidence?: string | null;
  verification?: string | null;
  closureStatus: string;
};

type EvidenceRecord = {
  id: string;
  type: string;
  name: string;
  url?: string;
  size?: number;
  uploadedBy?: string;
  uploadedAt?: string;
  checklistItemId?: string | null;
};

type RepositoryPickerItem = {
  id: string;
  name: string;
  type: 'FOLDER' | 'FILE';
  parentId: string | null;
  path?: string | null;
  mimeType?: string | null;
  size?: number | null;
  source?: string | null;
  externalId?: string | null;
  webViewLink?: string | null;
  webContentLink?: string | null;
  createdAt?: string;
  updatedAt?: string;
  children?: RepositoryPickerItem[];
};

type ChecklistItem = {
  id: string;
  text: string;
  status: 'Pending' | 'Compliant' | 'Non-Compliant' | 'Observation' | 'Not Applicable';
  observation: string;
  evidence: string[];
  auditorRemarks: string;
};

type ProjectStage = {
  id: string;
  projectId: string;
  stageName: string;
  stageOrder: number;
  status: StageStatus;
  assignedTo?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  completedDate?: string | null;
  remarks?: string | null;
  documents?: string | null;
  comments?: string | null;
};

type ProjectMilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'BLOCKED';

type ProjectMilestone = {
  id: string;
  projectId: string;
  sequence: number;
  milestoneKey?: string | null;
  milestoneName: string;
  description?: string | null;
  workspaceType?: string | null;
  workspaceId?: string | null;
  requiredAction?: string | null;
  ownerId?: string | null;
  owner?: ProjectUser | null;
  status: ProjectMilestoneStatus;
  targetDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  progressPercentage: number;
  remarks?: string | null;
  isOverdue?: boolean;
  attachmentCount?: number;
  commentCount?: number;
  repositoryLinks?: Array<{
    id: string;
    repositoryItem?: RepositoryPickerItem | null;
    googleDriveFileId?: string | null;
    source?: string | null;
    fileName?: string | null;
    filePath?: string | null;
    linkedAt: string;
    linkedBy?: { id: string; name: string; email: string } | null;
  }>;
  comments?: Array<{
    id: string;
    comment: string;
    createdAt: string;
    user?: { id: string; name: string; email: string } | null;
  }>;
  histories?: Array<{
    id: string;
    action: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    oldProgress?: number | null;
    newProgress?: number | null;
    performedAt: string;
    performer?: { id: string; name: string; email: string } | null;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

type MilestoneSummary = {
  totalMilestones: number;
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  overdueCount: number;
  blockedCount: number;
  overallProgressPercentage: number;
  currentStage?: string | null;
  currentMilestone?: ProjectMilestone | null;
  nextMilestone?: ProjectMilestone | null;
};

type ProjectQuery = {
  id: string;
  raisedBy?: string | null;
  assignedTo?: string | null;
  queryText: string;
  priority: string;
  status: string;
  dueDate?: string | null;
  response?: string | null;
  createdAt: string;
  closedAt?: string | null;
};

type ProjectBilling = {
  id: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  invoiceAmount: number;
  taxAmount: number;
  totalAmount: number;
  billingStatus: string;
  paymentDueDate?: string | null;
  amountReceived: number;
  paymentDate?: string | null;
  paymentMode?: string | null;
  outstandingAmount: number;
  collectionStatus: string;
};

type ProjectFeedback = {
  id: string;
  feedbackRating?: number | null;
  feedbackComments?: string | null;
  receivedFrom?: string | null;
  feedbackDate?: string | null;
  improvementNotes?: string | null;
};

type ProjectBackup = {
  id: string;
  evidenceBackedUp: boolean;
  reportsBackedUp: boolean;
  clientDocumentsBackedUp: boolean;
  workingPapersBackedUp: boolean;
  finalArchiveCompleted: boolean;
  backupStatus: string;
  backupLocation?: string | null;
  backupCompletedBy?: string | null;
  backupDate?: string | null;
  remarks?: string | null;
};

type ProjectActivity = {
  id: string;
  actor?: string | null;
  action: string;
  actionType?: string | null;
  auditAreaId?: string | null;
  checklistItemId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  performedByName?: string | null;
  message?: string | null;
  timestamp: string;
  details?: string | null;
};

type ApiProject = {
  id: string;
  projectName: string;
  clientName: string;
  frameworks: string;
  natureOfProject?: string | null;
  assignmentPeriodCoverage?: string | null;
  assignmentPeriodStartDate?: string | null;
  assignmentPeriodEndDate?: string | null;
  assignmentExecutionStartDate?: string | null;
  assignmentExecutionEndDate?: string | null;
  reportingDeadline?: string | null;
  auditManagerId?: string | null;
  typeOfIndustry?: string | null;
  geographicalPresence?: string | null;
  listingOnExchanges?: string | null;
  registeredOfficeAddress?: string | null;
  corporateOfficeAddress?: string | null;
  email?: string | null;
  telephone?: string | null;
  cinNo?: string | null;
  pan?: string | null;
  gst?: string | null;
  website?: string | null;
  status: string;
  currentStage?: string | null;
  progressPercentage: number;
  userProjects?: Array<{ projectRole?: string; user?: ProjectUser }>;
  areaAllocations?: ProjectAreaAllocation[];
  stages?: ProjectStage[];
  milestones?: ProjectMilestone[];
  queries?: ProjectQuery[];
  billingRecords?: ProjectBilling[];
  feedbackRecords?: ProjectFeedback[];
  backupRecords?: ProjectBackup[];
  activityLogs?: ProjectActivity[];
  documents?: Array<{ id: string; title: string; type: string; status: string; frameworkMapping: string; updatedAt?: string }>;
  createdAt?: string;
  updatedAt?: string;
};

type OverviewDashboard = {
  project: { id: string; name: string; clientName: string; framework?: string | null; industry?: string | null; status: string; auditManager?: string | null; reviewer?: string | null; startDate?: string | null; endDate?: string | null; reportingDeadline?: string | null; currentPhase?: string | null; currentMilestone?: string | null; overallProgress?: number; progressBreakdown?: { milestones: number; auditAreas: number; reviews: number }; projectManager?: string | null };
  filters: { areas: Array<{ id: string; name: string }>; owners: Array<{ id: string; name: string }>; reviewers: Array<{ id: string; name: string }>; milestones: Array<{ id: string; name: string }>; statuses: string[] };
  health: { status: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL'; score: number; reasons: string[] };
  executiveSummary?: string[];
  healthStrip: Array<{ label: string; state: 'green' | 'amber' | 'red'; value: string }>;
  snapshot: {
    auditAreas: { total: number; completed: number; inReview: number; pending: number };
    milestones: { total: number; completed: number; active: number; pending: number };
    observations: { open: number; closed: number; high: number; critical: number };
    evidenceReview: { pending: number; approved: number; returned: number };
    reviews: { pending: number; returned: number; approved: number };
    capa: { open: number; closed: number; overdue: number };
  };
  kpis: Record<string, number>;
  checklists: { totalRows: number; completedRows: number; pendingRows: number; nonCompliantRows: number; notApplicableRows: number; observationsCreated: number; completionPercent: number; statusDistribution: Array<{ label: string; value: number }> };
  areas: Array<{ areaId: string; name: string; maker?: string | null; submittedBy?: string | null; reviewer?: string | null; progress: number; status: string; dueDate?: string | null; checklistRows: number; completedRows: number; pendingRows: number; observations: number; openObservations: number; evidenceCount: number }>;
  observations: { total: number; open: number; closed: number; rejected: number; returned: number; pendingReview: number; withoutCapa: number; bySeverity: { high: number; medium: number; low: number }; byArea: Array<{ area: string; count: number }> };
  capa: { total: number; open: number; closed: number; overdue: number; pendingVerification: number; closurePercent: number };
  evidenceReview: { pending: number; approved: number; returned: number };
  queries: { total: number; open: number; closed: number; overdue: number; pendingClientResponse: number; pendingAuditorResponse: number };
  milestones: { total: number; completed: number; inProgress: number; pending: number; overdue: number; current?: string | null; next?: string | null; currentDetails?: { owner?: string | null; started?: string | null; dueDate?: string | null } | null; timeline?: Array<{ id: string; name: string; status: string; dueDate?: string | null; isCurrent: boolean; isCompleted: boolean; isReturned?: boolean; isOverdue: boolean }>; rows: Array<{ id: string; milestone: string; owner?: string | null; status: string; dueDate?: string | null; started?: string | null; completed?: string | null; progress: number; pendingActions: string; reviewStatus: string; repository: number }> };
  team: Array<{ userId: string; name: string; role: string; assignedAreas: number; checklistRows: number; completedRows: number; pendingRows: number; pendingReviews: number; pendingMilestones?: number; returnedReviews?: number; pendingTasks?: number; observationsCreated: number; overdueItems: number; currentAssignment?: string; completedWork?: number; pendingWork?: number; reviews?: number; workloadStatus?: string }>;
  recentActivity: Array<{ id: string; type: string; message: string; user: string; createdAt: string }>;
  attentionRequired: Array<{ urgency: 'OVERDUE' | 'BLOCKED' | 'ACTION_REQUIRED' | 'REVIEW_OVERDUE' | 'MISSING_EVIDENCE' | 'MISSING_FIELDS' | 'NORMAL'; severity: 'critical' | 'warning' | 'info'; type: string; message: string; href: string; dueDate?: string | null }>;
  nextAction?: { kind: string; status?: string | null; area?: string | null; milestone?: string | null; reviewer?: string | null; waitingFor?: string | null; submittedBy?: string | null; owner?: string | null; dueDate?: string | null; href: string; buttonLabel: string } | null;
  completionBreakdown?: Array<{ label: string; value: number }>;
  upcomingDeadlines: Array<{ dueDate?: string | null; item: string; owner?: string | null; status: string; href: string }>;
  deadlines: { nextMilestone?: { id: string; name: string; dueDate?: string | null } | null; nextReview?: any; capaDue?: any; billingDue?: any; reportDue?: string | null; lateTasks: number };
  repository: { folders: number; files: number; recentlyAdded: number; storageUsed: number; evidenceLinked: number; recentFiles: Array<{ id: string; name: string; source: string; size?: number | null; createdAt: string }> };
  frameworkCoverage: Array<{ framework: string; definition: number; implementation: number; testing: number; evidence: number; review: number; readiness: number }>;
};

type QueueAreaItem = {
  project: Pick<ApiProject, 'id' | 'projectName' | 'clientName' | 'natureOfProject' | 'frameworks' | 'auditManagerId'>;
  area: ProjectAreaAllocation;
  submittedBy?: { id?: string | null; name?: string | null } | null;
};

type ProjectFormState = {
  clientName: string;
  typeOfIndustry: string;
  geographicalPresence: string;
  listingOnExchanges: string;
  registeredOfficeAddress: string;
  corporateOfficeAddress: string;
  email: string;
  telephone: string;
  cinNo: string;
  pan: string;
  gst: string;
  website: string;
  natureOfProject: string;
  assignmentPeriodCoverage: string;
  assignmentPeriodStartDate: string;
  assignmentPeriodEndDate: string;
  assignmentExecutionStartDate: string;
  assignmentExecutionEndDate: string;
  reportingDeadline: string;
  auditManagerId: string;
  teamMemberIds: string[];
  areaAllocations: Array<{ areaName: string; areaKey?: string; isCustom?: boolean; customAreaName?: string; makerUserId: string; reviewerUserId: string; dueDate: string; remarks: string; checklistType: 'TABLE_CHECKLIST' | 'QUESTION_CHECKLIST' }>;
};

type ChecklistTemplateOption = {
  label: string;
  areaKey: string;
  areaName: string;
  checklistType: string;
  description: string;
  workingPapers: string[];
};

const natureOptions = ['ISO 27001 ISMS', 'SOC 2', 'ITGC', 'VAPT', 'Internal Audit', 'Risk Assessment', 'Compliance Review', 'Custom'];
const areaStatusOptions: AreaStatus[] = ['Draft', 'Not Started', 'In Progress', 'Submitted For Review', 'Approved', 'Rework Required', 'Completed', 'Delayed'];
const stageStatusOptions: StageStatus[] = ['Pending', 'In Progress', 'Completed', 'Delayed', 'Blocked'];

const suggestedAreas: Record<string, string[]> = {
  'ISO 27001 ISMS': [
    'Organization Context',
    'Leadership',
    'Risk Assessment',
    'Asset Management',
    'Access Control',
    'HR Security',
    'Physical Security',
    'Operations Security',
    'Communications Security',
    'Supplier Relationships',
    'Incident Management',
    'Business Continuity',
    'Compliance',
  ],
  'SOC 2': ['Security', 'Availability', 'Confidentiality', 'Processing Integrity', 'Privacy', 'Logical Access', 'Change Management', 'Vendor Management', 'Monitoring'],
  VAPT: ['Network Scope', 'Web Application', 'Mobile Application', 'API Testing', 'Cloud Infrastructure', 'Reporting', 'Retesting'],
};

const emptyForm: ProjectFormState = {
  clientName: '',
  typeOfIndustry: '',
  geographicalPresence: '',
  listingOnExchanges: '',
  registeredOfficeAddress: '',
  corporateOfficeAddress: '',
  email: '',
  telephone: '',
  cinNo: '',
  pan: '',
  gst: '',
  website: '',
  natureOfProject: 'ISO 27001 ISMS',
  assignmentPeriodCoverage: '',
  assignmentPeriodStartDate: '',
  assignmentPeriodEndDate: '',
  assignmentExecutionStartDate: '',
  assignmentExecutionEndDate: '',
  reportingDeadline: '',
  auditManagerId: '',
  teamMemberIds: [],
  areaAllocations: [{ areaName: '', areaKey: '', isCustom: false, customAreaName: '', makerUserId: '', reviewerUserId: '', dueDate: '', remarks: '', checklistType: 'TABLE_CHECKLIST' }],
};

function projectToForm(project: ApiProject): ProjectFormState {
  return {
    clientName: project.clientName || '',
    typeOfIndustry: project.typeOfIndustry || '',
    geographicalPresence: project.geographicalPresence || '',
    listingOnExchanges: project.listingOnExchanges || '',
    registeredOfficeAddress: project.registeredOfficeAddress || '',
    corporateOfficeAddress: project.corporateOfficeAddress || '',
    email: project.email || '',
    telephone: project.telephone || '',
    cinNo: project.cinNo || '',
    pan: project.pan || '',
    gst: project.gst || '',
    website: project.website || '',
    natureOfProject: project.natureOfProject || project.frameworks || 'ISO 27001 ISMS',
    assignmentPeriodCoverage: project.assignmentPeriodCoverage || '',
    assignmentPeriodStartDate: project.assignmentPeriodStartDate?.slice(0, 10) || '',
    assignmentPeriodEndDate: project.assignmentPeriodEndDate?.slice(0, 10) || '',
    assignmentExecutionStartDate: project.assignmentExecutionStartDate?.slice(0, 10) || '',
    assignmentExecutionEndDate: project.assignmentExecutionEndDate?.slice(0, 10) || '',
    reportingDeadline: project.reportingDeadline?.slice(0, 10) || '',
    auditManagerId: project.auditManagerId || '',
    teamMemberIds: (project.userProjects || [])
      .filter((item) => item.projectRole !== 'Audit Manager' && item.user?.id)
      .map((item) => item.user!.id),
    areaAllocations: (project.areaAllocations?.length ? project.areaAllocations : [{ areaName: '', makerUserId: '', reviewerUserId: '', dueDate: '', remarks: '' }]).map((area) => ({
      areaName: area.areaName || '',
      areaKey: '',
      isCustom: area.checklistType === 'QUESTION_CHECKLIST',
      customAreaName: area.areaName || '',
      makerUserId: area.makerUserId || area.assignedUserId || '',
      reviewerUserId: area.reviewerUserId || '',
      dueDate: area.dueDate?.slice(0, 10) || '',
      remarks: area.remarks || '',
      checklistType: area.checklistType || 'QUESTION_CHECKLIST',
    })),
  };
}

function useCurrentUser() {
  const [user, setUser] = useState<ProjectUser | null>(null);
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.id) setUser(data);
      })
      .catch(() => {});
  }, []);
  return user;
}

function PageContainer({ title, subtitle, children, actions, compact = false }: { title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode; compact?: boolean }) {
  return (
    <div className="flex-1 min-h-screen bg-slate-50 flex flex-col lg:ml-0">
      <header className={cn('bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0', compact ? 'h-12 px-4' : 'h-16 px-8')}>
        <div className="min-w-0">
          <h1 className="truncate text-base font-extrabold text-slate-950">{title}</h1>
          {subtitle && <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-400">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <main className={cn('flex-1 overflow-y-auto', compact ? 'p-3' : 'p-8')}>
        <div className={cn('mx-auto', compact ? 'max-w-none space-y-2' : 'max-w-7xl space-y-6')}>{children}</div>
      </main>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB');
}

function formatShortDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function relativeDue(value?: string | null) {
  if (!value) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(value);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `Due in ${days} days`;
}

function userName(users: ProjectUser[], id?: string | null) {
  return users.find((item) => item.id === id)?.name || '-';
}

function parseChecklist(snapshot?: string | ChecklistItem[] | null): ChecklistItem[] {
  if (Array.isArray(snapshot)) return snapshot;
  if (!snapshot) return [];
  try {
    const parsed = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseEvidence(records?: string | null): EvidenceRecord[] {
  if (!records) return [];
  try {
    const parsed = JSON.parse(records);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseRowData(rowData?: Record<string, any> | string | null): Record<string, any> {
  if (!rowData) return {};
  if (typeof rowData !== 'string') return rowData;
  try {
    const parsed = JSON.parse(rowData);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function rowLabel(row: ProjectAreaAllocation['checklistRows'][number], index: number) {
  const data = parseRowData(row.rowData);
  const candidates = [
    data.auditCheck,
    data.areasSpecificCheck,
    data.pointsToCheck,
    data.whatToCheck,
    data.securityElements,
    data.needToCheck,
    data.controlArea,
    data.areas,
    data.process,
  ].filter(Boolean);
  return String(candidates[0] || `Row ${index + 1}`);
}

function areaEvidenceRecords(area?: ProjectAreaAllocation | null): AreaEvidenceRecord[] {
  if (!area) return [];
  const legacy = parseEvidence(area.evidenceRecords).map((record) => ({ ...record, source: 'Area evidence', evidenceKind: 'area-evidence' as const }));
  const rowEvidence = (area.checklistRows || []).flatMap((row, rowIndex) => {
    const label = rowLabel(row, rowIndex);
    const hasRepositoryEvidenceRecord = (row.evidence || []).some((item) => item.fileType === 'repository-link' || item.filePath === row.evidenceLink);
    const uploaded = (row.evidence || []).map((item) => ({
      id: item.id,
      type: item.fileType || 'row-evidence',
      name: item.fileName,
      url: item.filePath,
      uploadedAt: item.uploadedAt,
      checklistItemId: row.id,
      rowId: row.id,
      source: label,
      evidenceKind: item.fileType === 'repository-link' ? 'repository-link' as const : 'row-file' as const,
    }));
    const repositoryLink = row.evidenceLink && !hasRepositoryEvidenceRecord
      ? [{
          id: `${row.id}-repository-link`,
          type: 'repository-link',
          name: row.evidenceLink,
          url: row.evidenceLink,
          checklistItemId: row.id,
          rowId: row.id,
          source: label,
          evidenceKind: 'repository-link' as const,
        }]
      : [];
    return [...uploaded, ...repositoryLink];
  });
  return [...rowEvidence, ...legacy];
}

function areaDisplayStatus(area: ProjectAreaAllocation) {
  if (area.reviewStatus === 'APPROVED' || area.reviewStatus === 'Approved') return 'Completed';
  if (area.reviewStatus === 'REWORK_REQUIRED' || area.reviewStatus === 'Rework Required') return 'Rework Required';
  if (area.reviewStatus === 'AWAITING_REVIEW') return 'Awaiting Review';
  if (area.workStatus === 'SUBMITTED' || area.workStatus === 'Submitted') return 'Awaiting Review';
  if (area.workStatus === 'IN_PROGRESS' || area.workStatus === 'In Progress') return 'In Progress';
  if (area.workStatus === 'NOT_STARTED' || area.workStatus === 'Not Started') return 'Not Started';
  return area.workStatus || area.status || 'Not Started';
}

function checklistProgress(area: ProjectAreaAllocation) {
  if (area.checklistType === 'TABLE_CHECKLIST') {
    const rows = area.workpaperKind === 'AREA_GROUP'
      ? (area.workingPapers || []).flatMap((paper) => paper.checklistRows || [])
      : area.checklistRows || [];
    const completed = rows.filter((row) => row.status && row.status !== 'Pending').length;
    return { total: rows.length, completed, pending: Math.max(rows.length - completed, 0), percent: rows.length ? Math.round((completed / rows.length) * 100) : 0 };
  }
  const items = parseChecklist(area.checklistSnapshot);
  const completed = items.filter((item) => item.status !== 'Pending').length;
  return { total: items.length, completed, pending: Math.max(items.length - completed, 0), percent: items.length ? Math.round((completed / items.length) * 100) : 0 };
}

function statusPill(status?: string) {
  return cn(
    'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
    status === 'Completed' || status === 'COMPLETED' || status === 'Paid' || status === 'Closed'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'Awaiting Review' || status === 'Submitted for Review' || status === 'Awaiting Reviewer' || status === 'Awaiting Client' || status === 'In Progress'
        ? 'bg-blue-100 text-blue-700'
        : status === 'Rework Required' || status === 'Returned'
          ? 'bg-orange-100 text-orange-700'
      : status === 'Delayed' || status === 'Blocked' || status === 'Overdue'
        ? 'bg-rose-100 text-rose-700'
        : status === 'Under Review' || status === 'Invoice Raised' || status === 'Open'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-700',
  );
}

async function apiJson(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

function normalizeUsers(data: any): ProjectUser[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  return [];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = 'h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const textareaClass = 'min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

function ProjectForm({
  form,
  setForm,
  users,
  showAreas = true,
}: {
  form: ProjectFormState;
  setForm: React.Dispatch<React.SetStateAction<ProjectFormState>>;
  users: ProjectUser[];
  showAreas?: boolean;
}) {
  const [teamMemberToAdd, setTeamMemberToAdd] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [areaMakerFilter, setAreaMakerFilter] = useState('');
  const [templateOptions, setTemplateOptions] = useState<ChecklistTemplateOption[]>([]);
  useEffect(() => {
    apiJson('/api/checklist-template-options')
      .then((options) => setTemplateOptions(Array.isArray(options) ? options : []))
      .catch(() => setTemplateOptions([]));
  }, []);
  const change = (field: keyof ProjectFormState, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const changeNature = (value: string) => {
    setForm((prev) => ({
      ...prev,
      natureOfProject: value,
      areaAllocations: prev.areaAllocations.length ? prev.areaAllocations : [{ areaName: '', areaKey: '', isCustom: false, customAreaName: '', makerUserId: '', reviewerUserId: '', dueDate: '', remarks: '', checklistType: 'TABLE_CHECKLIST' }],
    }));
  };

  const updateArea = (index: number, key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      areaAllocations: prev.areaAllocations.map((area, areaIndex) => {
        if (areaIndex !== index) return area;
        return { ...area, [key]: value === '__default__' ? '' : value };
      }),
    }));
  };

  const selectAreaTemplate = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      areaAllocations: prev.areaAllocations.map((area, areaIndex) => {
        if (areaIndex !== index) return area;
        if (value === '__custom__') {
          return { ...area, areaKey: '', isCustom: true, areaName: area.customAreaName || '', checklistType: 'QUESTION_CHECKLIST' };
        }
        const option = templateOptions.find((item) => item.areaKey === value);
        return {
          ...area,
          areaKey: option?.areaKey || '',
          areaName: option?.areaName || '',
          customAreaName: '',
          isCustom: false,
          checklistType: 'TABLE_CHECKLIST',
        };
      }),
    }));
  };

  const addTeamMember = () => {
    if (!teamMemberToAdd) return;
    setForm((prev) => ({
      ...prev,
      teamMemberIds: prev.teamMemberIds.includes(teamMemberToAdd)
        ? prev.teamMemberIds
        : [...prev.teamMemberIds, teamMemberToAdd],
    }));
    setTeamMemberToAdd('');
  };

  const removeTeamMember = (userId: string) => {
    setForm((prev) => ({
      ...prev,
      teamMemberIds: prev.teamMemberIds.filter((id) => id !== userId),
      areaAllocations: prev.areaAllocations.map((area) => (
        area.makerUserId === userId || area.reviewerUserId === userId ? { ...area, makerUserId: area.makerUserId === userId ? '' : area.makerUserId, reviewerUserId: area.reviewerUserId === userId ? '' : area.reviewerUserId } : area
      )),
    }));
  };

  const availableTeamMembers = users.filter((item) => (
    item.id !== form.auditManagerId && !form.teamMemberIds.includes(item.id)
  ));
  const selectedTeamMembers = form.teamMemberIds
    .map((id) => users.find((item) => item.id === id))
    .filter(Boolean) as ProjectUser[];
  const filteredAreaAllocations = form.areaAllocations
    .map((area, index) => ({ area, index }))
    .filter(({ area }) => {
      const makerName = userName(users, area.makerUserId);
      const reviewerName = userName(users, area.reviewerUserId || form.auditManagerId);
      const searchable = [area.areaName, area.areaKey, area.customAreaName, makerName, reviewerName, area.remarks].join(' ').toLowerCase();
      return (!areaSearch.trim() || searchable.includes(areaSearch.trim().toLowerCase()))
        && (!areaMakerFilter || area.makerUserId === areaMakerFilter);
    });

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-extrabold text-slate-950">Client Details</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Client Name"><input required className={inputClass} value={form.clientName} onChange={(e) => change('clientName', e.target.value)} /></Field>
          <Field label="Type of Industry"><input className={inputClass} value={form.typeOfIndustry} onChange={(e) => change('typeOfIndustry', e.target.value)} /></Field>
          <Field label="Geographical Presence"><input className={inputClass} value={form.geographicalPresence} onChange={(e) => change('geographicalPresence', e.target.value)} /></Field>
          <Field label="Listing on Exchanges"><input className={inputClass} value={form.listingOnExchanges} onChange={(e) => change('listingOnExchanges', e.target.value)} /></Field>
          <Field label="Email"><input type="email" className={inputClass} value={form.email} onChange={(e) => change('email', e.target.value)} /></Field>
          <Field label="Telephone / Board Line"><input className={inputClass} value={form.telephone} onChange={(e) => change('telephone', e.target.value)} /></Field>
          <Field label="CIN No."><input className={inputClass} value={form.cinNo} onChange={(e) => change('cinNo', e.target.value)} /></Field>
          <Field label="PAN"><input className={inputClass} value={form.pan} onChange={(e) => change('pan', e.target.value)} /></Field>
          <Field label="GST"><input className={inputClass} value={form.gst} onChange={(e) => change('gst', e.target.value)} /></Field>
          <Field label="Website"><input className={inputClass} value={form.website} onChange={(e) => change('website', e.target.value)} /></Field>
          <Field label="Registered Office Address"><textarea className={textareaClass} value={form.registeredOfficeAddress} onChange={(e) => change('registeredOfficeAddress', e.target.value)} /></Field>
          <Field label="Corporate Office Address"><textarea className={textareaClass} value={form.corporateOfficeAddress} onChange={(e) => change('corporateOfficeAddress', e.target.value)} /></Field>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-extrabold text-slate-950">Assignment Details</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Nature of Assignment">
            <select className={inputClass} value={form.natureOfProject} onChange={(e) => changeNature(e.target.value)}>
              {natureOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Period Coverage Start Date"><input type="date" className={inputClass} value={form.assignmentPeriodStartDate} onChange={(e) => change('assignmentPeriodStartDate', e.target.value)} /></Field>
          <Field label="Period Coverage End Date"><input type="date" className={inputClass} value={form.assignmentPeriodEndDate} onChange={(e) => change('assignmentPeriodEndDate', e.target.value)} /></Field>
          <Field label="Execution Start"><input type="date" className={inputClass} value={form.assignmentExecutionStartDate} onChange={(e) => change('assignmentExecutionStartDate', e.target.value)} /></Field>
          <Field label="Execution End"><input type="date" className={inputClass} value={form.assignmentExecutionEndDate} onChange={(e) => change('assignmentExecutionEndDate', e.target.value)} /></Field>
          <Field label="Reporting Deadline"><input type="date" className={inputClass} value={form.reportingDeadline} onChange={(e) => change('reportingDeadline', e.target.value)} /></Field>
        </div>
        {(form.assignmentPeriodStartDate || form.assignmentPeriodEndDate) && (
          <p className="mt-2 text-xs font-bold text-slate-500">
            Period Coverage: {formatDate(form.assignmentPeriodStartDate)} to {formatDate(form.assignmentPeriodEndDate)}
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-extrabold text-slate-950">Team Details</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Audit Manager">
            <select
              className={inputClass}
              value={form.auditManagerId}
              onChange={(e) => {
                change('auditManagerId', e.target.value);
                removeTeamMember(e.target.value);
              }}
            >
              <option value="">Select manager</option>
              {users.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.role}</option>)}
            </select>
          </Field>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Team Members</span>
            <div className="mt-1 flex gap-2">
              <select className={inputClass} value={teamMemberToAdd} onChange={(event) => setTeamMemberToAdd(event.target.value)}>
                <option value="">Select member</option>
                {availableTeamMembers.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.role}</option>)}
              </select>
              <button
                type="button"
                onClick={addTeamMember}
                disabled={!teamMemberToAdd}
                className="h-10 shrink-0 rounded bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {selectedTeamMembers.length === 0 && (
                <p className="rounded border border-dashed border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">No team members selected.</p>
              )}
              {selectedTeamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.role}{member.designation ? ` - ${member.designation}` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTeamMember(member.id)}
                    className="rounded bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {showAreas && <section>
        <h3 className="mb-3 text-sm font-extrabold text-slate-950">Area Allocation</h3>
        <div className="grid grid-cols-1 gap-3 rounded border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_220px_150px]">
          <Field label="Search">
            <input className={inputClass} value={areaSearch} onChange={(event) => setAreaSearch(event.target.value)} placeholder="Area, maker, reviewer..." />
          </Field>
          <Field label="Maker">
            <select className={inputClass} value={areaMakerFilter} onChange={(event) => setAreaMakerFilter(event.target.value)}>
              <option value="">All Makers</option>
              {users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setAreaSearch('');
                setAreaMakerFilter('');
              }}
              className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Area Name</th>
                <th className="px-3 py-2">Maker</th>
                <th className="px-3 py-2">Reviewer</th>
                <th className="px-3 py-2">Checklist Type</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAreaAllocations.map(({ area, index }) => {
                const reviewerValue = area.reviewerUserId || '__default__';
                const defaultReviewerName = userName(users, form.auditManagerId);
                const invalidReviewer = !!area.makerUserId && (area.reviewerUserId || form.auditManagerId) === area.makerUserId;
                return (
                  <React.Fragment key={`${area.areaName}-${index}`}>
                    <tr>
                      <td className="px-3 py-2">
                        <select className={inputClass} value={area.isCustom ? '__custom__' : area.areaKey || ''} onChange={(e) => selectAreaTemplate(index, e.target.value)}>
                          <option value="">Select checklist</option>
                          {templateOptions.map((option) => <option key={option.areaKey} value={option.areaKey}>{option.label}</option>)}
                          <option value="__custom__">Custom</option>
                        </select>
                        {!area.isCustom && area.areaKey && (
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">
                            {(templateOptions.find((option) => option.areaKey === area.areaKey)?.workingPapers || []).join(', ')}
                          </p>
                        )}
                        {area.isCustom && (
                          <input className={cn(inputClass, 'mt-2')} value={area.customAreaName || area.areaName} onChange={(e) => {
                            updateArea(index, 'customAreaName', e.target.value);
                            updateArea(index, 'areaName', e.target.value);
                          }} placeholder="Custom area name" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select className={inputClass} value={area.makerUserId} onChange={(e) => updateArea(index, 'makerUserId', e.target.value)}>
                          <option value="">Select maker</option>
                          {users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select className={inputClass} value={reviewerValue} onChange={(e) => updateArea(index, 'reviewerUserId', e.target.value)}>
                          <option value="__default__">Default: {defaultReviewerName}</option>
                          {users.filter((item) => item.id !== area.makerUserId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select className={inputClass} value={area.checklistType} onChange={(e) => updateArea(index, 'checklistType', e.target.value)} disabled={!area.isCustom}>
                          <option value="TABLE_CHECKLIST">Table Checklist</option>
                          <option value="QUESTION_CHECKLIST">Question Checklist</option>
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="date" className={inputClass} value={area.dueDate} onChange={(e) => updateArea(index, 'dueDate', e.target.value)} /></td>
                      <td className="px-3 py-2"><input className={inputClass} value={area.remarks} onChange={(e) => updateArea(index, 'remarks', e.target.value)} /></td>
                    </tr>
                    {invalidReviewer && (
                      <tr>
                        <td colSpan={6} className="bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">Maker and reviewer cannot be the same person. Please assign a different reviewer.</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredAreaAllocations.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center font-semibold text-slate-500">No areas match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => setForm((prev) => ({ ...prev, areaAllocations: [...prev.areaAllocations, { areaName: '', areaKey: '', isCustom: false, customAreaName: '', makerUserId: '', reviewerUserId: '', dueDate: '', remarks: '', checklistType: 'TABLE_CHECKLIST' }] }))}
          className="mt-3 rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
        >
          Add Area
        </button>
      </section>}
    </div>
  );
}

function ProjectEditorModal({
  users,
  project,
  onClose,
  onSaved,
}: {
  users: ProjectUser[];
  project?: ApiProject;
  onClose: () => void;
  onSaved: (project: ApiProject) => void;
}) {
  const [form, setForm] = useState<ProjectFormState>(() => project ? projectToForm(project) : emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const isEdit = !!project;
  useOutsideClick(modalRef, onClose);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!form.auditManagerId) {
        throw new Error('Audit Manager is required for project creation.');
      }
      const saved = await apiJson(isEdit ? `/api/projects/${project!.id}` : '/api/projects', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, areaAllocations: isEdit ? form.areaAllocations : [] }),
      });
      onSaved(saved);
    } catch (err: any) {
      setError(err.message || 'Unable to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 p-4">
      <div ref={modalRef} className="mx-auto flex max-h-[92vh] max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">{isEdit ? 'Edit Project' : 'New Project'}</h2>
            <p className="text-xs font-semibold text-slate-500">Client details, audit manager, team members, and assignment timeline.</p>
          </div>
          <button onClick={onClose} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6">
          {error && <div className="mb-4 rounded border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>}
          <ProjectForm form={form} setForm={setForm} users={users} showAreas={false} />
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">Cancel</button>
            <button disabled={saving} className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ApiProject }) {
  const manager = project.userProjects?.find((item) => item.projectRole === 'Audit Manager')?.user?.name || 'Unassigned';
  return (
    <Link to={`/projects/${project.id}`} className="block">
      <motion.div whileHover={{ y: -2 }} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-200 hover:shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold text-slate-950">{project.clientName}</h2>
            <p className="mt-1 text-xs font-bold text-slate-600">{project.natureOfProject || project.frameworks}</p>
            <p className="text-xs text-slate-500">Manager: {manager}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4 lg:w-[620px]">
            <div><p className="font-bold text-slate-900">Current Stage</p><p className="text-slate-600">{project.currentStage || '-'}</p></div>
            <div><p className="font-bold text-slate-900">Period</p><p className="text-slate-600">{project.assignmentPeriodStartDate || project.assignmentPeriodEndDate ? `${formatDate(project.assignmentPeriodStartDate)} to ${formatDate(project.assignmentPeriodEndDate)}` : project.assignmentPeriodCoverage || '-'}</p></div>
            <div><p className="font-bold text-slate-900">Deadline</p><p className="text-slate-600">{formatDate(project.reportingDeadline)}</p></div>
            <div>
              <p className="font-bold text-slate-900">Progress</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${project.progressPercentage || 0}%` }} /></div>
                <span className="font-bold text-slate-700">{project.progressPercentage || 0}%</span>
              </div>
            </div>
          </div>
          <span className={statusPill(project.status)}>{project.status}</span>
        </div>
      </motion.div>
    </Link>
  );
}

export function ProjectsPage() {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [auditFilter, setAuditFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [projectData, userData] = await Promise.all([
        apiJson('/api/projects'),
        apiJson('/api/users'),
      ]);
      setProjects(Array.isArray(projectData) ? projectData : []);
      setUsers(normalizeUsers(userData));
    } catch (err: any) {
      setError(err.message || 'Unable to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = projects.filter((project) => {
    const haystack = [project.clientName, project.projectName, project.natureOfProject, project.currentStage].join(' ').toLowerCase();
    return haystack.includes(search.toLowerCase())
      && (statusFilter === 'All' || project.status === statusFilter)
      && (auditFilter === 'All' || (project.natureOfProject || project.frameworks) === auditFilter);
  });

  return (
    <PageContainer
      title="Projects"
      subtitle="Audit assignment portfolio and lifecycle tracking"
      actions={
        <div className="flex items-center gap-2">
          <button onClick={load} className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><RefreshCw className="inline h-3.5 w-3.5" /> Refresh</button>
          {currentUser?.role === 'ADMIN' && (
            <button onClick={() => setShowCreate(true)} className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"><Plus className="inline h-3.5 w-3.5" /> New Assignment</button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">Project Lifecycle Module</h1>
          <p className="mt-1 text-sm text-slate-500">Create assignments, allocate areas, control lifecycle stages, and track commercial closure.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:w-[720px]">
          <Field label="Search"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={cn(inputClass, 'pl-9')} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Client, assignment, stage" /></div></Field>
          <Field label="Status"><select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All</option><option>ACTIVE</option><option>COMPLETED</option><option>ARCHIVED</option></select></Field>
          <Field label="Nature"><select className={inputClass} value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)}><option>All</option>{natureOptions.map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div>
      </div>

      {error && <div className="rounded border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
      {loading && <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading projects...</div>}
      {!loading && filtered.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">No assignments found.</div>}
      <div className="space-y-3">
        {filtered.map((project) => (
          <React.Fragment key={project.id}>
            <ProjectCard project={project} />
          </React.Fragment>
        ))}
      </div>

      {showCreate && (
        <ProjectEditorModal
          users={users}
          onClose={() => setShowCreate(false)}
          onSaved={(project) => {
            setShowCreate(false);
            navigate(`/projects/${project.id}`);
          }}
        />
      )}
    </PageContainer>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function MiniBar({ value, tone = 'bg-blue-600' }: { value: number; tone?: string }) {
  return <div className="h-1.5 rounded-full bg-slate-200"><div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} /></div>;
}

function OverviewKpi({ label, value, tone, to }: { label: string; value: number | string; tone?: string; to?: string }) {
  const content = (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-300">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <span className={cn('h-2 w-2 rounded-full', tone || 'bg-blue-500')} />
      </div>
      <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
      <MiniBar value={typeof value === 'number' ? value : 0} tone={tone || 'bg-blue-600'} />
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function HealthDot({ state }: { state: 'green' | 'amber' | 'red' }) {
  return <span className={cn('h-2.5 w-2.5 rounded-full', state === 'green' ? 'bg-emerald-500' : state === 'red' ? 'bg-rose-600' : 'bg-amber-500')} />;
}

function SnapshotCard({ title, primary, lines, to }: { title: string; primary: string | number; lines: string[]; to?: string }) {
  const body = (
    <div className="h-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-950">{primary}</p>
      <div className="mt-3 space-y-1 text-xs font-semibold text-slate-600">
        {lines.map((line) => <p key={line}>{line}</p>)}
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function ProjectOverviewTab({ project }: { project: ApiProject; users: ProjectUser[] }) {
  const [dashboard, setDashboard] = useState<OverviewDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiJson(`/api/projects/${project.id}/overview`);
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || 'Unable to load overview dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard().catch(console.error);
  }, [project.id]);

  if (loading && !dashboard) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading executive audit cockpit...</div>;
  if (!dashboard) return <div className="rounded border border-rose-100 bg-rose-50 p-6 text-sm font-semibold text-rose-700">{error || 'Overview dashboard unavailable.'}</div>;

  const progress = dashboard.project.overallProgress || dashboard.kpis.overallProgress || 0;
  const timeline = dashboard.milestones.timeline || [];
  const healthState = dashboard.health.status === 'CRITICAL' ? 'red' : dashboard.health.status === 'NEEDS_ATTENTION' ? 'amber' : 'green';
  const healthLabel = dashboard.health.status === 'CRITICAL' ? 'Critical' : dashboard.health.status === 'NEEDS_ATTENTION' ? 'Needs Attention' : 'Healthy';
  const showObservations = dashboard.observations.total > 0;
  const showReviews = dashboard.snapshot.reviews.pending + dashboard.snapshot.reviews.returned + dashboard.snapshot.reviews.approved > 0;
  const openTimeline = () => window.dispatchEvent(new CustomEvent('auditie-open-tab', { detail: 'Timeline' }));

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{error}</div>}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Executive Audit Cockpit</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-950">{dashboard.project.name}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600 md:grid-cols-4">
              <span>Framework<br /><b className="text-slate-950">{dashboard.project.framework || '-'}</b></span>
              <span>Client<br /><b className="text-slate-950">{dashboard.project.clientName}</b></span>
              <span>Current Phase<br /><b className="text-slate-950">{dashboard.project.currentMilestone || dashboard.project.currentPhase || '-'}</b></span>
              <span>Audit Manager<br /><b className="text-slate-950">{dashboard.project.auditManager || '-'}</b></span>
              <span>Execution<br /><b className="text-slate-950">{formatShortDate(dashboard.project.startDate)} - {formatShortDate(dashboard.project.endDate)}</b></span>
              <span>Reporting Deadline<br /><b className="text-slate-950">{formatShortDate(dashboard.project.reportingDeadline)}</b></span>
              <span>Project Status<br /><b className="text-slate-950">{dashboard.project.status}</b></span>
            </div>
          </div>
          <div className="min-w-[220px] rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600"><span>Overall Project Progress</span><span>{dashboard.milestones.completed}/{dashboard.milestones.total} milestones</span></div>
            <p className="mt-2 text-3xl font-extrabold text-slate-950">{progress}%</p>
            <div className="mt-2 h-3 rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, progress || 0))}%` }} /></div>
            <p className="mt-2 text-[10px] font-semibold text-slate-500">Milestones {dashboard.project.progressBreakdown?.milestones ?? 0}% / Areas {dashboard.project.progressBreakdown?.auditAreas ?? 0}% / Reviews {dashboard.project.progressBreakdown?.reviews ?? 0}%</p>
          </div>
        </div>
      </div>

      {Boolean(dashboard.executiveSummary?.length) && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Executive Summary</p>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm font-semibold text-slate-700 md:grid-cols-2">
            {dashboard.executiveSummary?.map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <button type="button" onClick={openTimeline} className="h-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Milestone</p>
          <p className="mt-2 text-xl font-extrabold text-slate-950">{dashboard.milestones.current || '-'}</p>
          <div className="mt-3 space-y-1 text-xs font-semibold text-slate-600">
            <p>Progress: {dashboard.milestones.completed} of {dashboard.milestones.total} completed</p>
            <p>Next: {dashboard.milestones.next || '-'}</p>
            <p>Owner: {dashboard.milestones.currentDetails?.owner || '-'}</p>
            <p>Started: {formatShortDate(dashboard.milestones.currentDetails?.started)}</p>
            <p>Due: {formatShortDate(dashboard.milestones.currentDetails?.dueDate)}</p>
          </div>
        </button>
        <div className="h-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><HealthDot state={healthState} /><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Project Health</p></div>
          <p className="mt-2 text-xl font-extrabold text-slate-950">{healthLabel}</p>
          <div className="mt-3 space-y-1 text-xs font-semibold text-slate-600">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reason</p>
            {dashboard.health.reasons.slice(0, 2).map((reason) => <p key={reason}>{reason}</p>)}
          </div>
        </div>
        <SnapshotCard title="Audit Areas" primary={`${dashboard.snapshot.auditAreas.total} Areas`} to={`/projects/${project.id}?tab=Assignments`} lines={[`${dashboard.snapshot.auditAreas.completed} Completed`, `${dashboard.snapshot.auditAreas.inReview} In Review`, `${dashboard.snapshot.auditAreas.pending} Pending`]} />
        {showReviews && <SnapshotCard title="Reviews" primary={`${dashboard.snapshot.reviews.pending} Pending`} to={`/projects/${project.id}?tab=Assignments`} lines={[`${dashboard.snapshot.reviews.returned} Returned`, `${dashboard.snapshot.reviews.approved} Approved`]} />}
        {showObservations && <SnapshotCard title="Observations" primary={`${dashboard.observations.total} Raised`} to={`/projects/${project.id}?tab=Observations`} lines={[`${dashboard.observations.pendingReview} Pending Review`, `${dashboard.observations.closed} Closed`]} />}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between"><h3 className="font-extrabold text-slate-950">Project Timeline</h3><button onClick={() => window.dispatchEvent(new CustomEvent('auditie-open-tab', { detail: 'Timeline' }))} className="text-xs font-bold text-blue-600">Open Timeline</button></div>
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />Completed</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-blue-500" />Active</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-slate-300" />Pending</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-orange-500" />Returned</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-600" />Overdue</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <div className="flex min-w-max items-start gap-2">
            {timeline.length === 0 && <p className="text-sm font-semibold text-slate-500">No milestones generated yet.</p>}
            {timeline.map((item, index) => {
              const nodeTone = item.isOverdue ? 'bg-rose-600 text-white' : item.isReturned ? 'bg-orange-500 text-white' : item.isCompleted ? 'bg-emerald-600 text-white' : item.isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600';
              const lineTone = item.isOverdue ? 'bg-rose-300' : item.isReturned ? 'bg-orange-300' : item.isCompleted ? 'bg-emerald-300' : item.isCurrent ? 'bg-blue-300' : 'bg-slate-200';
              return (
                <Link key={item.id} to={`/projects/${project.id}/milestones/${item.id}`} title={`${item.name} - ${item.status} - ${formatDate(item.dueDate)}`} className="group flex min-w-[140px] flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <span className={cn('h-1 flex-1 rounded', index === 0 ? 'bg-transparent' : lineTone)} />
                    <span className={cn('mx-2 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-extrabold ring-4 ring-white', nodeTone)}>{index + 1}</span>
                    <span className={cn('h-1 flex-1 rounded', index === timeline.length - 1 ? 'bg-transparent' : lineTone)} />
                  </div>
                  <p className="mt-1 flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-950 group-hover:text-blue-700"><i className={cn('h-1.5 w-1.5 rounded-full', item.isOverdue ? 'bg-rose-600' : item.isReturned ? 'bg-orange-500' : item.isCompleted ? 'bg-emerald-500' : item.isCurrent ? 'bg-blue-500' : 'bg-slate-300')} />{item.name}</p>
                  <p className="text-[10px] font-semibold text-slate-500">{formatDate(item.dueDate)}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {Boolean(dashboard.completionBreakdown?.length) && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-extrabold text-slate-950">Project Completion Breakdown</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.completionBreakdown?.map((item) => (
              <div key={item.label} className="rounded border border-slate-100 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600"><span>{item.label}</span><span>{item.value}%</span></div>
                <MiniBar value={item.value} tone={item.value >= 100 ? 'bg-emerald-600' : item.value > 0 ? 'bg-blue-600' : 'bg-slate-300'} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4"><h3 className="font-extrabold text-slate-950">Audit Area Summary</h3></div>
        <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2 xl:grid-cols-3">
          {dashboard.areas.length === 0 && <p className="text-sm font-semibold text-slate-500">No audit areas assigned yet.</p>}
          {dashboard.areas.map((area) => (
            <Link key={area.areaId} to={`/projects/${project.id}/areas/${area.areaId}`} className="rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <p className="font-extrabold text-slate-950">{area.name}</p>
                <span className={statusPill(area.status)}>{area.status}</span>
              </div>
              <div className="mt-3"><MiniBar value={area.progress} tone="bg-blue-600" /></div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
                <span>Progress<br /><b className="text-slate-950">{area.progress}%</b></span>
                <span>Controls<br /><b className="text-slate-950">{area.completedRows} / {area.checklistRows}</b></span>
                <span>Pending<br /><b className="text-slate-950">{area.pendingRows}</b></span>
                <span>Reviewer<br /><b className="text-slate-950">{area.reviewer || '-'}</b></span>
                <span>Due<br /><b className="text-slate-950">{formatShortDate(area.dueDate)}</b></span>
                <span>Observations<br /><b className="text-slate-950">{area.openObservations}</b></span>
              </div>
              <div className="mt-3 text-right text-xs font-bold text-blue-600">Open Area -&gt;</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-extrabold text-slate-950">Next Action</h3>
            {dashboard.nextAction ? (
              <div className="mt-3 rounded border border-slate-100 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{dashboard.nextAction.status || 'Next Action'}</p>
                <p className="mt-1 text-lg font-extrabold text-slate-950">{dashboard.nextAction.kind}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
                  {dashboard.nextAction.area && <span>Area<br /><b>{dashboard.nextAction.area}</b></span>}
                  {dashboard.nextAction.milestone && <span>Milestone<br /><b>{dashboard.nextAction.milestone}</b></span>}
                  <span>Waiting For<br /><b>{dashboard.nextAction.waitingFor || dashboard.nextAction.reviewer || dashboard.nextAction.owner || '-'}</b></span>
                  <span>Submitted By<br /><b>{dashboard.nextAction.submittedBy || '-'}</b></span>
                  <span>Due<br /><b>{formatDate(dashboard.nextAction.dueDate)}</b></span>
                </div>
                {dashboard.nextAction.buttonLabel === 'Open Timeline' ? (
                  <button type="button" onClick={openTimeline} className="mt-4 rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">{dashboard.nextAction.buttonLabel}</button>
                ) : (
                  <Link to={dashboard.nextAction.href} className="mt-4 inline-flex rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">{dashboard.nextAction.buttonLabel}</Link>
                )}
              </div>
            ) : (
              <div className="mt-3 rounded border border-dashed border-slate-200 p-4 text-center">
                <p className="text-sm font-extrabold text-slate-700">Everything looks good.</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">No urgent actions require attention.</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-extrabold text-slate-950">Team Workload</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-500"><tr><th className="py-2">Name</th><th>Current Assignment</th><th>Pending Reviews</th><th>Returned Reviews</th><th>Overdue Items</th><th>Current Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.team.map((member) => (
                    <tr key={member.userId}>
                      <td className="py-3 font-bold text-slate-950">{member.name}</td>
                      <td className="font-semibold text-slate-700">{member.currentAssignment || '-'}</td>
                      <td>{member.pendingReviews}</td>
                      <td>{member.returnedReviews ?? 0}</td>
                      <td>{member.overdueItems}</td>
                      <td><span className={cn('rounded-full px-2 py-1 text-[10px] font-bold uppercase', member.workloadStatus === 'Overloaded' ? 'bg-orange-100 text-orange-700' : member.workloadStatus === 'Busy' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}>{member.workloadStatus || 'Available'}</span></td>
                    </tr>
                  ))}
                  {dashboard.team.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-sm font-semibold text-slate-500">No assigned workload yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-extrabold text-slate-950">Upcoming Deadlines</h3>
            <div className="mt-3 space-y-2">
              {dashboard.upcomingDeadlines.length === 0 && <p className="text-sm font-semibold text-slate-500">No upcoming deadlines.</p>}
              {dashboard.upcomingDeadlines.map((item, index) => (
                <Link key={`${item.item}-${index}`} to={item.href} className="block rounded border border-slate-100 p-3 hover:border-blue-300">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-slate-950">{item.item}</p>
                    <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold uppercase', relativeDue(item.dueDate) === 'Overdue' ? 'bg-rose-100 text-rose-700' : relativeDue(item.dueDate) === 'Today' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')}>{relativeDue(item.dueDate)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
                    <span>Due<br /><b className="text-slate-700">{formatDate(item.dueDate)}</b></span>
                    <span>Reviewer<br /><b className="text-slate-700">{item.owner || '-'}</b></span>
                    <span>Status<br /><b className="text-slate-700">{item.status}</b></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TeamAreaAllocationTab({ project, users, reload }: { project: ApiProject; users: ProjectUser[]; reload: () => Promise<void> }) {
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [makerFilter, setMakerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignmentNotice, setAssignmentNotice] = useState('');
  const [templateOptions, setTemplateOptions] = useState<ChecklistTemplateOption[]>([]);

  useEffect(() => {
    apiJson('/api/checklist-template-options')
      .then((options) => setTemplateOptions(Array.isArray(options) ? options : []))
      .catch(() => setTemplateOptions([]));
  }, []);

  const updateArea = async (area: ProjectAreaAllocation, patch: Partial<ProjectAreaAllocation>) => {
    setAssignmentNotice('');
    const nextMakerId = patch.makerUserId ?? patch.assignedUserId ?? area.makerUserId ?? area.assignedUserId ?? '';
    const nextReviewerOverrideId = patch.reviewerUserId === '__default__' ? null : (patch.reviewerUserId ?? area.reviewerUserId ?? null);
    const effectiveReviewerId = nextReviewerOverrideId || project.auditManagerId || '';
    if (nextMakerId && effectiveReviewerId && nextMakerId === effectiveReviewerId) {
      setAssignmentNotice('Maker and reviewer cannot be the same person. Please assign a different reviewer.');
      return;
    }
    try {
      const body = { ...patch } as any;
      if (patch.reviewerUserId !== undefined) body.reviewerUserId = nextReviewerOverrideId;
      await apiJson(`/api/project-areas/${area.id}`, { method: 'PUT', body: JSON.stringify(body) });
      setAssignmentNotice(patch.reviewerUserId !== undefined ? 'Reviewer updated.' : 'Assignment updated.');
      await reload();
    } catch (err: any) {
      setAssignmentNotice(err.message || 'Unable to update assignment.');
    }
  };

  const addArea = async () => {
    await apiJson(`/api/projects/${project.id}/areas`, { method: 'POST', body: JSON.stringify({ areaName: 'New Audit Area' }) });
    await reload();
  };

  const deleteArea = async (area: ProjectAreaAllocation) => {
    if (!confirm(`Delete area "${area.areaName || 'Untitled area'}"?`)) return;
    await apiJson(`/api/project-areas/${area.id}`, { method: 'DELETE' });
    await reload();
  };

  const assignmentRows = (project.areaAllocations || []).filter((area) => {
    const makerName = userName(users, area.makerUserId || area.assignedUserId);
    const reviewerName = userName(users, area.reviewerUserId || project.auditManagerId);
    const status = areaDisplayStatus(area);
    const searchable = [area.areaName, makerName, reviewerName, status].join(' ').toLowerCase();
    return (!assignmentSearch.trim() || searchable.includes(assignmentSearch.trim().toLowerCase()))
      && (!makerFilter || (area.makerUserId || area.assignedUserId) === makerFilter)
      && (!statusFilter || status === statusFilter);
  });

  const assignmentStatusOptions = Array.from(new Set((project.areaAllocations || []).map((area) => areaDisplayStatus(area)))).sort();
  const assignmentAreaOptions = [
    ...templateOptions,
    ...(project.areaAllocations || [])
      .filter((area) => area.areaName && !templateOptions.some((option) => option.areaName === area.areaName))
      .map((area) => ({
        label: area.areaName,
        areaKey: `existing-${area.id}`,
        areaName: area.areaName,
        checklistType: area.checklistType || 'TABLE_CHECKLIST',
        description: 'Existing project area',
        workingPapers: area.workingPapers?.map((paper) => paper.areaName) || [],
      })),
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="font-extrabold text-slate-950">Assignments</h3>
          <p className="text-xs font-semibold text-slate-500">Manage area ownership. Audit execution opens in a focused workspace.</p>
        </div>
        <button onClick={addArea} className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">Add Area</button>
      </div>
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        {assignmentNotice && (
          <div className={cn("mb-3 rounded border px-3 py-2 text-xs font-bold", assignmentNotice.includes('cannot') || assignmentNotice.includes('Unable') ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700')}>
            {assignmentNotice}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_220px_160px]">
          <Field label="Search">
            <input className={inputClass} value={assignmentSearch} onChange={(event) => setAssignmentSearch(event.target.value)} placeholder="Area, maker, reviewer..." />
          </Field>
          <Field label="Maker">
            <select className={inputClass} value={makerFilter} onChange={(event) => setMakerFilter(event.target.value)}>
              <option value="">All Makers</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All Statuses</option>
              {assignmentStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setAssignmentSearch('');
                setMakerFilter('');
                setStatusFilter('');
              }}
              className="h-10 w-full rounded border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr><th className="px-4 py-3">Area</th><th className="px-4 py-3">Maker</th><th className="px-4 py-3">Reviewer</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Due Date</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Open</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assignmentRows.map((area) => {
              const progress = checklistProgress(area);
              const reviewerValue = area.reviewerUserId || '__default__';
              return (
                <tr key={area.id}>
                  <td className="px-4 py-3">
                    <select
                      className={inputClass}
                      value={area.areaName || ''}
                      onChange={(e) => {
                        const option = assignmentAreaOptions.find((item) => item.areaName === e.target.value);
                        updateArea(area, { areaName: e.target.value, checklistType: option ? 'TABLE_CHECKLIST' : area.checklistType, regenerateWorkingPapers: true } as any);
                      }}
                    >
                      <option value="">Select area</option>
                      {assignmentAreaOptions.map((option) => <option key={`${option.areaKey}-${option.areaName}`} value={option.areaName}>{option.label}</option>)}
                    </select>
                    {!!assignmentAreaOptions.find((option) => option.areaName === area.areaName)?.workingPapers?.length && (
                      <p className="mt-1 max-w-40 truncate text-[10px] font-semibold text-slate-500">
                        {assignmentAreaOptions.find((option) => option.areaName === area.areaName)?.workingPapers.join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3"><select className={inputClass} value={area.makerUserId || area.assignedUserId || ''} onChange={(e) => updateArea(area, { makerUserId: e.target.value, assignedUserId: e.target.value })}><option value="">Unassigned</option>{users.filter((user) => user.id !== area.reviewerUserId).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></td>
                  <td className="px-4 py-3">
                    <select className={inputClass} value={reviewerValue} onChange={(e) => updateArea(area, { reviewerUserId: e.target.value })}>
                      <option value="__default__">Default: {userName(users, project.auditManagerId)}</option>
                      {users.filter((user) => user.id !== (area.makerUserId || area.assignedUserId)).map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className={inputClass} value={area.checklistType || 'QUESTION_CHECKLIST'} onChange={(e) => updateArea(area, { checklistType: e.target.value as ProjectAreaAllocation['checklistType'] })}>
                      <option value="TABLE_CHECKLIST">Table</option>
                      <option value="QUESTION_CHECKLIST">Question</option>
                    </select>
                  </td>
                  <td className="px-4 py-3"><input type="date" className={inputClass} value={area.dueDate?.slice(0, 10) || ''} onChange={(e) => updateArea(area, { dueDate: e.target.value as any })} /></td>
                  <td className="px-4 py-3"><div className="h-2 w-24 rounded bg-slate-200"><div className="h-full rounded bg-blue-600" style={{ width: `${progress.percent}%` }} /></div><p className="mt-1 text-[10px] font-bold text-slate-500">{progress.completed}/{progress.total}</p></td>
                  <td className="px-4 py-3"><span className={statusPill(areaDisplayStatus(area))}>{areaDisplayStatus(area)}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/projects/${project.id}/areas/${area.id}`} className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white">Open</Link>
                      <button onClick={() => deleteArea(area)} className="rounded bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {assignmentRows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center font-semibold text-slate-500">No assignments match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MilestoneStatusIcon({ milestone }: { milestone: ProjectMilestone }) {
  if (milestone.status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (milestone.status === 'BLOCKED') return <Ban className="h-4 w-4 text-orange-600" />;
  if (milestone.isOverdue) return <AlertTriangle className="h-4 w-4 text-rose-600" />;
  if (milestone.status === 'IN_PROGRESS') return <Play className="h-4 w-4 text-blue-600" />;
  return <Circle className="h-4 w-4 text-slate-400" />;
}

function ReviewProgramTimelineTab({ project, users, reload }: { project: ApiProject; users: ProjectUser[]; reload: () => Promise<void> }) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [summary, setSummary] = useState<MilestoneSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [repositoryPicker, setRepositoryPicker] = useState<{ milestone: ProjectMilestone; mode: 'repository' | 'drive' } | null>(null);
  const [repositoryTree, setRepositoryTree] = useState<RepositoryPickerItem[]>([]);
  const [repositoryFolderId, setRepositoryFolderId] = useState<string | null>(null);
  const [repositorySearch, setRepositorySearch] = useState('');
  const [selectedRepositoryIds, setSelectedRepositoryIds] = useState<string[]>([]);
  const [repositoryLoading, setRepositoryLoading] = useState(false);
  const [repositoryError, setRepositoryError] = useState('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFolderStack, setDriveFolderStack] = useState<Array<{ id: string; name: string }>>([]);

  const loadMilestones = async () => {
    setLoading(true);
    setError('');
    try {
      const [milestoneData, summaryData] = await Promise.all([
        apiJson(`/api/projects/${project.id}/milestones`),
        apiJson(`/api/projects/${project.id}/milestone-summary`),
      ]);
      setMilestones(milestoneData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || 'Unable to load review milestones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMilestones().catch(console.error);
  }, [project.id]);

  const refreshAfterAction = async () => {
    await loadMilestones();
    await reload();
  };

  const updateMilestone = async (milestone: ProjectMilestone, patch: Partial<ProjectMilestone>) => {
    await apiJson(`/api/project-milestones/${milestone.id}`, { method: 'PUT', body: JSON.stringify(patch) });
    await refreshAfterAction();
  };

  const runAction = async (milestone: ProjectMilestone, action: 'start' | 'complete' | 'reopen' | 'pause' | 'resume') => {
    await apiJson(`/api/project-milestones/${milestone.id}/${action}`, { method: 'POST', body: JSON.stringify({}) });
    setOpenMenuId(null);
    await refreshAfterAction();
  };

  const changeOwner = async (milestone: ProjectMilestone) => {
    const ownerName = prompt('Owner name or email', milestone.owner?.name || '');
    if (ownerName === null) return;
    const user = users.find((item) => item.name.toLowerCase() === ownerName.trim().toLowerCase() || item.email.toLowerCase() === ownerName.trim().toLowerCase());
    if (ownerName.trim() && !user) {
      setError('No matching user found for owner.');
      return;
    }
    await updateMilestone(milestone, { ownerId: user?.id || null } as any);
  };

  const updateTargetDate = async (milestone: ProjectMilestone) => {
    const date = prompt('Target date (YYYY-MM-DD)', milestone.targetDate?.slice(0, 10) || '');
    if (date === null) return;
    await updateMilestone(milestone, { targetDate: date || null } as any);
  };

  const addRemarks = async (milestone: ProjectMilestone) => {
    const remarks = prompt('Remarks', milestone.remarks || '');
    if (remarks === null) return;
    await updateMilestone(milestone, { remarks } as any);
  };

  const flattenRepositoryItems = (items: RepositoryPickerItem[]): RepositoryPickerItem[] => {
    const flat: RepositoryPickerItem[] = [];
    const walk = (nodes: RepositoryPickerItem[]) => {
      nodes.forEach((node) => {
        flat.push(node);
        if (node.children?.length) walk(node.children);
      });
    };
    walk(items);
    return flat;
  };

  const findRepositoryItem = (items: RepositoryPickerItem[], itemId: string | null): RepositoryPickerItem | null => {
    if (!itemId) return null;
    for (const item of items) {
      if (item.id === itemId) return item;
      const child = findRepositoryItem(item.children || [], itemId);
      if (child) return child;
    }
    return null;
  };

  const repositoryItemsForCurrentFolder = () => {
    if (repositoryPicker?.mode === 'drive') {
      const term = repositorySearch.trim().toLowerCase();
      return term ? repositoryTree.filter((item) => [item.name, item.path, item.mimeType, item.source].join(' ').toLowerCase().includes(term)) : repositoryTree;
    }
    return repositorySearch.trim()
      ? flattenRepositoryItems(repositoryTree).filter((item) => [item.name, item.path, item.mimeType, item.source].join(' ').toLowerCase().includes(repositorySearch.trim().toLowerCase()))
      : (repositoryFolderId ? findRepositoryItem(repositoryTree, repositoryFolderId)?.children || [] : repositoryTree);
  };

  const loadDriveFiles = async (parentId = 'root', searchTerm = '') => {
    setRepositoryLoading(true);
    setRepositoryError('');
    try {
      const params = new URLSearchParams();
      params.set('parentId', parentId);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      const response = await fetch(`/api/repository/drive/files?${params.toString()}`, { credentials: 'include' });
      const data = await response.json().catch(() => []);
      if (response.status === 401 && data?.code === 'GOOGLE_DRIVE_RECONNECT_REQUIRED') {
        setDriveConnected(false);
        setRepositoryError(data.error || 'Google Drive connection expired. Please connect again.');
        setRepositoryTree([]);
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Unable to load Google Drive files');
      setRepositoryTree((Array.isArray(data) ? data : []).map((item: any) => ({
        id: `drive:${item.id}`,
        name: item.name || 'Untitled',
        type: item.mimeType === 'application/vnd.google-apps.folder' ? 'FOLDER' : 'FILE',
        parentId: parentId === 'root' ? null : `drive:${parentId}`,
        path: item.webViewLink || `https://drive.google.com/open?id=${item.id}`,
        mimeType: item.mimeType || null,
        size: item.size ? Number(item.size) : null,
        source: 'gdrive',
        externalId: item.id,
        webViewLink: item.webViewLink || `https://drive.google.com/open?id=${item.id}`,
        webContentLink: item.webContentLink || null,
        updatedAt: item.modifiedTime || undefined,
        children: [],
      })));
    } catch (err: any) {
      setRepositoryError(err.message || 'Unable to load Google Drive files.');
      setRepositoryTree([]);
    } finally {
      setRepositoryLoading(false);
    }
  };

  const openDriveFolder = async (item?: RepositoryPickerItem) => {
    const nextId = item?.externalId || 'root';
    setRepositorySearch('');
    setSelectedRepositoryIds([]);
    setDriveFolderStack((current) => item ? [...current, { id: nextId, name: item.name }] : []);
    await loadDriveFiles(nextId);
  };

  const openMilestonePicker = async (milestone: ProjectMilestone, mode: 'repository' | 'drive') => {
    setOpenMenuId(null);
    setRepositoryPicker({ milestone, mode });
    setRepositoryFolderId(null);
    setRepositorySearch('');
    setSelectedRepositoryIds([]);
    setRepositoryError('');
    setRepositoryLoading(true);
    setDriveFolderStack([]);
    try {
      const statusResponse = await fetch('/api/repository/drive/status', { credentials: 'include' });
      const connected = statusResponse.ok ? !!(await statusResponse.json())?.connected : false;
      setDriveConnected(connected);
      if (mode === 'drive') {
        if (!connected) {
          setRepositoryTree([]);
          return;
        }
        await loadDriveFiles('root');
        return;
      }
      const response = await fetch('/api/repository', { credentials: 'include' });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.error || 'Unable to load repository');
      setRepositoryTree(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setRepositoryError(err.message || 'Unable to load picker.');
      setRepositoryTree([]);
    } finally {
      setRepositoryLoading(false);
    }
  };

  const connectGoogleDrive = async () => {
    const res = await fetch('/api/repository/drive/auth-url', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || 'Unable to start Google Drive connection.');
    window.open(data.url, '_blank');
  };

  const confirmMilestoneRepositorySelection = async () => {
    if (!repositoryPicker || selectedRepositoryIds.length === 0) return;
    const selected = flattenRepositoryItems(repositoryTree).filter((item) => selectedRepositoryIds.includes(item.id));
    for (const item of selected) {
      await apiJson(`/api/project-milestones/${repositoryPicker.milestone.id}/attachments`, {
        method: 'POST',
        body: JSON.stringify({
          repositoryItemId: item.source === 'gdrive' && item.id.startsWith('drive:') ? null : item.id,
          googleDriveFileId: item.source === 'gdrive' ? item.externalId : null,
          source: item.source === 'gdrive' ? 'gdrive' : 'repository',
          fileName: item.name,
          filePath: item.webViewLink || item.path || item.name,
        }),
      });
    }
    setRepositoryPicker(null);
    await refreshAfterAction();
  };

  const seedMilestones = async () => {
    await apiJson(`/api/projects/${project.id}/milestones/seed`, { method: 'POST', body: JSON.stringify({}) });
    await refreshAfterAction();
  };

  const exportCsv = () => {
    const headers = ['Sr No', 'Milestone', 'Status', 'Owner', 'Target Date', 'Started On', 'Completed On', 'Progress'];
    const lines = filteredMilestones.map((item) => [
      item.sequence,
      item.milestoneName,
      item.isOverdue ? `${item.status} (OVERDUE)` : item.status,
      item.owner?.name || '',
      item.targetDate?.slice(0, 10) || '',
      item.startedAt?.slice(0, 10) || '',
      item.completedAt?.slice(0, 10) || '',
      `${item.progressPercentage}%`,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.projectName.replace(/[^a-z0-9]+/gi, '_')}_review_program_milestones.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredMilestones = milestones.filter((milestone) => {
    const haystack = `${milestone.sequence} ${milestone.milestoneName} ${milestone.description || ''}`.toLowerCase();
    const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'OVERDUE' ? milestone.isOverdue : milestone.status === statusFilter);
    const matchesOwner = ownerFilter === 'All' || (ownerFilter === 'Unassigned' ? !milestone.ownerId : milestone.ownerId === ownerFilter);
    return matchesSearch && matchesStatus && matchesOwner;
  });

  const ownerOptions = users.filter((user) => milestones.some((milestone) => milestone.ownerId === user.id));

  return (
    <div className="space-y-4">
      {error && <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"><AlertCircle className="inline h-4 w-4" /> {error}</div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric label="Overall Progress" value={`${summary?.overallProgressPercentage ?? 0}%`} />
        <Metric label="Completed" value={summary?.completedCount ?? 0} />
        <Metric label="In Progress" value={summary?.inProgressCount ?? 0} />
        <Metric label="Pending" value={summary?.pendingCount ?? 0} />
        <Metric label="Overdue" value={summary?.overdueCount ?? 0} />
        <Metric label="Current Stage" value={summary?.currentStage || '-'} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="font-extrabold text-slate-950">Review Program Milestones</h3>
            <p className="text-xs font-semibold text-slate-500">Senior workflow based milestone tracker for audit execution.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className={cn(inputClass, 'w-56')} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search milestone..." />
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {['All', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'BLOCKED'].map((status) => <option key={status}>{status}</option>)}
            </select>
            <select className={inputClass} value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option>All</option>
              <option>Unassigned</option>
              {ownerOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <button onClick={exportCsv} className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"><Download className="inline h-3.5 w-3.5" /> Export</button>
            {!loading && milestones.length === 0 && <button onClick={seedMilestones} className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white">Generate Review Program Milestones</button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="w-14 px-4 py-3">Timeline</th>
                <th className="px-4 py-3">Sr No</th>
                <th className="px-4 py-3">Milestone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Target Date</th>
                <th className="px-4 py-3">Started On</th>
                <th className="px-4 py-3">Completed On</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Required Action</th>
                <th className="px-4 py-3">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center font-bold text-slate-500">Loading milestones...</td></tr>
              ) : filteredMilestones.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center font-bold text-slate-500">No milestones match the filters.</td></tr>
              ) : filteredMilestones.map((milestone, index) => (
                <tr key={milestone.id} className="h-16 hover:bg-slate-50">
                    <td className="relative px-4 py-3">
                      <span className={cn('absolute left-6 top-0 h-full w-px bg-slate-200', index === 0 ? 'top-8' : '', index === filteredMilestones.length - 1 ? 'h-8' : '')} />
                      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white ring-1 ring-slate-200"><MilestoneStatusIcon milestone={milestone} /></span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">{milestone.sequence}</td>
                    <td className="px-4 py-3">
                      <p className="font-extrabold text-slate-950">{milestone.milestoneName}</p>
                      <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{milestone.description}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-600">{(milestone.workspaceType || 'WORKSPACE').replaceAll('_', ' ')}</p>
                    </td>
                    <td className="px-4 py-3"><span className={statusPill(milestone.isOverdue ? 'OVERDUE' : milestone.status)}>{milestone.isOverdue ? 'OVERDUE' : milestone.status}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{milestone.owner?.name || userName(users, milestone.ownerId) || 'Unassigned'}</td>
                    <td className={cn('px-4 py-3 font-semibold', milestone.isOverdue ? 'text-rose-600' : 'text-slate-600')}>{formatDate(milestone.targetDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(milestone.startedAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(milestone.completedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-24 rounded bg-slate-200"><div className="h-full rounded bg-blue-600" style={{ width: `${milestone.progressPercentage || 0}%` }} /></div>
                      <p className="mt-1 text-[10px] font-bold text-slate-500">{milestone.progressPercentage || 0}%</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600">{milestone.requiredAction || 'Open milestone workspace'}</td>
                    <td className="relative px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/projects/${project.id}/milestones/${milestone.id}`} className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white">Open</Link>
                      <button onClick={() => setOpenMenuId(openMenuId === milestone.id ? null : milestone.id)} className="rounded p-2 hover:bg-slate-100"><MoreVertical className="h-4 w-4" /></button>
                      </div>
                      {openMenuId === milestone.id && (
                        <div className="absolute right-4 z-20 w-52 rounded border border-slate-200 bg-white p-2 text-xs font-bold shadow-lg">
                          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => runAction(milestone, 'start')}>Start Milestone</button>
                          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => runAction(milestone, 'pause')}>Pause</button>
                          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => runAction(milestone, 'resume')}>Resume</button>
                          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => runAction(milestone, 'complete')}>Mark Complete</button>
                          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => runAction(milestone, 'reopen')}>Reopen</button>
                          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => changeOwner(milestone)}>Change Owner</button>
                          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => updateTargetDate(milestone)}>Update Target Date</button>
                          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => addRemarks(milestone)}>Add Remarks</button>
                          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => openMilestonePicker(milestone, 'repository').catch(console.error)}>Browse Repository</button>
                          <button className="block w-full rounded px-3 py-2 text-left hover:bg-slate-50" onClick={() => openMilestonePicker(milestone, 'drive').catch(console.error)}>Browse Google Drive</button>
                        </div>
                      )}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {repositoryPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="flex max-h-[86vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="font-extrabold text-slate-950">{repositoryPicker.mode === 'drive' ? 'Google Drive Picker' : 'Repository Picker'}</h3>
                <p className="text-xs font-semibold text-slate-500">Select files or folders to link to {repositoryPicker.milestone.milestoneName}.</p>
              </div>
              <button type="button" onClick={() => setRepositoryPicker(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {repositoryPicker.mode === 'drive' && !driveConnected ? (
              <div className="p-8 text-center">
                <h4 className="text-lg font-extrabold text-slate-950">Google Drive is not connected</h4>
                <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">Connect Google Drive, finish OAuth in the new tab, then return and refresh the picker.</p>
                <div className="mt-5 flex justify-center gap-2">
                  <button type="button" onClick={() => connectGoogleDrive().catch((err) => setRepositoryError(err.message || 'Unable to connect Drive'))} className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white">Connect Google Drive</button>
                  <button type="button" onClick={() => openMilestonePicker(repositoryPicker.milestone, 'drive').catch(console.error)} className="rounded bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">Refresh</button>
                </div>
                {repositoryError && <p className="mt-3 text-xs font-bold text-rose-600">{repositoryError}</p>}
              </div>
            ) : (
              <>
                <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[220px_1fr_280px]">
                  <aside className="border-b border-slate-200 p-3 md:border-b-0 md:border-r">
                    <button type="button" onClick={() => repositoryPicker.mode === 'drive' ? openDriveFolder().catch(console.error) : setRepositoryFolderId(null)} className={cn('mb-2 w-full rounded px-3 py-2 text-left text-xs font-bold', (!repositoryFolderId && driveFolderStack.length === 0) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50')}>
                      {repositoryPicker.mode === 'drive' ? 'My Drive' : 'All folders'}
                    </button>
                    <div className="max-h-[54vh] space-y-1 overflow-auto">
                      {flattenRepositoryItems(repositoryTree).filter((item) => item.type === 'FOLDER').map((item) => (
                        <button key={item.id} type="button" onClick={() => repositoryPicker.mode === 'drive' ? openDriveFolder(item).catch(console.error) : (setRepositoryFolderId(item.id), setRepositorySearch(''))} className={cn('flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-bold', repositoryFolderId === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50')}>
                          <Folder className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </aside>
                  <main className="min-h-0 border-b border-slate-200 p-3 md:border-b-0 md:border-r">
                    <div className="mb-3 flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input className={cn(inputClass, 'pl-9')} value={repositorySearch} onChange={(event) => setRepositorySearch(event.target.value)} placeholder={repositoryPicker.mode === 'drive' ? 'Search Google Drive...' : 'Search files and folders...'} />
                      </div>
                      <button type="button" onClick={() => repositoryPicker.mode === 'drive' ? loadDriveFiles(driveFolderStack[driveFolderStack.length - 1]?.id || 'root', repositorySearch).catch(console.error) : openMilestonePicker(repositoryPicker.milestone, repositoryPicker.mode).catch(console.error)} className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                        <RefreshCw className="inline h-3.5 w-3.5" /> {repositoryPicker.mode === 'drive' && repositorySearch.trim() ? 'Search' : 'Refresh'}
                      </button>
                    </div>
                    {repositoryError && <p className="mb-2 rounded bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{repositoryError}</p>}
                    <div className="max-h-[52vh] overflow-auto rounded border border-slate-200">
                      {repositoryLoading ? (
                        <p className="p-8 text-center text-sm font-bold text-slate-500">Loading picker...</p>
                      ) : repositoryItemsForCurrentFolder().length === 0 ? (
                        <p className="p-8 text-center text-sm font-bold text-slate-500">No files or folders found.</p>
                      ) : repositoryItemsForCurrentFolder().map((item) => (
                        <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50">
                          <input type="checkbox" checked={selectedRepositoryIds.includes(item.id)} onChange={(event) => setSelectedRepositoryIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                          {item.type === 'FOLDER' ? <Folder className="h-4 w-4 shrink-0 text-amber-500" /> : <FileText className="h-4 w-4 shrink-0 text-slate-500" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                            <p className="truncate text-[10px] font-semibold uppercase text-slate-400">{item.source === 'gdrive' ? 'Google Drive' : 'Repository'} / {item.type}</p>
                          </div>
                          {item.type === 'FOLDER' && <button type="button" onClick={(event) => { event.preventDefault(); repositoryPicker.mode === 'drive' ? openDriveFolder(item).catch(console.error) : (setRepositoryFolderId(item.id), setRepositorySearch('')); }} className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">Open</button>}
                        </label>
                      ))}
                    </div>
                  </main>
                  <aside className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selected</p>
                    {selectedRepositoryIds.length ? (
                      <div className="mt-3 space-y-2">
                        {flattenRepositoryItems(repositoryTree).filter((item) => selectedRepositoryIds.includes(item.id)).map((item) => (
                          <div key={item.id} className="rounded border border-slate-200 bg-slate-50 p-2">
                            <p className="truncate text-sm font-extrabold text-slate-950">{item.name}</p>
                            <p className="text-[10px] font-bold uppercase text-slate-400">{item.source === 'gdrive' ? 'Google Drive' : 'Repository'} / {item.type}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="mt-3 text-sm font-semibold text-slate-500">Select an item to link it.</p>}
                  </aside>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                  <span className="text-xs font-bold text-slate-500">{selectedRepositoryIds.length} selected</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setRepositoryPicker(null)} className="rounded bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">Cancel</button>
                    <button type="button" disabled={selectedRepositoryIds.length === 0} onClick={() => confirmMilestoneRepositorySelection().catch((err) => setRepositoryError(err.message || 'Unable to link selection'))} className="rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Link Selected</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QueriesDiscussionTab({ project, users, reload }: { project: ApiProject; users: ProjectUser[]; reload: () => Promise<void> }) {
  const [queryText, setQueryText] = useState('');
  const create = async () => {
    if (!queryText.trim()) return;
    await apiJson(`/api/projects/${project.id}/queries`, { method: 'POST', body: JSON.stringify({ queryText, priority: 'Medium' }) });
    setQueryText('');
    await reload();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <textarea className={textareaClass} value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Raise a query or discussion item" />
        <button onClick={create} className="mt-3 rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">Raise Query</button>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4 font-extrabold text-slate-950">Query Tracker</div>
        <div className="divide-y divide-slate-100">
          {(project.queries || []).map((query) => (
            <div key={query.id} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_160px_160px_160px]">
              <div><p className="font-bold text-slate-900">{query.queryText}</p><p className="text-xs text-slate-500">{query.response || 'No response yet'}</p></div>
              <span className={statusPill(query.status)}>{query.status}</span>
              <p className="text-xs font-semibold text-slate-600">Assigned: {userName(users, query.assignedTo)}</p>
              <p className="text-xs font-semibold text-slate-600">Due: {formatDate(query.dueDate)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvidenceTab({ project, reload }: { project: ApiProject; reload: () => Promise<void> }) {
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const addEvidence = async () => {
    const title = prompt('Evidence title');
    if (!title?.trim()) return;
    const type = prompt('Evidence type', 'Evidence') || 'Evidence';
    const frameworkMapping = prompt('Area / control mapping', project.areaAllocations?.[0]?.areaName || project.natureOfProject || project.frameworks) || 'Unmapped';
    await apiJson('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ title, type, frameworkMapping, projectId: project.id }),
    });
    await reload();
  };

  const deleteEvidence = async (docId: string, title: string) => {
    if (!window.confirm(`Delete evidence "${title}"?`)) return;
    await apiJson(`/api/documents/${docId}`, { method: 'DELETE' });
    await reload();
  };

  const evidenceRows = (project.documents || []).filter((doc) => {
    const searchable = [doc.title, doc.type, doc.frameworkMapping, doc.status, doc.updatedAt].join(' ').toLowerCase();
    return (!evidenceSearch.trim() || searchable.includes(evidenceSearch.trim().toLowerCase()))
      && (!typeFilter || doc.type === typeFilter)
      && (!statusFilter || doc.status === statusFilter);
  });
  const typeOptions = Array.from(new Set((project.documents || []).map((doc) => doc.type).filter(Boolean))).sort();
  const statusOptions = Array.from(new Set((project.documents || []).map((doc) => doc.status).filter(Boolean))).sort();

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="font-extrabold text-slate-950">Evidence</h3>
          <p className="text-xs font-semibold text-slate-500">Evidence and working papers mapped to project areas or controls.</p>
        </div>
        <button onClick={addEvidence} className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">
          <Upload className="inline h-3.5 w-3.5" /> Add Evidence
        </button>
      </div>
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_200px_160px]">
          <Field label="Search">
            <input className={inputClass} value={evidenceSearch} onChange={(event) => setEvidenceSearch(event.target.value)} placeholder="Evidence, type, area..." />
          </Field>
          <Field label="Type">
            <select className={inputClass} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">All Types</option>
              {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All Statuses</option>
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setEvidenceSearch('');
                setTypeFilter('');
                setStatusFilter('');
              }}
              className="h-10 w-full rounded border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3">Evidence Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Area / Control</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {evidenceRows.map((doc) => (
              <tr key={doc.id}>
                <td className="px-4 py-3 font-bold text-slate-900">{doc.title}</td>
                <td className="px-4 py-3 text-slate-600">{doc.type}</td>
                <td className="px-4 py-3 text-slate-600">{doc.frameworkMapping}</td>
                <td className="px-4 py-3"><span className={statusPill(doc.status)}>{doc.status}</span></td>
                <td className="px-4 py-3 text-slate-600">{formatDate(doc.updatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => deleteEvidence(doc.id, doc.title)}
                    className="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {evidenceRows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center font-semibold text-slate-500">{(project.documents || []).length === 0 ? 'No evidence added yet.' : 'No evidence matches the current filters.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsTab({ project, reload }: { project: ApiProject; reload: () => Promise<void> }) {
  const uploadStageDoc = async (stageName: string) => {
    const stage = project.stages?.find((item) => item.stageName === stageName);
    if (!stage) return;
    const title = prompt(`${stageName} document title`);
    if (!title) return;
    await apiJson(`/api/project-stages/${stage.id}/documents`, { method: 'POST', body: JSON.stringify({ title }) });
    await reload();
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {['Draft Reporting', 'Final Reporting'].map((stageName) => {
        const stage = project.stages?.find((item) => item.stageName === stageName);
        return (
          <div key={stageName} className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="font-extrabold text-slate-950">{stageName}</h3>
            <p className="mt-2 text-sm text-slate-600">Status: <span className={statusPill(stage?.status)}>{stage?.status || '-'}</span></p>
            <p className="mt-2 text-sm text-slate-600">Reviewer comments: {stage?.comments || '-'}</p>
            <button onClick={() => uploadStageDoc(stageName)} className="mt-4 rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Upload className="inline h-3.5 w-3.5" /> Upload Report</button>
          </div>
        );
      })}
      <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2">
        <h3 className="font-extrabold text-slate-950">Evidence & Documents</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {(project.documents || []).map((doc) => (
            <div key={doc.id} className="rounded border border-slate-100 bg-slate-50 p-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <p className="mt-2 text-sm font-bold text-slate-900">{doc.title}</p>
              <p className="text-xs text-slate-500">{doc.type} - {doc.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectObservationsTab({ project }: { project: ApiProject }) {
  const observations = (project.areaAllocations || []).flatMap((area) => (area.observations || []).map((observation) => ({ ...observation, areaName: area.areaName })));
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="font-extrabold text-slate-950">Observations</h3>
        <p className="text-xs font-semibold text-slate-500">Checklist-generated observations and findings from audit area execution.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Control</th>
              <th className="px-4 py-3">Observation</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">CAPA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {observations.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center font-semibold text-slate-500">No observations generated yet.</td></tr>
            ) : observations.map((observation) => (
              <tr key={observation.id}>
                <td className="px-4 py-3 font-bold text-slate-800">{observation.areaName}</td>
                <td className="px-4 py-3 text-slate-600">{observation.controlArea || observation.isoClause || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{observation.description}</td>
                <td className="px-4 py-3"><span className={statusPill(observation.status)}>{observation.status}</span></td>
                <td className="px-4 py-3 text-slate-600">{observation.capa?.closureStatus || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingCollectionTab({ project, reload }: { project: ApiProject; reload: () => Promise<void> }) {
  const billing = project.billingRecords?.[0];
  const save = async (patch: Partial<ProjectBilling>) => {
    if (billing) await apiJson(`/api/project-billing/${billing.id}`, { method: 'PUT', body: JSON.stringify(patch) });
    else await apiJson(`/api/projects/${project.id}/billing`, { method: 'POST', body: JSON.stringify(patch) });
    await reload();
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-extrabold text-slate-950">Billing & Collection</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <Field label="Invoice Number"><input className={inputClass} defaultValue={billing?.invoiceNumber || ''} onBlur={(e) => save({ invoiceNumber: e.target.value })} /></Field>
        <Field label="Invoice Date"><input type="date" className={inputClass} defaultValue={billing?.invoiceDate?.slice(0, 10) || ''} onBlur={(e) => save({ invoiceDate: e.target.value as any })} /></Field>
        <Field label="Invoice Amount"><input type="number" className={inputClass} defaultValue={billing?.invoiceAmount || 0} onBlur={(e) => save({ invoiceAmount: Number(e.target.value) })} /></Field>
        <Field label="Tax Amount"><input type="number" className={inputClass} defaultValue={billing?.taxAmount || 0} onBlur={(e) => save({ taxAmount: Number(e.target.value) })} /></Field>
        <Field label="Total Amount"><input type="number" className={inputClass} defaultValue={billing?.totalAmount || 0} onBlur={(e) => save({ totalAmount: Number(e.target.value) })} /></Field>
        <Field label="Billing Status"><select className={inputClass} defaultValue={billing?.billingStatus || 'Not Billed'} onChange={(e) => save({ billingStatus: e.target.value })}>{['Not Billed', 'Invoice Raised', 'Partially Paid', 'Paid', 'Overdue'].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Amount Received"><input type="number" className={inputClass} defaultValue={billing?.amountReceived || 0} onBlur={(e) => save({ amountReceived: Number(e.target.value) })} /></Field>
        <Field label="Payment Mode"><input className={inputClass} defaultValue={billing?.paymentMode || ''} onBlur={(e) => save({ paymentMode: e.target.value })} /></Field>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Outstanding Amount" value={billing?.outstandingAmount ?? 0} />
        <Metric label="Collection Status" value={billing?.collectionStatus || 'Pending'} />
        <Metric label="Payment Due Date" value={formatDate(billing?.paymentDueDate)} />
      </div>
    </div>
  );
}

function ClientFeedbackTab({ project, reload }: { project: ApiProject; reload: () => Promise<void> }) {
  const [form, setForm] = useState({ feedbackRating: 5, feedbackComments: '', receivedFrom: '', feedbackDate: '', improvementNotes: '' });
  const submit = async () => {
    await apiJson(`/api/projects/${project.id}/feedback`, { method: 'POST', body: JSON.stringify(form) });
    setForm({ feedbackRating: 5, feedbackComments: '', receivedFrom: '', feedbackDate: '', improvementNotes: '' });
    await reload();
  };
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="font-extrabold text-slate-950">Add Feedback</h3>
        <div className="mt-4 space-y-3">
          <Field label="Rating"><input type="number" min={1} max={5} className={inputClass} value={form.feedbackRating} onChange={(e) => setForm({ ...form, feedbackRating: Number(e.target.value) })} /></Field>
          <Field label="Received From"><input className={inputClass} value={form.receivedFrom} onChange={(e) => setForm({ ...form, receivedFrom: e.target.value })} /></Field>
          <Field label="Feedback Date"><input type="date" className={inputClass} value={form.feedbackDate} onChange={(e) => setForm({ ...form, feedbackDate: e.target.value })} /></Field>
          <Field label="Comments"><textarea className={textareaClass} value={form.feedbackComments} onChange={(e) => setForm({ ...form, feedbackComments: e.target.value })} /></Field>
          <Field label="Improvement Notes"><textarea className={textareaClass} value={form.improvementNotes} onChange={(e) => setForm({ ...form, improvementNotes: e.target.value })} /></Field>
          <button onClick={submit} className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">Save Feedback</button>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="font-extrabold text-slate-950">Feedback History</h3>
        <div className="mt-3 space-y-3">
          {(project.feedbackRecords || []).map((item) => (
            <div key={item.id} className="rounded border border-slate-100 bg-slate-50 p-3">
              <p className="font-bold text-slate-900">{item.feedbackRating || '-'} / 5 from {item.receivedFrom || '-'}</p>
              <p className="text-sm text-slate-600">{item.feedbackComments}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DataBackupTab({ project, reload }: { project: ApiProject; reload: () => Promise<void> }) {
  const backup = project.backupRecords?.[0];
  const save = async (patch: Partial<ProjectBackup>) => {
    if (backup) await apiJson(`/api/project-backup/${backup.id}`, { method: 'PUT', body: JSON.stringify(patch) });
    else await apiJson(`/api/projects/${project.id}/backup`, { method: 'POST', body: JSON.stringify(patch) });
    await reload();
  };
  const checks: Array<[keyof ProjectBackup, string]> = [
    ['evidenceBackedUp', 'Evidence backed up'],
    ['reportsBackedUp', 'Reports backed up'],
    ['clientDocumentsBackedUp', 'Client documents backed up'],
    ['workingPapersBackedUp', 'Working papers backed up'],
    ['finalArchiveCompleted', 'Final archive completed'],
  ];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-extrabold text-slate-950">Data Backup Checklist</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {checks.map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 rounded border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-800">
            <input type="checkbox" checked={!!backup?.[key]} onChange={(e) => save({ [key]: e.target.checked } as Partial<ProjectBackup>)} />
            {label}
          </label>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <Field label="Backup Status"><input className={inputClass} defaultValue={backup?.backupStatus || 'Pending'} onBlur={(e) => save({ backupStatus: e.target.value })} /></Field>
        <Field label="Backup Location"><input className={inputClass} defaultValue={backup?.backupLocation || ''} onBlur={(e) => save({ backupLocation: e.target.value })} /></Field>
        <Field label="Backup Date"><input type="date" className={inputClass} defaultValue={backup?.backupDate?.slice(0, 10) || ''} onBlur={(e) => save({ backupDate: e.target.value as any })} /></Field>
        <Field label="Remarks"><input className={inputClass} defaultValue={backup?.remarks || ''} onBlur={(e) => save({ remarks: e.target.value })} /></Field>
      </div>
    </div>
  );
}

function ProjectActivityTimeline({ project, users }: { project: ApiProject; users: ProjectUser[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-extrabold text-slate-950">Activity Logs</h3>
      <div className="mt-4 space-y-4">
        {(project.activityLogs || []).map((item) => (
          <div key={item.id} className="flex gap-3 border-b border-slate-100 pb-4">
            <div className="mt-1 h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">{(userName(users, item.actor) || 'S').slice(0, 2)}</div>
            <div>
              <p className="text-sm font-bold text-slate-900">{item.action}</p>
              <p className="text-sm text-slate-600">{item.message || item.details}</p>
              <p className="text-xs text-slate-400">{formatDate(item.timestamp)} - {item.performedByName || userName(users, item.actor)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableTableField({
  value,
  className,
  multiline = true,
  type = 'text',
  placeholder,
  onCommit,
}: {
  value: string;
  className: string;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
  onCommit: (value: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(value);
  }, [value]);

  const commit = () => {
    focusedRef.current = false;
    if (draft !== value) {
      const next = draft;
      window.setTimeout(() => void onCommit(next), 120);
    }
  };

  if (!multiline) {
    return (
      <input
        className={className}
        type={type}
        value={draft}
        placeholder={placeholder}
        onFocus={() => { focusedRef.current = true; }}
        onClick={(event) => event.currentTarget.focus()}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
      />
    );
  }

  return (
    <textarea
      className={className}
      value={draft}
      placeholder={placeholder}
      onFocus={() => { focusedRef.current = true; }}
      onClick={(event) => event.currentTarget.focus()}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
    />
  );
}

const SimpleEditableGridCell = React.memo(function SimpleEditableGridCell({
  value,
  initialValue,
  label,
  selected,
  editing,
  canEdit,
  type = 'text',
  options,
  density = 'compact',
  onSelect,
  onEdit,
  onCommit,
  onCancel,
  onMove,
}: {
  value: string;
  initialValue?: string;
  label: string;
  selected: boolean;
  editing: boolean;
  canEdit: boolean;
  type?: string;
  options?: string[] | null;
  density?: 'compact' | 'comfortable';
  onSelect: () => void;
  onEdit: (initialValue?: string) => void;
  onCommit: (value: string, immediate?: boolean) => void;
  onCancel: () => void;
  onMove: (direction: 'up' | 'down' | 'left' | 'right' | 'next' | 'previous', edit?: boolean) => void;
}) {
  const [draft, setDraft] = useState(value);
  const cellRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (editing) {
      cancelledRef.current = false;
      setDraft(initialValue ?? value);
    }
  }, [editing, initialValue, value]);

  useEffect(() => {
    if (!editing) return;
    window.setTimeout(() => {
      editorRef.current?.focus();
      if (editorRef.current instanceof HTMLTextAreaElement || editorRef.current instanceof HTMLInputElement) editorRef.current.select();
    }, 0);
  }, [editing]);

  useEffect(() => {
    if (selected && !editing) cellRef.current?.focus();
  }, [selected, editing]);

  const compact = density === 'compact';
  const cellMinHeightClass = compact ? 'min-h-[40px]' : 'min-h-[78px]';
  const quickOptionMinHeightClass = compact ? 'min-h-[44px]' : 'min-h-[78px]';
  const quickOptionInnerClass = compact ? 'min-h-[26px] items-center' : 'min-h-[58px] items-start';
  const editorMinHeightClass = compact ? 'min-h-[52px]' : 'min-h-[76px]';
  const displayLineStyle = compact && type !== 'status'
    ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }
    : undefined;

  const commit = (direction?: 'down' | 'next' | 'previous') => {
    if (cancelledRef.current) return;
    onCommit(draft, !!direction);
    if (direction === 'down') onMove('down', true);
    if (direction === 'next') onMove('next', true);
    if (direction === 'previous') onMove('previous', true);
  };

  const quickOptions = options?.length && options.every((option) => ['Yes', 'No', 'NA', 'N/A'].includes(option));

  if (!editing && canEdit && (type === 'status' || quickOptions)) {
    if (quickOptions) {
      const normalizedValue = value === 'N/A' ? 'NA' : value;
      return (
        <div
          ref={cellRef}
          role="gridcell"
          aria-label={label}
          tabIndex={0}
          className={cn(
            quickOptionMinHeightClass,
            'w-full rounded-sm border px-2 py-1.5 text-xs font-semibold outline-none',
            selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-transparent bg-transparent',
          )}
          onClick={(event) => { event.currentTarget.focus(); onSelect(); }}
          onKeyDown={(event) => {
            const key = event.key.toLowerCase();
            if (event.key === 'Escape') { event.preventDefault(); onCancel(); return; }
            if (key === 'y' || key === 'n' || key === 'a') {
              event.preventDefault();
              onCommit(key === 'y' ? 'Yes' : key === 'n' ? 'No' : 'NA', true);
            }
          }}
        >
          <div className={cn('flex flex-wrap gap-1.5', quickOptionInnerClass)}>
            {['Yes', 'No', 'NA'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect();
                  onCommit(option, true);
                }}
                className={cn('rounded-full px-2 py-1 text-[10px] font-bold ring-1', normalizedValue === option ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <select
        ref={(node) => { editorRef.current = node; }}
        aria-label={label}
        className="h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs font-bold uppercase outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        value={value || 'Pending'}
        onClick={onSelect}
        onChange={(event) => {
          onSelect();
          onCommit(event.currentTarget.value, true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
          if (event.key === 'Tab') { event.preventDefault(); onMove(event.shiftKey ? 'previous' : 'next'); }
        }}
      >
        {(options || []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  if (editing) {
    if (type === 'status' || options?.length) {
      return (
        <select
          ref={(node) => { editorRef.current = node; }}
          className="h-9 w-full rounded border border-blue-400 bg-white px-2 text-xs font-bold uppercase outline-none ring-2 ring-blue-100"
          value={draft || options?.[0] || ''}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            onCommit(event.currentTarget.value, true);
            onMove('next');
          }}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); cancelledRef.current = true; onCancel(); }
            if (event.key === 'Enter') { event.preventDefault(); commit('down'); }
            if (event.key === 'Tab') { event.preventDefault(); commit(event.shiftKey ? 'previous' : 'next'); }
          }}
        >
          {(options || []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }

    if (type === 'date' || type === 'number') {
      return (
        <input
          ref={(node) => { editorRef.current = node; }}
          className="h-9 w-full rounded border border-blue-400 bg-white px-2 text-xs font-semibold text-slate-800 outline-none ring-2 ring-blue-100"
          type={type}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); cancelledRef.current = true; onCancel(); }
            if (event.key === 'Enter') { event.preventDefault(); commit('down'); }
            if (event.key === 'Tab') { event.preventDefault(); commit(event.shiftKey ? 'previous' : 'next'); }
          }}
        />
      );
    }

    return (
      <textarea
        ref={(node) => { editorRef.current = node; }}
        className={cn(editorMinHeightClass, 'w-full resize-none rounded border border-blue-400 bg-white px-2 py-1 text-xs font-semibold leading-relaxed text-slate-800 outline-none ring-2 ring-blue-100')}
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={() => commit()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); cancelledRef.current = true; onCancel(); }
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); commit('down'); }
          if (event.key === 'Tab') { event.preventDefault(); commit(event.shiftKey ? 'previous' : 'next'); }
        }}
      />
    );
  }

  return (
    <div
      ref={cellRef}
      role="gridcell"
      aria-label={label}
      tabIndex={0}
      className={cn(
        cellMinHeightClass,
        'w-full rounded-sm border px-2 py-1 text-xs font-semibold leading-snug outline-none',
        selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-transparent bg-transparent',
        canEdit ? 'cursor-cell' : 'cursor-default',
      )}
      onClick={(event) => {
        event.currentTarget.focus();
        onSelect();
      }}
      onDoubleClick={() => canEdit && onEdit()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); onCancel(); return; }
        if (event.key === 'Enter') { event.preventDefault(); if (canEdit) onEdit(); return; }
        if (event.key === 'Tab') { event.preventDefault(); onMove(event.shiftKey ? 'previous' : 'next'); return; }
        if (event.key === 'ArrowUp') { event.preventDefault(); onMove('up'); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); onMove('down'); return; }
        if (event.key === 'ArrowLeft') { event.preventDefault(); onMove('left'); return; }
        if (event.key === 'ArrowRight') { event.preventDefault(); onMove('right'); return; }
        if (canEdit && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          onEdit(event.key);
        }
      }}
    >
      <span
        className={cn(
          'block whitespace-pre-wrap break-words',
          compact ? 'min-h-[30px]' : 'min-h-[68px]',
          type === 'status' && 'inline-flex min-h-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-700',
        )}
        style={displayLineStyle}
        title={compact && type !== 'status' ? value || '-' : undefined}
      >
        {value || '-'}
      </span>
    </div>
  );
});

const FILTER_BLANK_KEY = '__auditie_blank__';

const normalizeFilterOption = (value: unknown): GridFilterOption => {
  const raw = value == null ? '' : String(value);
  const trimmed = raw.trim();
  if (!trimmed) return { key: FILTER_BLANK_KEY, label: 'Blank', sortLabel: '' };
  return { key: trimmed, label: trimmed, sortLabel: trimmed };
};

const normalizeStoredFilter = (value: unknown): GridColumnFilter | null => {
  if (!value || typeof value !== 'object') return null;
  const maybeValues = (value as { values?: unknown }).values;
  if (!Array.isArray(maybeValues)) return null;
  return { values: maybeValues.map((item) => normalizeFilterOption(item).key) };
};

const normalizeStoredColumnFilters = (value: unknown): Record<string, GridColumnFilter> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, GridColumnFilter>>((next, [columnId, filter]) => {
    const normalized = normalizeStoredFilter(filter);
    if (normalized) next[columnId] = normalized;
    return next;
  }, {});
};

const FilterOptionRow = React.memo(function FilterOptionRow({
  option,
  checked,
  focused,
  top,
  height,
  onToggle,
}: {
  option: GridFilterOption;
  checked: boolean;
  focused: boolean;
  top: number;
  height: number;
  onToggle: (key: string) => void;
}) {
  const handleChange = useCallback(() => onToggle(option.key), [onToggle, option.key]);
  return (
    <label
      className={cn('absolute left-0 right-0 flex cursor-pointer items-center gap-2 px-2 hover:bg-slate-50', focused && 'bg-blue-50')}
      style={{ top, height }}
    >
      <input type="checkbox" checked={checked} onChange={handleChange} />
      <span className="min-w-0 truncate">{option.label}</span>
    </label>
  );
});

const FilterPopup = React.memo(function FilterPopup({
  column,
  options,
  appliedFilter,
  position,
  onApply,
  onClear,
  onCancel,
}: {
  column: GridColumnDef;
  options: GridFilterOption[];
  appliedFilter: GridColumnFilter | null;
  position: FilterMenuPosition;
  onApply: (filter: GridColumnFilter | null, sortDesc: boolean | null) => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const optionKeys = useMemo(() => options.map((option) => option.key), [options]);
  const optionKeySet = useMemo(() => new Set(optionKeys), [optionKeys]);
  const selectedRef = useRef<Set<string>>(new Set(appliedFilter
    ? appliedFilter.values.map((value) => normalizeFilterOption(value).key).filter((key) => optionKeySet.has(key))
    : optionKeys));
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [draftSortDesc, setDraftSortDesc] = useState<boolean | null>(null);

  useEffect(() => {
    const next = new Set<string>();
    if (appliedFilter) {
      appliedFilter.values.forEach((value) => {
        const key = normalizeFilterOption(value).key;
        if (optionKeySet.has(key)) next.add(key);
      });
    } else {
      optionKeys.forEach((key) => next.add(key));
    }
    selectedRef.current = next;
    setSearchText('');
    setDebouncedSearch('');
    setScrollTop(0);
    setFocusIndex(0);
    setDraftSortDesc(null);
    setSelectionVersion((version) => version + 1);
  }, [appliedFilter, column.id, optionKeys, optionKeySet]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchText), 150);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!popupRef.current?.contains(event.target as Node)) onCancel();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [onCancel]);

  const filteredOptions = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return term ? options.filter((option) => option.label.toLowerCase().includes(term)) : options;
  }, [options, debouncedSearch]);

  const selectedVisibleCount = useMemo(
    () => filteredOptions.reduce((count, option) => count + (selectedRef.current.has(option.key) ? 1 : 0), 0),
    [filteredOptions, selectionVersion],
  );
  const allVisibleSelected = filteredOptions.length > 0 && selectedVisibleCount === filteredOptions.length;
  const rowHeight = 30;
  const viewportHeight = 240;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 4);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + 8;
  const virtualOptions = useMemo(() => filteredOptions.slice(startIndex, startIndex + visibleCount), [filteredOptions, startIndex, visibleCount]);

  const rerenderSelection = useCallback(() => setSelectionVersion((version) => version + 1), []);

  const toggleValue = useCallback((key: string) => {
    const selected = selectedRef.current;
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
    rerenderSelection();
  }, [rerenderSelection]);

  const toggleAllVisible = useCallback(() => {
    const selected = selectedRef.current;
    if (allVisibleSelected) filteredOptions.forEach((option) => selected.delete(option.key));
    else filteredOptions.forEach((option) => selected.add(option.key));
    rerenderSelection();
  }, [allVisibleSelected, filteredOptions, rerenderSelection]);

  const apply = useCallback(() => {
    const selectedValues = optionKeys.filter((key) => selectedRef.current.has(key));
    onApply(selectedValues.length === optionKeys.length ? null : { values: selectedValues }, draftSortDesc);
  }, [draftSortDesc, onApply, optionKeys]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onCancel(); return; }
    if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) { event.preventDefault(); apply(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') { event.preventDefault(); optionKeys.forEach((key) => selectedRef.current.add(key)); rerenderSelection(); return; }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.min(filteredOptions.length - 1, focusIndex + 1);
      setFocusIndex(next);
      listRef.current?.scrollTo({ top: Math.max(0, (next - 4) * rowHeight) });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = Math.max(0, focusIndex - 1);
      setFocusIndex(next);
      listRef.current?.scrollTo({ top: Math.max(0, (next - 4) * rowHeight) });
      return;
    }
    if (event.key === ' ' && filteredOptions[focusIndex]) {
      event.preventDefault();
      toggleValue(filteredOptions[focusIndex].key);
    }
  };

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-50 w-72 rounded-md border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 shadow-xl"
      style={{ top: position.top, left: position.left, maxHeight: 'min(420px, calc(100vh - 24px))' }}
      onKeyDown={handleKeyDown}
      onWheel={(event) => event.stopPropagation()}
      onWheelCapture={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold text-slate-900">{column.label}</p>
        <button type="button" onClick={onCancel} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setDraftSortDesc(false)} className={cn('rounded border border-slate-200 px-2 py-1 text-left font-bold hover:bg-slate-50', draftSortDesc === false && 'border-blue-300 bg-blue-50 text-blue-700')}>Sort A to Z</button>
        <button type="button" onClick={() => setDraftSortDesc(true)} className={cn('rounded border border-slate-200 px-2 py-1 text-left font-bold hover:bg-slate-50', draftSortDesc === true && 'border-blue-300 bg-blue-50 text-blue-700')}>Sort Z to A</button>
      </div>
      <input
        className="mt-2 h-9 w-full rounded border border-slate-200 px-2 text-xs outline-none focus:border-blue-400"
        value={searchText}
        onChange={(event) => setSearchText(event.currentTarget.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
        placeholder={`Search ${column.label.toLowerCase()}...`}
      />
      <div className="mt-2 rounded border border-slate-100">
        <label className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-2 py-2 font-bold hover:bg-slate-50">
          <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
          Select All
        </label>
        <div
          ref={listRef}
          className="overflow-y-auto overscroll-contain"
          style={{ height: Math.min(viewportHeight, Math.max(rowHeight, filteredOptions.length * rowHeight)) }}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          onWheel={(event) => event.stopPropagation()}
          onWheelCapture={(event) => event.stopPropagation()}
        >
          <div style={{ height: filteredOptions.length * rowHeight, position: 'relative' }}>
            {virtualOptions.map((option, offset) => {
              const index = startIndex + offset;
              return (
                <FilterOptionRow
                  key={option.key}
                  option={option}
                  checked={selectedRef.current.has(option.key)}
                  focused={focusIndex === index}
                  top={index * rowHeight}
                  height={rowHeight}
                  onToggle={toggleValue}
                />
              );
            })}
            {!filteredOptions.length && <p className="px-2 py-3 text-center text-slate-400">No values</p>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" onClick={onClear} className="rounded bg-slate-100 px-3 py-1.5 font-bold text-slate-700">Clear</button>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded bg-white px-3 py-1.5 font-bold text-slate-600 ring-1 ring-slate-200">Cancel</button>
          <button type="button" onClick={apply} className="rounded bg-blue-600 px-3 py-1.5 font-bold text-white">Apply</button>
        </div>
      </div>
    </div>,
    document.body,
  );
});

function TableChecklistGrid({
  area,
  canEdit,
  canSubmitForReview,
  submitting,
  onReload,
  onActivityRefresh,
  onSubmitForReview,
}: {
  area: ProjectAreaAllocation;
  canEdit: boolean;
  canSubmitForReview: boolean;
  submitting: boolean;
  onReload: () => Promise<void>;
  onActivityRefresh: () => Promise<void>;
  onSubmitForReview: () => void;
}) {
  const [template, setTemplate] = useState<ChecklistTemplateDef | null>(null);
  const [rows, setRows] = useState<TableChecklistRow[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'question'>('table');
  const [expandedQuestionRowId, setExpandedQuestionRowId] = useState('');
  const [openEvidenceMenuRowId, setOpenEvidenceMenuRowId] = useState('');
  const [openEvidenceListRowId, setOpenEvidenceListRowId] = useState('');
  const [repositoryPicker, setRepositoryPicker] = useState<{ row: TableChecklistRow; mode: 'repository' | 'drive' } | null>(null);
  const [repositoryTree, setRepositoryTree] = useState<RepositoryPickerItem[]>([]);
  const [repositoryFolderId, setRepositoryFolderId] = useState<string | null>(null);
  const [repositorySearch, setRepositorySearch] = useState('');
  const [selectedRepositoryIds, setSelectedRepositoryIds] = useState<string[]>([]);
  const [repositoryLoading, setRepositoryLoading] = useState(false);
  const [repositoryError, setRepositoryError] = useState('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFolderStack, setDriveFolderStack] = useState<Array<{ id: string; name: string }>>([]);
  const [questionStatusFilter, setQuestionStatusFilter] = useState('');
  const [questionIsoFilter, setQuestionIsoFilter] = useState('');
  const [questionSectionFilter, setQuestionSectionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [globalSearchDraft, setGlobalSearchDraft] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [message, setMessage] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedCell, setSelectedCell] = useState<GridCellCoord | null>(null);
  const [editingCell, setEditingCell] = useState<GridCellCoord | null>(null);
  const [editInitialValue, setEditInitialValue] = useState<string | undefined>(undefined);
  const [columnFilters, setColumnFilters] = useState<Record<string, GridColumnFilter>>({});
  const [openFilterColumnId, setOpenFilterColumnId] = useState('');
  const [filterMenuPosition, setFilterMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [tableViewportHeight, setTableViewportHeight] = useState(560);
  const saveTimersRef = useRef<Record<string, number>>({});
  const pendingSavePatchesRef = useRef<Record<string, Partial<TableChecklistRow>>>({});
  const importRef = useRef<HTMLInputElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const loadTable = async () => {
    setLoading(true);
    try {
      const data = await apiJson(`/api/project-areas/${area.id}/table-checklist`);
      setTemplate(data.template);
      setRows(data.rows || []);
    } catch (err: any) {
      setMessage(err.message || 'Unable to load working paper table.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTable().catch(console.error);
  }, [area.id]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`auditie-checklist-filters:${area.id}`);
      setColumnFilters(stored ? normalizeStoredColumnFilters(JSON.parse(stored)) : {});
    } catch {
      setColumnFilters({});
    }
    setOpenFilterColumnId('');
    setFilterMenuPosition(null);
    setSelectedCell(null);
    setEditingCell(null);
  }, [area.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`auditie-checklist-filters:${area.id}`, JSON.stringify(columnFilters));
    } catch {
      // Local filter persistence is best-effort.
    }
  }, [area.id, columnFilters]);

  useEffect(() => () => {
    Object.values(saveTimersRef.current).forEach((timer) => window.clearTimeout(timer as number));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setGlobalFilter(globalSearchDraft), 150);
    return () => window.clearTimeout(timer);
  }, [globalSearchDraft]);

  useEffect(() => {
    setTableScrollTop(0);
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [globalFilter, columnFilters, sorting, viewMode]);

  const saveRow = async (row: TableChecklistRow, patch: Partial<TableChecklistRow>) => {
    const next = { ...row, ...patch, rowData: { ...row.rowData, ...(patch.rowData || {}) } };
    setRows((current) => current.map((item) => item.id === row.id ? next : item));
    const saved = await apiJson(`/api/table-rows/${row.id}`, {
      method: 'PUT',
      body: JSON.stringify({ rowData: next.rowData, status: next.status, comments: next.comments || '', observation: next.observation || '', evidenceLink: next.evidenceLink || '' }),
    });
    setRows((current) => current.map((item) => item.id === row.id ? saved : item));
    setMessage('Saved.');
    await onActivityRefresh();
  };

  const scheduleSaveRow = (row: TableChecklistRow, patch: Partial<TableChecklistRow>, delay = 500) => {
    const key = row.id;
    if (saveTimersRef.current[key]) window.clearTimeout(saveTimersRef.current[key]);
    pendingSavePatchesRef.current[key] = {
      ...(pendingSavePatchesRef.current[key] || {}),
      ...patch,
      rowData: {
        ...(pendingSavePatchesRef.current[key]?.rowData || {}),
        ...(patch.rowData || {}),
      },
    };
    setSaveState('saving');
    saveTimersRef.current[key] = window.setTimeout(() => {
      const pendingPatch = pendingSavePatchesRef.current[key] || {};
      delete pendingSavePatchesRef.current[key];
      apiJson(`/api/table-rows/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify(pendingPatch),
      })
        .then(() => {
          setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...pendingPatch, rowData: { ...item.rowData, ...(pendingPatch.rowData || {}) } } : item));
          setSaveState('saved');
          window.setTimeout(() => setSaveState('idle'), 1200);
        })
        .catch(() => {
          setSaveState('error');
          setMessage('Save failed. Edit again or retry.');
        });
    }, delay);
  };

  const addRow = async () => {
    const rowData = Object.fromEntries((template?.columns || []).map((column) => [column.columnKey, '']));
    const created = await apiJson(`/api/project-areas/${area.id}/table-rows`, {
      method: 'POST',
      body: JSON.stringify({ rowData, status: 'Pending', templateId: template?.id }),
    });
    setRows((current) => [...current, created]);
    setMessage('Row added.');
    await onReload();
  };

  const deleteRow = async (row: TableChecklistRow) => {
    if (!confirm('Delete this working paper row?')) return;
    await apiJson(`/api/table-rows/${row.id}`, { method: 'DELETE' });
    setRows((current) => current.filter((item) => item.id !== row.id));
    setMessage('Row deleted.');
    await onReload();
    await onActivityRefresh();
  };

  const uploadEvidence = async (row: TableChecklistRow, files: FileList | null) => {
    if (!files?.length) return;
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('files', file));
    if (template?.id) form.append('templateId', template.id);
    const res = await fetch(`/api/table-rows/${row.id}/evidence`, { method: 'POST', credentials: 'include', body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Evidence upload failed.');
      return;
    }
    await loadTable();
    await onReload();
    setMessage(`${files.length} evidence item(s) uploaded.`);
  };

  const deleteRowEvidence = async (evidenceId: string) => {
    if (!confirm('Remove this evidence link from the checklist row?')) return;
    await apiJson(`/api/row-evidence/${evidenceId}`, { method: 'DELETE' });
    await loadTable();
    await onReload();
    setMessage('Evidence removed.');
  };

  const linkRepositoryEvidence = async (row: TableChecklistRow, value: string, repositoryItemId?: string) => {
    const repositoryPath = value.trim();
    if (!repositoryPath) return;
    const data = await apiJson(`/api/table-rows/${row.id}/repository-evidence`, {
      method: 'POST',
      body: JSON.stringify({ repositoryPath, repositoryItemId }),
    });
    setRows((current) => current.map((item) => item.id === row.id ? data.row : item));
    setMessage('Repository evidence linked.');
    await onReload();
  };

  const flattenRepositoryItems = (items: RepositoryPickerItem[]): RepositoryPickerItem[] => {
    const flat: RepositoryPickerItem[] = [];
    const walk = (nodes: RepositoryPickerItem[]) => {
      nodes.forEach((node) => {
        flat.push(node);
        if (node.children?.length) walk(node.children);
      });
    };
    walk(items);
    return flat;
  };

  const findRepositoryItem = (items: RepositoryPickerItem[], itemId: string | null): RepositoryPickerItem | null => {
    if (!itemId) return null;
    for (const item of items) {
      if (item.id === itemId) return item;
      const child = findRepositoryItem(item.children || [], itemId);
      if (child) return child;
    }
    return null;
  };

  const filterRepositoryTreeForMode = (items: RepositoryPickerItem[], mode: 'repository' | 'drive'): RepositoryPickerItem[] => mode === 'repository' ? items : items
    .map((item) => ({ ...item, children: filterRepositoryTreeForMode(item.children || [], mode) }))
    .filter((item) => {
      const isDrive = item.source === 'gdrive';
      return isDrive || (item.children?.length || 0) > 0;
    });

  const repositoryItemsForCurrentFolder = () => {
    if (repositoryPicker?.mode === 'drive') {
      const term = repositorySearch.trim().toLowerCase();
      return term
        ? repositoryTree.filter((item) => [item.name, item.path, item.mimeType, item.source].join(' ').toLowerCase().includes(term))
        : repositoryTree;
    }
    const source = repositorySearch.trim()
      ? flattenRepositoryItems(repositoryTree).filter((item) => {
        const term = repositorySearch.trim().toLowerCase();
        return [item.name, item.path, item.mimeType, item.source].join(' ').toLowerCase().includes(term);
      })
      : (repositoryFolderId ? findRepositoryItem(repositoryTree, repositoryFolderId)?.children || [] : repositoryTree);
    return source;
  };

  const loadDriveFiles = async (parentId = 'root', search = '') => {
    setRepositoryLoading(true);
    setRepositoryError('');
    try {
      const params = new URLSearchParams();
      params.set('parentId', parentId);
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/repository/drive/files?${params.toString()}`, { credentials: 'include' });
      const data = await response.json().catch(() => []);
      if (response.status === 401 && data?.code === 'GOOGLE_DRIVE_RECONNECT_REQUIRED') {
        setDriveConnected(false);
        setRepositoryError(data.error || 'Google Drive connection expired. Please connect again.');
        setRepositoryTree([]);
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Unable to load Google Drive files');
      const mapped: RepositoryPickerItem[] = (Array.isArray(data) ? data : []).map((item: any) => {
        const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
        return {
          id: `drive:${item.id}`,
          name: item.name || 'Untitled',
          type: isFolder ? 'FOLDER' : 'FILE',
          parentId: parentId === 'root' ? null : `drive:${parentId}`,
          path: item.webViewLink || `https://drive.google.com/open?id=${item.id}`,
          mimeType: item.mimeType || null,
          size: item.size ? Number(item.size) : null,
          source: 'gdrive',
          externalId: item.id,
          webViewLink: item.webViewLink || `https://drive.google.com/open?id=${item.id}`,
          webContentLink: item.webContentLink || null,
          updatedAt: item.modifiedTime || undefined,
          children: [],
        };
      });
      setRepositoryTree(mapped);
    } catch (err: any) {
      setRepositoryError(err.message || 'Unable to load Google Drive files.');
      setRepositoryTree([]);
    } finally {
      setRepositoryLoading(false);
    }
  };

  const openDriveFolder = async (item?: RepositoryPickerItem) => {
    const nextId = item?.externalId || 'root';
    setRepositorySearch('');
    setSelectedRepositoryIds([]);
    setDriveFolderStack((current) => item ? [...current, { id: nextId, name: item.name }] : []);
    await loadDriveFiles(nextId);
  };

  const openRepositoryPicker = async (row: TableChecklistRow, mode: 'repository' | 'drive') => {
    setOpenEvidenceMenuRowId('');
    setRepositoryPicker({ row, mode });
    setRepositoryFolderId(null);
    setRepositorySearch('');
    setSelectedRepositoryIds([]);
    setRepositoryError('');
    setRepositoryLoading(true);
    setDriveFolderStack([]);
    try {
      const statusResponse = await fetch('/api/repository/drive/status', { credentials: 'include' });
      const connected = statusResponse.ok ? !!(await statusResponse.json())?.connected : false;
      setDriveConnected(connected);
      if (mode === 'drive' && !connected) {
        setRepositoryTree([]);
        return;
      }
      if (mode === 'drive') {
        await loadDriveFiles('root');
        return;
      }
      const response = await fetch('/api/repository', { credentials: 'include' });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.error || 'Unable to load repository');
      setRepositoryTree(filterRepositoryTreeForMode(Array.isArray(data) ? data : [], mode));
    } catch (err: any) {
      setRepositoryError(err.message || 'Unable to load repository picker.');
      setRepositoryTree([]);
    } finally {
      setRepositoryLoading(false);
    }
  };

  const connectGoogleDrive = async () => {
    const res = await fetch('/api/repository/drive/auth-url', { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || 'Unable to start Google Drive connection.');
    window.open(data.url, '_blank');
  };

  const confirmRepositorySelection = async () => {
    if (!repositoryPicker || selectedRepositoryIds.length === 0) return;
    const selected = flattenRepositoryItems(repositoryTree).filter((item) => selectedRepositoryIds.includes(item.id));
    for (const item of selected) {
      const repositoryPath = item.webViewLink || item.path || item.name;
      await apiJson(`/api/table-rows/${repositoryPicker.row.id}/repository-evidence`, {
        method: 'POST',
        body: JSON.stringify({
          repositoryPath,
          repositoryItemId: item.source === 'gdrive' && item.id.startsWith('drive:') ? null : item.id,
          fileName: item.name,
          filePath: item.webViewLink || item.path || repositoryPath,
          fileType: item.source === 'gdrive' ? 'google-drive' : 'repository-link',
        }),
      });
    }
    await loadTable();
    await onReload();
    setMessage(`${selected.length} evidence item(s) linked.`);
    setRepositoryPicker(null);
  };

  const createObservation = async (row: TableChecklistRow) => {
    const created = await apiJson(`/api/table-rows/${row.id}/observations`, {
      method: 'POST',
      body: JSON.stringify({
        description: row.observation || row.comments || 'Observation created from working paper row.',
        evidenceReference: row.evidenceLink || row.evidence?.[0]?.filePath || '',
      }),
    });
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, observation: created.description, status: item.status === 'Pending' ? 'Non-Compliant' : item.status } : item));
    setMessage('Observation created in Observation Register.');
    await onReload();
  };

  const importExcel = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/project-areas/${area.id}/table-import`, { method: 'POST', credentials: 'include', body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Import failed.');
      return;
    }
    await loadTable();
    await onReload();
    setMessage('Rows imported.');
    if (importRef.current) importRef.current.value = '';
  };

  const exportExcel = () => {
    window.location.href = `/api/project-areas/${area.id}/table-export${template?.id ? `?templateId=${encodeURIComponent(template.id)}` : ''}`;
  };

  const regenerateWorkingPaper = async () => {
    try {
      const result = await apiJson(`/api/project-areas/${area.id}/regenerate-working-papers`, { method: 'POST', body: JSON.stringify({}) });
      setMessage(`Regenerated ${result.createdPapers || 0} working paper(s) and ${result.createdRows || 0} row(s).`);
      await onReload();
      await loadTable();
    } catch (err: any) {
      setMessage(err.message || 'Unable to regenerate working paper.');
    }
  };

  const statusOptions = ['Pending', 'Compliant', 'Non-Compliant', 'Observation', 'Not Applicable'];

  const gridColumnDefs: GridColumnDef[] = useMemo(() => [
    ...(template?.columns || []).map((definition) => ({
      id: definition.columnKey,
      label: definition.columnName,
      kind: 'rowData' as const,
      columnKey: definition.columnKey,
      type: definition.columnType,
      options: definition.options,
      width: 280,
    })),
    { id: 'status', label: 'Status', kind: 'field', field: 'status', type: 'status', options: statusOptions, width: 180 },
    { id: 'comments', label: 'Comments', kind: 'field', field: 'comments', type: 'text', width: 240 },
    { id: 'observation', label: 'Observation', kind: 'field', field: 'observation', type: 'text', width: 260 },
    { id: 'evidenceLink', label: 'Repository Evidence Link', kind: 'field', field: 'evidenceLink', type: 'text', width: 260 },
  ], [template?.columns]);

  const sameCell = (a?: GridCellCoord | null, b?: GridCellCoord | null) => !!a && !!b && a.rowIndex === b.rowIndex && a.columnIndex === b.columnIndex;

  const getCellValue = (row: TableChecklistRow, column: GridColumnDef) => {
    if (column.kind === 'rowData') return String(row.rowData?.[column.columnKey || ''] ?? '');
    return String((row as any)[column.field || ''] ?? '');
  };

  const getCellFilterKey = useCallback((row: TableChecklistRow, column: GridColumnDef) => normalizeFilterOption(getCellValue(row, column)).key, []);

  const isAutoNumberColumn = (column: GridColumnDef) => /^(sr\.?\s*no\.?|srno|serial|s\.?\s*no\.?)$/i.test(column.label.trim()) || /^(srNo|serialNo)$/i.test(column.id);

  const filterForColumn = (columnId: string) => columnFilters[columnId] || null;

  const isFilterActive = (filter?: GridColumnFilter) => {
    if (!filter) return false;
    return Array.isArray(filter.values);
  };

  const uniqueColumnOptions = (column: GridColumnDef) => {
    const optionMap = new Map<string, GridFilterOption>();
    rows.forEach((row) => {
      try {
        const option = normalizeFilterOption(getCellValue(row, column));
        if (!optionMap.has(option.key)) optionMap.set(option.key, option);
      } catch {
        // Malformed row data should never break the filter menu.
      }
    });
    return Array.from(optionMap.values()).sort((a, b) => a.sortLabel.localeCompare(b.sortLabel, undefined, { numeric: true, sensitivity: 'base' }));
  };

  const uniqueColumnOptionsById = useMemo(() => {
    const next: Record<string, GridFilterOption[]> = {};
    gridColumnDefs.forEach((column) => {
      next[column.id] = uniqueColumnOptions(column);
    });
    return next;
  }, [rows, gridColumnDefs]);

  const yesNoNaColumnIds = useMemo(() => {
    const allowed = new Set(['yes', 'no', 'na', 'n/a', '']);
    return new Set(gridColumnDefs
      .filter((column) => {
        if (column.type === 'boolean') return true;
        if (column.options?.length) return column.options.every((option) => allowed.has(option.trim().toLowerCase()));
        if (column.kind !== 'rowData' || isAutoNumberColumn(column)) return false;
        const values = rows.map((row) => getCellValue(row, column).trim().toLowerCase());
        const nonBlank = values.filter(Boolean);
        return nonBlank.length > 0 && nonBlank.every((value) => allowed.has(value));
      })
      .map((column) => column.id));
  }, [gridColumnDefs, rows]);

  const visibleGridRows = useMemo(() => {
    const activeEntries = (Object.entries(columnFilters) as Array<[string, GridColumnFilter]>).filter(([, filter]) => isFilterActive(filter));
    if (!activeEntries.length) return rows;
    const columnsById = new Map(gridColumnDefs.map((column) => [column.id, column]));
    const selectedByColumn = new Map(activeEntries.map(([columnId, filter]) => [columnId, new Set(filter.values)]));
    return rows.filter((row) => activeEntries.every(([columnId, filter]) => {
      const column = columnsById.get(columnId);
      const selected = selectedByColumn.get(columnId);
      return column && selected ? selected.has(getCellFilterKey(row, column)) : true;
    }));
  }, [rows, columnFilters, gridColumnDefs, getCellFilterKey]);

  const clearColumnFilter = (columnId: string) => {
    setColumnFilters((current) => {
      const next = { ...current };
      delete next[columnId];
      return next;
    });
  };

  const activeFilterChips = (Object.entries(columnFilters) as Array<[string, GridColumnFilter]>)
    .filter(([, filter]) => isFilterActive(filter))
    .map(([columnId, filter]) => {
      const column = gridColumnDefs.find((item) => item.id === columnId);
      const labelByKey = new Map((uniqueColumnOptionsById[columnId] || []).map((option) => [option.key, option.label]));
      const labels = filter.values.map((value) => labelByKey.get(value) || normalizeFilterOption(value).label);
      const value = labels.length ? labels.slice(0, 3).join(', ') + (labels.length > 3 ? ` +${labels.length - 3}` : '') : 'No values selected';
      return { columnId, label: column?.label || columnId, value };
    });

  const patchForCell = (column: GridColumnDef, value: string): Partial<TableChecklistRow> => {
    if (column.kind === 'rowData') return { rowData: { [column.columnKey || column.id]: value } };
    return { [column.field || column.id]: value } as Partial<TableChecklistRow>;
  };

  const mergeRowPatch = (row: TableChecklistRow, patch: Partial<TableChecklistRow>) => ({
    ...row,
    ...patch,
    rowData: { ...row.rowData, ...(patch.rowData || {}) },
  });

  const moveCell = (from: GridCellCoord, direction: 'up' | 'down' | 'left' | 'right' | 'next' | 'previous', edit = false) => {
    if (!visibleGridRows.length || !gridColumnDefs.length) return;
    const currentRow = rows[from.rowIndex];
    const visibleIndex = Math.max(0, visibleGridRows.findIndex((row) => row.id === currentRow?.id));
    let nextVisibleIndex = visibleIndex;
    const next = { ...from };
    if (direction === 'up') nextVisibleIndex -= 1;
    if (direction === 'down') nextVisibleIndex += 1;
    if (direction === 'left') next.columnIndex -= 1;
    if (direction === 'right') next.columnIndex += 1;
    if (direction === 'next') {
      next.columnIndex += 1;
      if (next.columnIndex >= gridColumnDefs.length) {
        next.columnIndex = 0;
        nextVisibleIndex += 1;
      }
    }
    if (direction === 'previous') {
      next.columnIndex -= 1;
      if (next.columnIndex < 0) {
        next.columnIndex = gridColumnDefs.length - 1;
        nextVisibleIndex -= 1;
      }
    }
    nextVisibleIndex = Math.max(0, Math.min(visibleGridRows.length - 1, nextVisibleIndex));
    const nextRow = visibleGridRows[nextVisibleIndex];
    next.rowIndex = Math.max(0, rows.findIndex((row) => row.id === nextRow?.id));
    next.columnIndex = Math.max(0, Math.min(gridColumnDefs.length - 1, next.columnIndex));
    setEditingCell(null);
    setEditInitialValue(undefined);
    setSelectedCell(next);
    if (edit && canEdit && !isAutoNumberColumn(gridColumnDefs[next.columnIndex])) {
      window.setTimeout(() => beginEdit(next), 0);
    }
  };

  const applyCellValue = (rowIndex: number, columnIndex: number, value: string, immediate = false) => {
    const row = rows[rowIndex];
    const column = gridColumnDefs[columnIndex];
    if (!row || !column || !canEdit) return;
    if (isAutoNumberColumn(column)) return;
    if (getCellValue(row, column) === value) return;
    const patch = patchForCell(column, value);
    setRows((current) => current.map((item) => item.id === row.id ? mergeRowPatch(item, patch) : item));
    scheduleSaveRow(row, patch, immediate ? 0 : 500);
  };

  const beginEdit = (coord: GridCellCoord, initialValue?: string) => {
    const row = rows[coord.rowIndex];
    const column = gridColumnDefs[coord.columnIndex];
    if (!row || !column || !canEdit) return;
    if (isAutoNumberColumn(column)) return;
    setSelectedCell(coord);
    setEditingCell(coord);
    setEditInitialValue(initialValue);
  };

  const renderGridCell = (row: TableChecklistRow, rowIndex: number, column: GridColumnDef) => {
    const columnIndex = gridColumnDefs.findIndex((item) => item.id === column.id);
    if (columnIndex < 0) return null;
    const sourceRowIndex = rows.findIndex((item) => item.id === row.id);
    if (sourceRowIndex < 0) return null;
    const coord = { rowIndex: sourceRowIndex, columnIndex };
    const cellCanEdit = canEdit && !isAutoNumberColumn(column);
    return (
      <SimpleEditableGridCell
        value={getCellValue(row, column)}
        initialValue={sameCell(editingCell, coord) ? editInitialValue : undefined}
        label={`${column.label} row ${rowIndex + 1}`}
        selected={sameCell(selectedCell, coord)}
        editing={sameCell(editingCell, coord)}
        canEdit={cellCanEdit}
        type={column.type}
        options={yesNoNaColumnIds.has(column.id) ? ['Yes', 'No', 'NA'] : column.options}
        density={density}
        onSelect={() => {
          setSelectedCell(coord);
          if (!sameCell(editingCell, coord)) {
            setEditingCell(null);
            setEditInitialValue(undefined);
          }
        }}
        onEdit={(initialValue) => beginEdit(coord, initialValue)}
        onCommit={(value, immediate) => {
          applyCellValue(sourceRowIndex, columnIndex, value, immediate);
          setEditingCell(null);
          setEditInitialValue(undefined);
        }}
        onCancel={() => {
          if (sameCell(editingCell, coord)) {
            setEditingCell(null);
            setEditInitialValue(undefined);
          } else {
            setSelectedCell(null);
          }
        }}
        onMove={(direction) => moveCell(coord, direction)}
      />
    );
  };

  const columns = useMemo(() => [
    ...(template?.columns || []).map((definition) => tableChecklistColumnHelper.accessor((row) => row.rowData?.[definition.columnKey] ?? '', {
      id: definition.columnKey,
      header: definition.columnName,
      cell: ({ row, getValue }) => {
        const value = String(getValue() ?? '');
        if (!canEdit) return <span className="block w-[280px] overflow-hidden text-xs font-semibold leading-snug text-slate-700 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]" title={value || '-'}>{value || '-'}</span>;
        const gridColumn = gridColumnDefs.find((item) => item.id === definition.columnKey);
        return gridColumn ? renderGridCell(row.original, row.index, gridColumn) : null;
      },
    })),
    tableChecklistColumnHelper.accessor('status', {
      header: 'Status',
      cell: ({ row, getValue }) => canEdit ? renderGridCell(row.original, row.index, gridColumnDefs.find((item) => item.id === 'status')!) : <span>{String(getValue())}</span>,
    }),
    tableChecklistColumnHelper.accessor('comments', {
      header: 'Comments',
      cell: ({ row, getValue }) => canEdit
        ? renderGridCell(row.original, row.index, gridColumnDefs.find((item) => item.id === 'comments')!)
        : <span className="block w-[240px] overflow-hidden text-xs leading-snug text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]" title={String(getValue() || '-')}>{String(getValue() || '-')}</span>,
    }),
    tableChecklistColumnHelper.accessor('observation', {
      header: 'Observation',
      cell: ({ row, getValue }) => canEdit
        ? renderGridCell(row.original, row.index, gridColumnDefs.find((item) => item.id === 'observation')!)
        : <span className="block w-[260px] overflow-hidden text-xs leading-snug text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]" title={String(getValue() || '-')}>{String(getValue() || '-')}</span>,
    }),
    tableChecklistColumnHelper.accessor('evidenceLink', {
      header: 'Repository Evidence Link',
      cell: ({ row, getValue }) => canEdit
        ? renderGridCell(row.original, row.index, gridColumnDefs.find((item) => item.id === 'evidenceLink')!)
        : <span className="block w-[260px] truncate text-xs text-blue-700" title={String(getValue() || '-')}>{String(getValue() || '-')}</span>,
    }),
    tableChecklistColumnHelper.display({
      id: 'evidence',
      header: 'Evidence',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{row.original.evidence?.length || 0}</span>
          {canEdit && (
            <label className="cursor-pointer rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">
              <Paperclip className="inline h-3 w-3" />
              <input type="file" className="hidden" onChange={(event) => uploadEvidence(row.original, event.target.files)} />
            </label>
          )}
        </div>
      ),
    }),
    tableChecklistColumnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => canEdit ? (
        <div className="flex gap-2">
          <button onClick={() => createObservation(row.original).catch(console.error)} className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Create Observation</button>
          <button onClick={() => deleteRow(row.original)} className="rounded bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">Delete</button>
        </div>
      ) : null,
    }),
  ], [template?.columns, canEdit, gridColumnDefs, renderGridCell, uploadEvidence, createObservation, deleteRow]);

  const rowQuestionTitle = (row: TableChecklistRow, index: number) => {
    const data = row.rowData || {};
    return String(data.auditCheck || data.whatToCheck || data.needToCheck || data.pointsToCheck || data.areasSpecificCheck || data.securityElements || data.process || data.controlArea || data.areas || `Checklist Row ${index + 1}`);
  };

  const rowField = (row: TableChecklistRow, keys: string[]) => {
    const data = row.rowData || {};
    const key = keys.find((candidate) => data[candidate] !== undefined && String(data[candidate] || '').trim());
    return key ? String(data[key] || '') : '';
  };

  const rowIsoClause = (row: TableChecklistRow) => rowField(row, ['iSOClause', 'iSOControl', 'isoControl', 'isoClause', 'iSO270012022Reference']);
  const rowReviewSection = (row: TableChecklistRow) => rowField(row, ['controlArea', 'controlCategory', 'areas', 'process', 'reviewSection']);
  const rowNeedToCheck = (row: TableChecklistRow, index: number) => rowField(row, ['auditCheck', 'whatToCheck', 'needToCheck', 'pointsToCheck', 'areasSpecificCheck', 'securityElements']) || rowQuestionTitle(row, index);
  const rowEvidenceExpected = (row: TableChecklistRow) => rowField(row, ['evidenceExpected', 'expectedConfiguration', 'whereToCheck', 'verificationMethod', 'fileName']);

  const auditStatusClass = (status?: string) => {
    const normalized = String(status || 'Pending').toLowerCase();
    if (normalized.includes('compliant') && !normalized.includes('non')) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    if (normalized.includes('non')) return 'bg-rose-50 text-rose-700 ring-rose-200';
    if (normalized.includes('observation')) return 'bg-amber-50 text-amber-700 ring-amber-200';
    if (normalized.includes('not applicable')) return 'bg-blue-50 text-blue-700 ring-blue-200';
    return 'bg-slate-50 text-slate-600 ring-slate-200';
  };

  const auditStatusSelectClass = (status?: string) => cn(
    'h-8 w-fit rounded-md border px-2.5 text-xs font-bold outline-none transition disabled:cursor-not-allowed disabled:opacity-70',
    auditStatusClass(status).replaceAll('ring-', 'border-').replace('ring-1', ''),
  );

  const auditStatusChip = (status?: string) => (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1', auditStatusClass(status))}>{status || 'Pending'}</span>
  );

  const table = useReactTable({
    data: visibleGridRows,
    columns,
    state: { globalFilter, sorting, columnOrder, columnSizing },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const shouldVirtualizeRows = tableRows.length > 200;
  const virtualRowHeight = density === 'compact' ? 56 : 96;
  const virtualOverscan = 8;
  const virtualStartIndex = shouldVirtualizeRows ? Math.max(0, Math.floor(tableScrollTop / virtualRowHeight) - virtualOverscan) : 0;
  const virtualVisibleCount = shouldVirtualizeRows ? Math.ceil(tableViewportHeight / virtualRowHeight) + (virtualOverscan * 2) : tableRows.length;
  const virtualEndIndex = shouldVirtualizeRows ? Math.min(tableRows.length, virtualStartIndex + virtualVisibleCount) : tableRows.length;
  const renderedTableRows = shouldVirtualizeRows ? tableRows.slice(virtualStartIndex, virtualEndIndex) : tableRows;
  const virtualTopSpacer = shouldVirtualizeRows ? virtualStartIndex * virtualRowHeight : 0;
  const virtualBottomSpacer = shouldVirtualizeRows ? Math.max(0, (tableRows.length - virtualEndIndex) * virtualRowHeight) : 0;

  const questionBaseRows = table.getFilteredRowModel().rows;
  const questionIsoOptions = Array.from(new Set(rows.map(rowIsoClause).filter(Boolean))).sort();
  const questionSectionOptions = Array.from(new Set(rows.map(rowReviewSection).filter(Boolean))).sort();
  const questionRows = questionBaseRows.filter((row) => {
    const item = row.original as TableChecklistRow;
    return (!questionStatusFilter || item.status === questionStatusFilter)
      && (!questionIsoFilter || rowIsoClause(item) === questionIsoFilter)
      && (!questionSectionFilter || rowReviewSection(item) === questionSectionFilter);
  });
  const reviewedCount = rows.filter((row) => row.status !== 'Pending').length;
  const compliantCount = rows.filter((row) => row.status === 'Compliant').length;
  const observationCount = rows.filter((row) => row.observation || row.status === 'Non-Compliant').length;
  const pendingCount = rows.filter((row) => row.status === 'Pending').length;
  const visibleRepositoryItems = repositoryItemsForCurrentFolder();
  const selectedRepositoryItem = flattenRepositoryItems(repositoryTree).find((item) => selectedRepositoryIds.includes(item.id)) || null;
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const completedRowsLabel = reviewedCount ? `${reviewedCount} of ${rows.length} completed` : `${filteredRowCount} rows`;

  return (
    <div className="overflow-hidden border border-slate-200 bg-white">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2 lg:flex-nowrap">
          <div className="flex rounded border border-slate-200 bg-slate-50 p-0.5">
            <button type="button" onClick={() => setViewMode('table')} className={cn('rounded px-2.5 py-1 text-[11px] font-bold', viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-600')}>Table View</button>
            <button type="button" onClick={() => setViewMode('question')} className={cn('rounded px-2.5 py-1 text-[11px] font-bold', viewMode === 'question' ? 'bg-blue-600 text-white' : 'text-slate-600')}>Question View</button>
          </div>
          {viewMode === 'table' && <input className={cn(inputClass, 'h-8 w-52 px-2 py-1 text-xs')} value={globalSearchDraft} onChange={(event) => setGlobalSearchDraft(event.target.value)} placeholder="Search rows..." />}
          {viewMode === 'table' && (
            <div className="flex rounded border border-slate-200 bg-white p-0.5">
              {(['compact', 'comfortable'] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setDensity(mode)} className={cn('rounded px-2 py-1 text-[10px] font-bold capitalize', density === mode ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50')}>
                  {mode}
                </button>
              ))}
            </div>
          )}
          {canEdit && <button onClick={addRow} className="rounded bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white"><Plus className="inline h-3.5 w-3.5" /> Add Row</button>}
          {canEdit && <label className="cursor-pointer rounded bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700"><Upload className="inline h-3.5 w-3.5" /> Import<input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => importExcel(event.target.files)} /></label>}
          <button onClick={exportExcel} className="rounded bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700"><Download className="inline h-3.5 w-3.5" /> Export</button>
          {canEdit && <button disabled={submitting || !canSubmitForReview} onClick={onSubmitForReview} className="ml-auto rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit for Review'}</button>}
      </div>
      {message && <div className="border-b border-slate-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">{message}</div>}
      {viewMode === 'table' && openFilterColumnId && (() => {
        const gridColumn = gridColumnDefs.find((column) => column.id === openFilterColumnId);
        return gridColumn && filterMenuPosition ? (
          <FilterPopup
            column={gridColumn}
            options={uniqueColumnOptionsById[gridColumn.id] || []}
            appliedFilter={filterForColumn(gridColumn.id)}
            position={filterMenuPosition}
            onApply={(filter, sortDesc) => {
              setColumnFilters((current) => {
                const next = { ...current };
                if (filter && isFilterActive(filter)) next[gridColumn.id] = filter;
                else delete next[gridColumn.id];
                return next;
              });
              if (sortDesc !== null) setSorting([{ id: gridColumn.id, desc: sortDesc }]);
              setOpenFilterColumnId('');
              setFilterMenuPosition(null);
            }}
            onClear={() => {
              clearColumnFilter(gridColumn.id);
              setOpenFilterColumnId('');
              setFilterMenuPosition(null);
            }}
            onCancel={() => {
              setOpenFilterColumnId('');
              setFilterMenuPosition(null);
            }}
          />
        ) : null;
      })()}
      {viewMode === 'table' && activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">
          {activeFilterChips.map((chip) => (
            <button key={chip.columnId} type="button" onClick={() => clearColumnFilter(chip.columnId)} className="rounded-full bg-white px-3 py-1 text-blue-700 ring-1 ring-blue-100">
              {chip.label}: {chip.value} x
            </button>
          ))}
          <button type="button" onClick={() => setColumnFilters({})} className="rounded px-2 py-1 text-slate-500 hover:bg-white">Clear All Filters</button>
        </div>
      )}
      {viewMode === 'table' && saveState !== 'idle' && (
        <div className={cn('border-b px-4 py-2 text-xs font-bold', saveState === 'error' ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-slate-100 bg-slate-50 text-slate-600')}>
          {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save failed'}
        </div>
      )}
      {!loading && rows.length === 0 && canEdit && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          No checklist rows generated. <button onClick={regenerateWorkingPaper} className="ml-2 rounded bg-amber-600 px-3 py-1.5 text-xs text-white">Regenerate Working Paper</button>
        </div>
      )}
      {viewMode === 'question' && (
        <div className="border-b border-slate-100 bg-white p-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <Metric label="Controls" value={rows.length} />
            <Metric label="Reviewed" value={reviewedCount} />
            <Metric label="Compliant" value={compliantCount} />
            <Metric label="Observations" value={observationCount} />
            <Metric label="Pending" value={pendingCount} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_220px_220px]">
            <input className={inputClass} value={globalSearchDraft} onChange={(event) => setGlobalSearchDraft(event.target.value)} placeholder="Search controls..." />
            <select className={inputClass} value={questionStatusFilter} onChange={(event) => setQuestionStatusFilter(event.target.value)}>
              <option value="">All Statuses</option>
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select className={inputClass} value={questionIsoFilter} onChange={(event) => setQuestionIsoFilter(event.target.value)}>
              <option value="">All ISO Clauses</option>
              {questionIsoOptions.map((clause) => <option key={clause} value={clause}>{clause}</option>)}
            </select>
            <select className={inputClass} value={questionSectionFilter} onChange={(event) => setQuestionSectionFilter(event.target.value)}>
              <option value="">All Review Sections</option>
              {questionSectionOptions.map((section) => <option key={section} value={section}>{section}</option>)}
            </select>
          </div>
        </div>
      )}
      {viewMode === 'question' ? (
        <div className="max-h-[68vh] overflow-auto">
          {loading ? (
            <p className="py-10 text-center text-sm font-bold text-slate-500">Loading checklist...</p>
          ) : questionRows.length === 0 ? (
            <p className="py-10 text-center text-sm font-bold text-slate-500">No rows yet. Add a row or import Excel.</p>
          ) : questionRows.map((row, index) => {
            const questionRow = row.original as TableChecklistRow;
            const expanded = expandedQuestionRowId === questionRow.id;
            return (
            <div key={row.id} className="border-b border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => setExpandedQuestionRowId(expanded ? '' : questionRow.id)}
                className="grid min-h-11 w-full grid-cols-[22px_1fr_auto_auto] items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 md:grid-cols-[22px_1fr_260px_auto_auto]"
              >
                <span className="text-xs font-black text-slate-400">{expanded ? 'v' : '>'}</span>
                <span className="min-w-0 truncate text-sm font-bold text-slate-900">{rowQuestionTitle(questionRow, index)}</span>
                <span className="hidden min-w-0 truncate text-xs font-semibold text-slate-500 md:block">{rowIsoClause(questionRow) || rowReviewSection(questionRow) || '-'}</span>
                {auditStatusChip(questionRow.status)}
                <span className="shrink-0 text-[10px] font-bold uppercase text-slate-500">{questionRow.evidence?.length || 0} Evidence</span>
              </button>
              {expanded && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
                    <div className="rounded-md border border-slate-200 bg-white p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Audit Requirement</p>
                      <h4 className="mt-1 text-sm font-extrabold text-slate-950">{rowQuestionTitle(questionRow, index)}</h4>
                      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Area</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-700">{rowReviewSection(questionRow) || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ISO Reference</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-700">{rowIsoClause(questionRow) || '-'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Need To Check</p>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm font-semibold leading-snug text-slate-800">{rowNeedToCheck(questionRow, index)}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Evidence Expected</p>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm font-semibold leading-snug text-slate-700">{rowEvidenceExpected(questionRow) || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Auditor Input</p>
                      <div className="mt-2 flex items-center gap-2">
                          <select disabled={!canEdit} className={auditStatusSelectClass(questionRow.status)} value={questionRow.status} onChange={(event) => saveRow(questionRow, { status: event.target.value as TableChecklistRow['status'] }).catch(console.error)}>
                            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                          <div className="relative">
                            <button type="button" disabled={!canEdit} onClick={() => setOpenEvidenceMenuRowId(openEvidenceMenuRowId === questionRow.id ? '' : questionRow.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40" title="Attach evidence">
                              <Paperclip className="h-4 w-4" />
                            </button>
                            {openEvidenceMenuRowId === questionRow.id && (
                              <div className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-slate-200 bg-white py-1 text-xs font-bold text-slate-700 shadow-lg">
                                <button type="button" onClick={() => openRepositoryPicker(questionRow, 'repository').catch(console.error)} className="block w-full px-3 py-2 text-left hover:bg-slate-50">Browse from Repository</button>
                                <label className="block cursor-pointer px-3 py-2 hover:bg-slate-50">
                                  Upload file from Device
                                  <input type="file" multiple className="hidden" onChange={(event) => { uploadEvidence(questionRow, event.target.files).catch(console.error); setOpenEvidenceMenuRowId(''); event.currentTarget.value = ''; }} />
                                </label>
                                <label className="block cursor-pointer px-3 py-2 hover:bg-slate-50">
                                  Upload folder from Device
                                  <input type="file" multiple className="hidden" {...({ webkitdirectory: '', directory: '' } as any)} onChange={(event) => { uploadEvidence(questionRow, event.target.files).catch(console.error); setOpenEvidenceMenuRowId(''); event.currentTarget.value = ''; }} />
                                </label>
                                <button type="button" onClick={() => openRepositoryPicker(questionRow, 'drive').catch(console.error)} className="block w-full px-3 py-2 text-left hover:bg-slate-50">Get from Google Drive</button>
                              </div>
                            )}
                          </div>
                          {canEdit && <button type="button" onClick={() => deleteRow(questionRow)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100" title="Delete row"><Trash2 className="h-4 w-4" /></button>}
                          <div className="relative ml-auto">
                            <button type="button" onClick={() => setOpenEvidenceListRowId(openEvidenceListRowId === questionRow.id ? '' : questionRow.id)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-50">
                              <Paperclip className="h-3.5 w-3.5" /> {questionRow.evidence?.length || 0}
                            </button>
                            {openEvidenceListRowId === questionRow.id && (
                              <div className="absolute right-0 z-20 mt-1 w-80 rounded-md border border-slate-200 bg-white p-2 text-xs shadow-lg">
                                {questionRow.evidence?.length ? questionRow.evidence.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50">
                                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-bold text-slate-800">{item.fileName}</p>
                                      <p className="text-[10px] font-semibold uppercase text-slate-400">{item.fileType === 'google-drive' ? 'Google Drive' : item.fileType === 'repository-link' ? (item.filePath?.includes('drive.google') || item.filePath?.includes('google') ? 'Google Drive' : 'Repository') : 'Device'}</p>
                                    </div>
                                    <a href={item.filePath} target="_blank" rel="noreferrer" className="font-bold text-blue-700">Open</a>
                                    {canEdit && <button type="button" onClick={() => deleteRowEvidence(item.id).catch(console.error)} className="font-bold text-rose-600">Remove</button>}
                                  </div>
                                )) : <p className="px-2 py-3 text-center font-semibold text-slate-500">No evidence linked.</p>}
                              </div>
                            )}
                          </div>
                      </div>
                      <div className="mt-3 space-y-2.5">
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Observation</span>
                            {canEdit && <button onClick={() => createObservation(questionRow).catch(console.error)} className="rounded bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700">Create Observation</button>}
                          </div>
                          <textarea disabled={!canEdit} className={cn(textareaClass, 'min-h-20')} defaultValue={questionRow.observation || ''} onBlur={(event) => saveRow(questionRow, { observation: event.currentTarget.value }).catch(console.error)} />
                        </div>
                        <Field label="Comments"><textarea disabled={!canEdit} className={cn(textareaClass, 'min-h-16')} defaultValue={questionRow.comments || ''} onBlur={(event) => saveRow(questionRow, { comments: event.currentTarget.value }).catch(console.error)} /></Field>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );})}
        </div>
      ) : (
      <div
        ref={tableScrollRef}
        className="h-[calc(100vh-292px)] min-h-[520px] overflow-auto"
        onScroll={(event) => {
          setTableScrollTop(event.currentTarget.scrollTop);
          setTableViewportHeight(event.currentTarget.clientHeight || 560);
        }}
      >
        <table className="w-max min-w-full border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 shadow-[0_1px_0_0_rgba(203,213,225,1)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, headerIndex) => (
                  <th key={header.id} style={{ width: header.getSize() }} className={cn('relative max-w-[360px] whitespace-normal break-words border-b border-r border-slate-200 px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 last:border-r-0', headerIndex === 0 && 'sticky left-0 z-20 bg-slate-50')}>
                    <div className="flex items-center gap-1.5">
                      {gridColumnDefs.some((column) => column.id === header.column.id) && (
                        <span className="relative">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              const rect = event.currentTarget.getBoundingClientRect();
                              const width = 288;
                              const height = 420;
                              const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left));
                              const top = Math.max(12, Math.min(window.innerHeight - height - 12, rect.bottom + 8));
                              if (openFilterColumnId === header.column.id) {
                                setOpenFilterColumnId('');
                                setFilterMenuPosition(null);
                              } else {
                                setFilterMenuPosition({ top, left });
                                setOpenFilterColumnId(header.column.id);
                              }
                            }}
                            className={cn('relative rounded p-1 hover:bg-white', isFilterActive(columnFilters[header.column.id]) ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700')}
                            title={`Filter ${String(header.column.columnDef.header || header.column.id)}`}
                          >
                            <Filter className="h-3.5 w-3.5" />
                            {isFilterActive(columnFilters[header.column.id]) && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-blue-600" />}
                          </button>
                        </span>
                      )}
                      <button type="button" onClick={header.column.getToggleSortingHandler()} className="min-w-0 flex-1 truncate text-left">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                      </button>
                    </div>
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none bg-transparent hover:bg-blue-300"
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm font-bold text-slate-500">Loading working paper...</td></tr>
            ) : tableRows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm font-bold text-slate-500">No rows yet. Add a row or import Excel.</td></tr>
            ) : (
              <>
                {virtualTopSpacer > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={columns.length} style={{ height: virtualTopSpacer }} className="border-0 p-0" />
                  </tr>
                )}
                {renderedTableRows.map((row) => (
                  <tr key={row.id} className="odd:bg-white even:bg-slate-50/70 hover:bg-blue-50/40">
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <td key={cell.id} className={cn('border-b border-r border-slate-100 align-top last:border-r-0', density === 'compact' ? 'px-2 py-1.5' : 'px-3 py-3', cellIndex === 0 && 'sticky left-0 z-[1] bg-white')}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
                {virtualBottomSpacer > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={columns.length} style={{ height: virtualBottomSpacer }} className="border-0 p-0" />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
      )}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500">
        <span>{viewMode === 'question' ? `${questionRows.length} controls` : completedRowsLabel}</span>
        {viewMode === 'table' && filteredRowCount !== rows.length && <span>{filteredRowCount} filtered</span>}
      </div>
      {repositoryPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="flex max-h-[86vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="font-extrabold text-slate-950">{repositoryPicker.mode === 'drive' ? 'Google Drive Picker' : 'Repository Picker'}</h3>
                <p className="text-xs font-semibold text-slate-500">Select one or more files/folders to link as row evidence.</p>
              </div>
              <button type="button" onClick={() => setRepositoryPicker(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {repositoryPicker.mode === 'drive' && !driveConnected ? (
              <div className="p-8 text-center">
                <h4 className="text-lg font-extrabold text-slate-950">Google Drive is not connected</h4>
                <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">Connect Google Drive, finish OAuth in the new tab, then return here and refresh the picker.</p>
                <div className="mt-5 flex justify-center gap-2">
                  <button type="button" onClick={() => connectGoogleDrive().catch((err) => setRepositoryError(err.message || 'Unable to connect Drive'))} className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white">Connect Google Drive</button>
                  <button type="button" onClick={() => openRepositoryPicker(repositoryPicker.row, 'drive').catch(console.error)} className="rounded bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">Refresh</button>
                </div>
                {repositoryError && <p className="mt-3 text-xs font-bold text-rose-600">{repositoryError}</p>}
              </div>
            ) : (
              <>
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-[220px_1fr_280px]">
                  <aside className="border-b border-slate-200 p-3 md:border-b-0 md:border-r">
                    <button
                      type="button"
                      onClick={() => repositoryPicker.mode === 'drive' ? openDriveFolder().catch(console.error) : setRepositoryFolderId(null)}
                      className={cn('mb-2 w-full rounded px-3 py-2 text-left text-xs font-bold', (!repositoryFolderId && driveFolderStack.length === 0) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50')}
                    >
                      {repositoryPicker.mode === 'drive' ? 'My Drive' : 'All folders'}
                    </button>
                    {repositoryPicker.mode === 'drive' && driveFolderStack.length > 0 && (
                      <div className="mb-3 space-y-1 border-b border-slate-100 pb-3">
                        {driveFolderStack.map((folder, folderIndex) => (
                          <button
                            key={`${folder.id}-${folderIndex}`}
                            type="button"
                            onClick={async () => {
                              const nextStack = driveFolderStack.slice(0, folderIndex + 1);
                              setDriveFolderStack(nextStack);
                              setSelectedRepositoryIds([]);
                              setRepositorySearch('');
                              await loadDriveFiles(folder.id);
                            }}
                            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-xs font-bold text-blue-700 hover:bg-blue-50"
                          >
                            <Folder className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{folder.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="max-h-[48vh] overflow-auto space-y-1">
                      {flattenRepositoryItems(repositoryTree).filter((item) => item.type === 'FOLDER').map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => repositoryPicker.mode === 'drive' ? openDriveFolder(item).catch(console.error) : (setRepositoryFolderId(item.id), setRepositorySearch(''))}
                          className={cn('flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-bold', repositoryFolderId === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50')}
                        >
                          <Folder className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </aside>

                  <main className="min-h-0 border-b border-slate-200 p-3 md:border-b-0 md:border-r">
                    <div className="mb-3 flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          className={cn(inputClass, 'pl-9')}
                          value={repositorySearch}
                          onChange={(event) => setRepositorySearch(event.target.value)}
                          onKeyDown={(event) => {
                            if (repositoryPicker.mode === 'drive' && event.key === 'Enter') {
                              loadDriveFiles(driveFolderStack[driveFolderStack.length - 1]?.id || 'root', repositorySearch).catch(console.error);
                            }
                          }}
                          placeholder={repositoryPicker.mode === 'drive' ? 'Search Google Drive...' : 'Search files and folders...'}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => repositoryPicker.mode === 'drive'
                          ? loadDriveFiles(driveFolderStack[driveFolderStack.length - 1]?.id || 'root', repositorySearch).catch(console.error)
                          : openRepositoryPicker(repositoryPicker.row, repositoryPicker.mode).catch(console.error)}
                        className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                      >
                        <RefreshCw className="inline h-3.5 w-3.5" /> {repositoryPicker.mode === 'drive' && repositorySearch.trim() ? 'Search' : 'Refresh'}
                      </button>
                    </div>
                    {repositoryError && <p className="mb-2 rounded bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{repositoryError}</p>}
                    <div className="max-h-[52vh] overflow-auto rounded border border-slate-200">
                      {repositoryLoading ? (
                        <p className="p-8 text-center text-sm font-bold text-slate-500">Loading picker...</p>
                      ) : visibleRepositoryItems.length === 0 ? (
                        <p className="p-8 text-center text-sm font-bold text-slate-500">No files or folders found.</p>
                      ) : visibleRepositoryItems.map((item) => (
                        <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={selectedRepositoryIds.includes(item.id)}
                            onChange={(event) => setSelectedRepositoryIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}
                          />
                          {item.type === 'FOLDER' ? <Folder className="h-4 w-4 shrink-0 text-amber-500" /> : <FileText className="h-4 w-4 shrink-0 text-slate-500" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">{item.name}</p>
                            <p className="truncate text-[10px] font-semibold uppercase text-slate-400">{item.source === 'gdrive' ? 'Google Drive' : 'Repository'} / {item.type}</p>
                          </div>
                          {item.type === 'FOLDER' && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                repositoryPicker.mode === 'drive' ? openDriveFolder(item).catch(console.error) : (setRepositoryFolderId(item.id), setRepositorySearch(''));
                              }}
                              className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700"
                            >
                              Open
                            </button>
                          )}
                        </label>
                      ))}
                    </div>
                  </main>

                  <aside className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preview</p>
                    {selectedRepositoryItem ? (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          {selectedRepositoryItem.type === 'FOLDER' ? <Folder className="h-5 w-5 text-amber-500" /> : <FileText className="h-5 w-5 text-slate-500" />}
                          <p className="min-w-0 truncate font-extrabold text-slate-950">{selectedRepositoryItem.name}</p>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">Source: {selectedRepositoryItem.source === 'gdrive' ? 'Google Drive' : 'Repository'}</p>
                        <p className="break-words text-xs font-semibold text-slate-500">Path: {selectedRepositoryItem.path || selectedRepositoryItem.name}</p>
                        <p className="text-xs font-semibold text-slate-500">Type: {selectedRepositoryItem.type}</p>
                        {selectedRepositoryItem.type === 'FILE' && <a href={selectedRepositoryItem.source === 'gdrive' ? (selectedRepositoryItem.webViewLink || selectedRepositoryItem.path || '#') : `/api/repository/${selectedRepositoryItem.id}/download`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"><ExternalLink className="h-3.5 w-3.5" /> Preview/Open</a>}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm font-semibold text-slate-500">Select an item to preview details.</p>
                    )}
                    <details className="mt-5 rounded border border-slate-200 p-3">
                      <summary className="cursor-pointer text-xs font-bold text-slate-600">Add evidence URL manually</summary>
                      <ManualEvidenceLinkForm onLink={(value) => linkRepositoryEvidence(repositoryPicker.row, value)} />
                    </details>
                  </aside>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                  <span className="text-xs font-bold text-slate-500">{selectedRepositoryIds.length} selected</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setRepositoryPicker(null)} className="rounded bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">Cancel</button>
                    <button type="button" disabled={selectedRepositoryIds.length === 0} onClick={() => confirmRepositorySelection().catch((err) => setRepositoryError(err.message || 'Unable to link evidence'))} className="rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Link Selected</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ManualEvidenceLinkForm({ onLink }: { onLink: (value: string) => Promise<void> }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="mt-3 space-y-2">
      <input className={inputClass} value={value} onChange={(event) => setValue(event.target.value)} placeholder="https://... or repository path" />
      <button
        type="button"
        disabled={!value.trim() || saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onLink(value);
            setValue('');
          } finally {
            setSaving(false);
          }
        }}
        className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
      >
        Link URL
      </button>
    </div>
  );
}

function ChecklistAuditCard({
  item,
  itemEvidence,
  expanded,
  canEdit,
  onToggle,
  onSave,
  onUploadEvidence,
  onAttachRepositoryFolder,
}: {
  key?: string;
  item: ChecklistItem;
  itemEvidence: EvidenceRecord[];
  expanded: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onSave: (itemId: string, patch: Partial<ChecklistItem>) => Promise<void>;
  onUploadEvidence: (files: FileList | null, checklistItemId?: string, kind?: string) => Promise<void>;
  onAttachRepositoryFolder: (checklistItemId?: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState({
    status: item.status,
    observation: item.observation || '',
    auditorRemarks: item.auditorRemarks || '',
  });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<number | null>(null);
  const savedTimerRef = useRef<number | null>(null);
  const latestDraftRef = useRef(draft);

  useEffect(() => {
    setDraft({
      status: item.status,
      observation: item.observation || '',
      auditorRemarks: item.auditorRemarks || '',
    });
  }, [item.id, item.status, item.observation, item.auditorRemarks]);

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
  }, []);

  const persist = async (nextDraft = latestDraftRef.current) => {
    if (!canEdit) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
    setSaveState('saving');
    try {
      await onSave(item.id, {
        status: nextDraft.status,
        observation: nextDraft.observation,
        auditorRemarks: nextDraft.auditorRemarks,
      });
      setSaveState('saved');
      savedTimerRef.current = window.setTimeout(() => setSaveState('idle'), 1800);
    } catch (error) {
      setSaveState('error');
      throw error;
    }
  };

  const updateDraft = (patch: Partial<typeof draft>, debounce = true) => {
    const nextDraft = { ...latestDraftRef.current, ...patch };
    latestDraftRef.current = nextDraft;
    setDraft(nextDraft);
    if (!canEdit || !debounce) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      persist(nextDraft).catch(console.error);
    }, 650);
  };

  return (
    <div className={cn(
      "rounded-lg border bg-white shadow-sm transition-colors duration-300",
      saveState === 'saved' ? 'border-emerald-300 bg-emerald-50/60' :
      saveState === 'saving' ? 'border-blue-200 bg-blue-50/40' :
      saveState === 'error' ? 'border-rose-300 bg-rose-50/40' :
      'border-slate-200',
    )}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <div>
          <h3 className="text-sm font-extrabold text-slate-950">{item.text}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {draft.status} - {itemEvidence.length} evidence item(s)
            {saveState !== 'idle' && (
              <span className={cn(
                "ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                saveState === 'saved' ? 'bg-emerald-100 text-emerald-700' :
                saveState === 'saving' ? 'bg-blue-100 text-blue-700' :
                'bg-rose-100 text-rose-700',
              )}>
                {saveState === 'saving' ? 'Saving' : saveState === 'saved' ? 'Saved' : 'Save failed'}
              </span>
            )}
          </p>
        </div>
        <span className={statusPill(draft.status)}>{draft.status}</span>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 p-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</p>
              <div className="space-y-2">
                {['Compliant', 'Non-Compliant', 'Not Applicable'].map((status) => (
                  <label key={status} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      disabled={!canEdit}
                      type="radio"
                      checked={draft.status === status}
                      onChange={() => updateDraft({ status: status as ChecklistItem['status'] })}
                      onBlur={() => persist().catch(console.error)}
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Field label="Observation">
                <textarea
                  disabled={!canEdit}
                  className={textareaClass}
                  value={draft.observation}
                  onChange={(event) => updateDraft({ observation: event.target.value })}
                  onBlur={() => persist().catch(console.error)}
                />
              </Field>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Evidence</p>
                <div className="flex flex-wrap gap-2">
                  <label className={cn('rounded px-3 py-2 text-xs font-bold', canEdit ? 'cursor-pointer bg-slate-900 text-white' : 'bg-slate-100 text-slate-400')}>
                    Upload File
                    <input disabled={!canEdit} type="file" multiple className="hidden" onChange={(event) => onUploadEvidence(event.target.files, item.id, 'file')} />
                  </label>
                  <label className={cn('rounded px-3 py-2 text-xs font-bold', canEdit ? 'cursor-pointer bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-400')}>
                    Upload Folder
                    <input disabled={!canEdit} type="file" multiple className="hidden" {...({ webkitdirectory: 'true' } as any)} onChange={(event) => onUploadEvidence(event.target.files, item.id, 'folder')} />
                  </label>
                  <button disabled={!canEdit} onClick={() => onAttachRepositoryFolder(item.id)} className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 disabled:text-slate-400">Attach Repository Folder</button>
                </div>
                <div className="mt-3 space-y-2">
                  {itemEvidence.map((record) => (
                    <div key={record.id} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      <span className="font-bold text-slate-700">{record.name}</span>
                      {record.url && <a className="font-bold text-blue-600" href={record.url} target="_blank" rel="noreferrer">Preview / Download</a>}
                    </div>
                  ))}
                </div>
              </div>
              <Field label="Remarks">
                <textarea
                  disabled={!canEdit}
                  className={textareaClass}
                  value={draft.auditorRemarks}
                  onChange={(event) => updateDraft({ auditorRemarks: event.target.value })}
                  onBlur={() => persist().catch(console.error)}
                />
              </Field>
              {canEdit && (
                <button
                  onClick={() => persist().catch(console.error)}
                  disabled={saveState === 'saving'}
                  className={cn(
                    "rounded px-3 py-2 text-xs font-bold text-white transition",
                    saveState === 'saved' ? 'bg-emerald-600' : saveState === 'error' ? 'bg-rose-600' : 'bg-slate-900 hover:bg-slate-800',
                    saveState === 'saving' && 'cursor-wait opacity-70',
                  )}
                >
                  {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AuditAreaWorkspacePage() {
  const { id, areaId } = useParams() as { id: string; areaId: string };
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [project, setProject] = useState<ApiProject | null>(null);
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [activeTab, setActiveTab] = useState('Checklist');
  const [openItemId, setOpenItemId] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [observationFilter, setObservationFilter] = useState('');
  const [observationStatusFilter, setObservationStatusFilter] = useState('');
  const [areaActivities, setAreaActivities] = useState<ProjectActivity[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [attachItemId, setAttachItemId] = useState<string | null>(null);
  const [repositoryFolderDraft, setRepositoryFolderDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const attachPopupRef = useRef<HTMLDivElement | null>(null);
  useOutsideClick(attachPopupRef, () => setAttachItemId(null), !!attachItemId);

  const fetchActivity = async () => {
    const logs = await apiJson(`/api/project-areas/${areaId}/activity`);
    setAreaActivities(Array.isArray(logs) ? logs : []);
  };

  const reload = async () => {
    setError('');
    const [projectData, userData] = await Promise.all([
      apiJson(`/api/projects/${id}`),
      apiJson('/api/users'),
    ]);
    setProject(projectData);
    setUsers(normalizeUsers(userData));
    const area = projectData.areaAllocations?.find((item: ProjectAreaAllocation) => item.id === areaId);
    const firstItem = parseChecklist(area?.checklistSnapshot)?.[0]?.id;
    if (firstItem && !openItemId) setOpenItemId(firstItem);
    await fetchActivity();
  };

  useEffect(() => {
    setLoading(true);
    reload().catch((err) => setError(err.message || 'Unable to load audit area')).finally(() => setLoading(false));
  }, [id, areaId]);

  const area = project?.areaAllocations?.find((item) => item.id === areaId);
  const checklist = parseChecklist(area?.checklistSnapshot);
  const evidence = parseEvidence(area?.evidenceRecords);
  const combinedEvidence = areaEvidenceRecords(area);
  const isTableChecklist = area?.checklistType === 'TABLE_CHECKLIST';
  const progress = area ? checklistProgress(area) : { total: 0, completed: 0, pending: 0, percent: 0 };
  const comments = area?.reviewComments ? JSON.parse(area.reviewComments) : [];
  const canManage = !!project && (currentUser?.role === 'ADMIN' || project.auditManagerId === currentUser?.id);
  const makerId = area?.makerUserId || area?.assignedUserId;
  const effectiveReviewerId = area?.reviewerUserId || project?.auditManagerId || null;
  const canEdit = !!area && (makerId === currentUser?.id || canManage) && area.reviewStatus !== 'APPROVED' && !(area.workStatus === 'SUBMITTED' && area.reviewStatus === 'AWAITING_REVIEW');
  const canReview = !!area && effectiveReviewerId === currentUser?.id && currentUser?.id !== makerId;
  const hasChecklistResponse = isTableChecklist || checklist.some((item) => item.status && item.status !== 'Pending');
  const hasEvidence = combinedEvidence.length > 0;
  const canSubmitForReview = canEdit && !!makerId && !!effectiveReviewerId && makerId !== effectiveReviewerId && (hasChecklistResponse || hasEvidence);
  const submitBlockReason = !effectiveReviewerId
    ? 'No reviewer available. Assign a reviewer or set an Audit Manager for this project.'
    : !makerId
      ? 'Maker is not assigned. Please assign a maker before submission.'
      : makerId === effectiveReviewerId
        ? 'Maker and reviewer cannot be the same person. Please assign a different reviewer.'
      : !(hasChecklistResponse || hasEvidence)
        ? 'Update at least one checklist response or upload evidence before submission.'
        : '';
  const filteredObservations = (area?.observations || []).filter((observation) => {
    const search = [observation.description, observation.isoClause, observation.controlArea, observation.evidenceReference, observation.capa?.closureStatus, observation.status].join(' ').toLowerCase();
    return (!observationFilter.trim() || search.includes(observationFilter.trim().toLowerCase()))
      && (!observationStatusFilter || (observation.reviewed ? 'Reviewed' : observation.status) === observationStatusFilter || observation.capa?.closureStatus === observationStatusFilter);
  });

  const saveArea = async (patch: Partial<ProjectAreaAllocation>) => {
    if (!area) return;
    const updated = await apiJson(`/api/project-areas/${area.id}`, { method: 'PUT', body: JSON.stringify(patch) });
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        areaAllocations: (prev.areaAllocations || []).map((existingArea) => existingArea.id === area.id ? { ...existingArea, ...updated } : existingArea),
      };
    });
  };

  const saveChecklistItem = async (itemId: string, patch: Partial<ChecklistItem>) => {
    if (!area || !canEdit) return;
    try {
      const updated = await apiJson(`/api/project-areas/${area.id}/checklist/${itemId}`, { method: 'PUT', body: JSON.stringify(patch) });
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          areaAllocations: (prev.areaAllocations || []).map((existingArea) => existingArea.id === area.id ? { ...existingArea, ...updated } : existingArea),
        };
      });
      await fetchActivity();
    } catch (err: any) {
      setError(err.message || 'Unable to save checklist item');
      throw err;
    }
  };

  const uploadEvidence = async (files: FileList | null, checklistItemId?: string, kind = 'file') => {
    if (!area || !files?.length || !canEdit) return;
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append('files', file));
      form.append('kind', kind);
      if (checklistItemId) form.append('checklistItemId', checklistItemId);
      const res = await fetch(`/api/project-areas/${area.id}/evidence`, { method: 'POST', credentials: 'include', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Evidence upload failed');
      }
      setToast('Evidence uploaded.');
      await reload();
    } catch (err: any) {
      setError(err.message || 'Evidence upload failed');
    }
  };

  const attachRepositoryFolder = async (checklistItemId?: string) => {
    if (!area || !canEdit || !repositoryFolderDraft.trim()) return;
    try {
      const form = new FormData();
      form.append('repositoryFolder', repositoryFolderDraft.trim());
      if (checklistItemId) form.append('checklistItemId', checklistItemId);
      const res = await fetch(`/api/project-areas/${area.id}/evidence`, { method: 'POST', credentials: 'include', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Unable to attach repository folder');
      }
      setRepositoryFolderDraft('');
      setAttachItemId(null);
      setToast('Repository folder attached.');
      await reload();
    } catch (err: any) {
      setError(err.message || 'Unable to attach repository folder');
    }
  };

  const submitForReview = async () => {
    if (!area) return;
    if (submitBlockReason) {
      setError(submitBlockReason);
      return;
    }
    setSubmitting(true);
    setError('');
    setToast('');
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 750));
      await apiJson(`/api/project-areas/${area.id}/submit`, { method: 'POST', body: JSON.stringify({}) });
      setToast('Submitted for review.');
      await reload();
    } catch (err: any) {
      setError(err.message || 'Unable to submit for review');
    } finally {
      setSubmitting(false);
    }
  };

  const reviewArea = async (action: 'approve' | 'rework') => {
    if (!area) return;
    try {
      await apiJson(`/api/project-areas/${area.id}/review`, { method: 'POST', body: JSON.stringify({ action, comment: reviewComment }) });
      setReviewComment('');
      setToast(action === 'approve' ? 'Review approved.' : 'Rework requested.');
      await reload();
    } catch (err: any) {
      setError(err.message || 'Unable to complete review action');
    }
  };

  const createCapa = async (observation: ObservationRecord) => {
    try {
      await apiJson(`/api/observations/${observation.id}/capa`, {
        method: 'POST',
        body: JSON.stringify({
          riskRating: observation.capa?.riskRating || 'Medium',
          rootCause: observation.capa?.rootCause || 'Root cause to be documented',
          correctiveAction: observation.capa?.correctiveAction || 'Corrective action to be tracked',
          preventiveAction: observation.capa?.preventiveAction || 'Preventive action to be tracked',
          closureStatus: observation.capa?.closureStatus || 'Open',
        }),
      });
      setToast('CAPA created from observation.');
      await reload();
    } catch (err: any) {
      setError(err.message || 'Unable to create CAPA');
    }
  };

  const reviewObservation = async (observation: ObservationRecord) => {
    try {
      await apiJson(`/api/observations/${observation.id}`, {
        method: 'PUT',
        body: JSON.stringify({ reviewed: true, status: 'Reviewed' }),
      });
      setToast('Observation reviewed.');
      await reload();
    } catch (err: any) {
      setError(err.message || 'Unable to review observation');
    }
  };

  const closeCapa = async (observation: ObservationRecord) => {
    try {
      await apiJson(`/api/observations/${observation.id}/capa`, {
        method: 'POST',
        body: JSON.stringify({
          ...(observation.capa || {}),
          closureStatus: 'Closed',
          closureEvidence: observation.capa?.closureEvidence || observation.evidenceReference || 'Repository closure evidence linked',
          verification: observation.capa?.verification || 'Verified by reviewer',
        }),
      });
      setToast('CAPA closed.');
      await reload();
    } catch (err: any) {
      setError(err.message || 'Unable to close CAPA');
    }
  };

  const deleteEvidenceRecord = async (record: AreaEvidenceRecord) => {
    if (!area || !confirm(`Delete evidence "${record.name}"?`)) return;
    try {
      if (record.evidenceKind === 'repository-link' && record.rowId) {
        await apiJson(`/api/table-rows/${record.rowId}/repository-evidence`, {
          method: 'DELETE',
          body: JSON.stringify({ repositoryPath: record.url || record.name }),
        });
      } else if (record.evidenceKind === 'row-file') {
        await apiJson(`/api/row-evidence/${record.id}`, { method: 'DELETE' });
      } else {
        await apiJson(`/api/project-areas/${area.id}/evidence/${record.id}`, { method: 'DELETE' });
      }
      setToast('Evidence deleted.');
      await reload();
    } catch (err: any) {
      setError(err.message || 'Unable to delete evidence');
    }
  };

  if (loading) return <PageContainer title="Audit Area" subtitle="Loading workspace"><div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading audit area...</div></PageContainer>;
  if (!project || !area) return <PageContainer title="Audit Area" subtitle="Not found"><div className="rounded border border-rose-100 bg-rose-50 p-6 text-rose-700">{error || 'Audit area not found'}</div></PageContainer>;

  const reviewerName = userName(users, effectiveReviewerId);
  const makerName = userName(users, makerId);
  const reviewLabel = area.reviewStatus || 'Not Reviewed';
  const dueLabel = formatDate(area.dueDate);

  return (
    <PageContainer
      title={area.areaName}
      subtitle={`${project.projectName} - ${areaDisplayStatus(area)}`}
      actions={<button onClick={() => navigate(`/projects/${project.id}`)} className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Project</button>}
      compact
    >
      <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch xl:justify-between">
          <div className="min-w-0 flex-1 py-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Audit Area Workspace</p>
            <h1 className="mt-0.5 truncate text-xl font-extrabold text-slate-950">{area.areaName}</h1>
            <p className="truncate text-xs font-semibold text-slate-500">{project.projectName}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5 xl:w-[760px]">
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Maker</p>
              <p className="mt-1 truncate font-extrabold text-slate-950">{makerName}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Reviewer</p>
              <p className="mt-1 truncate font-extrabold text-slate-950">{reviewerName}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progress</p>
              <p className="mt-1 truncate font-extrabold text-slate-950">{progress.completed}/{progress.total}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Due Date</p>
              <p className="mt-1 truncate font-extrabold text-slate-950">{dueLabel}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Review</p>
              <p className="mt-1 truncate font-extrabold text-slate-950">{reviewLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {toast && <div className="border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{toast}</div>}
      {error && <div className="border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
      {canEdit && submitBlockReason && !error && <div className="border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">{submitBlockReason}</div>}

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {['Checklist', 'Evidence', 'Observations', 'Review', 'History'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn('whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold', activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-950')}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Checklist' && (
        <div className="space-y-2">
          {isTableChecklist && area ? (
            <TableChecklistGrid
              area={area}
              canEdit={canEdit}
              canSubmitForReview={canSubmitForReview}
              submitting={submitting}
              onSubmitForReview={submitForReview}
              onReload={reload}
              onActivityRefresh={fetchActivity}
            />
          ) : (
            <>
              {canEdit && (
                <div className="flex flex-wrap justify-end gap-1.5 border border-slate-200 bg-white px-3 py-2">
                  <button disabled={submitting || !canSubmitForReview} onClick={submitForReview} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit for Review'}</button>
                </div>
              )}
              {checklist.map((item) => {
            const itemEvidence = evidence.filter((record) => record.checklistItemId === item.id);
            const expanded = openItemId === item.id;
            return (
              <ChecklistAuditCard
                key={item.id}
                item={item}
                itemEvidence={itemEvidence}
                expanded={expanded}
                canEdit={canEdit}
                onToggle={() => setOpenItemId(expanded ? '' : item.id)}
                onSave={saveChecklistItem}
                onUploadEvidence={uploadEvidence}
                onAttachRepositoryFolder={(itemId) => {
                  setRepositoryFolderDraft('');
                  setAttachItemId(itemId || null);
                }}
              />
            );
          })}
            </>
          )}
          {attachItemId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <div ref={attachPopupRef} className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-950">Attach Repository Folder</h3>
                  <button onClick={() => setAttachItemId(null)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
                </div>
                <Field label="Folder path or name">
                  <input className={inputClass} value={repositoryFolderDraft} onChange={(event) => setRepositoryFolderDraft(event.target.value)} placeholder="Repository / Evidence / HR" />
                </Field>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setAttachItemId(null)} className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Cancel</button>
                  <button onClick={() => attachRepositoryFolder(attachItemId)} className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">Attach</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Evidence' && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4"><h3 className="font-extrabold text-slate-950">Uploaded Evidence</h3></div>
          <div className="divide-y divide-slate-100">
            {combinedEvidence.map((record) => (
              <div key={record.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="break-words font-bold text-slate-900">{record.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {record.type} {record.source ? `- ${record.source}` : ''} - {record.uploadedAt ? new Date(record.uploadedAt).toLocaleString() : '-'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {record.url?.startsWith('/uploads/') ? (
                    <a href={record.url} target="_blank" rel="noreferrer" className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Preview / Download</a>
                  ) : record.url ? (
                    <span className="max-w-xs rounded bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">{record.url}</span>
                  ) : null}
                  {canEdit && (
                    <button onClick={() => deleteEvidenceRecord(record)} className="rounded bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Delete</button>
                  )}
                </div>
              </div>
            ))}
            {combinedEvidence.length === 0 && <p className="p-8 text-center text-sm font-semibold text-slate-500">No evidence uploaded yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'Observations' && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="font-extrabold text-slate-950">Observations</h3>
              <p className="text-xs font-semibold text-slate-500">Observations created from checklist rows.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input className={cn(inputClass, 'w-64')} value={observationFilter} onChange={(event) => setObservationFilter(event.target.value)} placeholder="Filter observations..." />
              <select className={inputClass} value={observationStatusFilter} onChange={(event) => setObservationStatusFilter(event.target.value)}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Closed">Closed CAPA</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3">Observation</th>
                  <th className="px-4 py-3">Clause / Control</th>
                  <th className="px-4 py-3">Evidence</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">CAPA</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredObservations.map((observation) => (
                  <tr key={observation.id}>
                    <td className="max-w-md px-4 py-3 font-semibold text-slate-900">{observation.description}</td>
                    <td className="px-4 py-3 text-slate-600">{observation.isoClause || '-'} / {observation.controlArea || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{observation.evidenceReference || '-'}</td>
                    <td className="px-4 py-3"><span className={statusPill(observation.reviewed ? 'Completed' : 'Open')}>{observation.reviewed ? 'Reviewed' : observation.status}</span></td>
                    <td className="px-4 py-3 font-bold text-slate-600">{observation.capa?.closureStatus || 'Not Created'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!observation.reviewed && <button onClick={() => reviewObservation(observation)} className="rounded bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">Mark Reviewed</button>}
                        <button onClick={() => createCapa(observation)} className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">{observation.capa ? 'Update CAPA' : 'Create CAPA'}</button>
                        {observation.capa && <button onClick={() => closeCapa(observation)} className="rounded bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Close CAPA</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredObservations.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center font-semibold text-slate-500">No observations match the current filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Review' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="font-extrabold text-slate-950">Review Decision</h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">Work Status: {area.workStatus}</p>
            <p className="text-sm font-semibold text-slate-600">Review Status: {area.reviewStatus}</p>
            <textarea disabled={!canReview} className={cn(textareaClass, 'mt-4')} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Reviewer comments" />
            <div className="mt-3 flex gap-2">
              <button disabled={!canReview} onClick={() => reviewArea('approve')} className="rounded bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve</button>
              <button disabled={!canReview} onClick={() => reviewArea('rework')} className="rounded bg-amber-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Request Rework</button>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="font-extrabold text-slate-950">Review Comments</h3>
            <div className="mt-3 space-y-3">
              {comments.map((comment: any) => (
                <div key={comment.id} className="rounded border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{comment.action} by {userName(users, comment.actor)}</p>
                  <p className="mt-1 text-sm text-slate-700">{comment.text}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm font-semibold text-slate-500">No reviewer comments yet.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'History' && (
        <ProjectActivityTimeline project={{ ...project, activityLogs: areaActivities }} users={users} />
      )}
    </PageContainer>
  );
}

export function PersonalWorkspacePage() {
  const currentUser = useCurrentUser();
  const location = useLocation();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [myAssignments, setMyAssignments] = useState<QueueAreaItem[]>([]);
  const [myReviews, setMyReviews] = useState<QueueAreaItem[]>([]);
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(location.search).get('tab') || 'My Assignments');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(new URLSearchParams(location.search).get('tab') || 'My Assignments');
  }, [location.search]);

  useEffect(() => {
    setLoading(true);
    Promise.all([apiJson('/api/projects'), apiJson('/api/projects/my-assignments'), apiJson('/api/projects/my-reviews'), apiJson('/api/users')])
      .then(([projectData, assignmentData, reviewData, userData]) => {
        setProjects(Array.isArray(projectData) ? projectData : []);
        setMyAssignments(Array.isArray(assignmentData) ? assignmentData : []);
        setMyReviews(Array.isArray(reviewData) ? reviewData : []);
        setUsers(normalizeUsers(userData));
      })
      .catch(() => {
        setProjects([]);
        setMyAssignments([]);
        setMyReviews([]);
      })
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  const myActivity = projects.flatMap((project) => (project.activityLogs || []).filter((log) => log.actor === currentUser?.id).map((log) => ({ project, log })));

  const queueCard = ({ project, area }: QueueAreaItem) => {
    const progress = checklistProgress(area);
    return (
      <div key={`${project.id}-${area.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{project.clientName}</p>
            <h3 className="mt-1 text-base font-extrabold text-slate-950">{area.areaName}</h3>
            <p className="text-xs font-semibold text-slate-500">Due: {formatDate(area.dueDate)}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 text-xs md:w-[460px] md:grid-cols-[1fr_1fr_auto]">
            <Metric label="Progress" value={`${progress.completed}/${progress.total}`} />
            <Metric label="Status" value={areaDisplayStatus(area)} />
            <Link to={`/projects/${project.id}/areas/${area.id}`} className="flex h-full items-center justify-center rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white">Open</Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageContainer title="Personal Workspace" subtitle="Assignments, review queue, activity, and profile settings">
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {['My Assignments', 'My Reviews', 'My Activity', 'Profile Settings'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn('whitespace-nowrap border-b-2 px-3 py-3 text-sm font-bold', activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-950')}>{tab}</button>
        ))}
      </div>

      {loading && <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading workspace...</div>}

      {!loading && activeTab === 'My Assignments' && (
        <div className="space-y-3">
          {myAssignments.map(queueCard)}
          {myAssignments.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">No assigned audit areas.</div>}
        </div>
      )}

      {!loading && activeTab === 'My Reviews' && (
        <div className="space-y-3">
          {myReviews.map(({ project, area, submittedBy }) => {
            const progress = checklistProgress(area);
            return (
            <div key={`${project.id}-${area.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{project.projectName || project.clientName}</p>
                  <h3 className="mt-1 text-base font-extrabold text-slate-950">{area.areaName}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">Submitted By: {submittedBy?.name || userName(users, area.makerUserId || area.assignedUserId)}</p>
                  <p className="text-xs font-semibold text-slate-500">Submitted: {formatDate(area.submittedAt)}</p>
                </div>
                <div className="grid grid-cols-1 items-center gap-3 text-xs md:w-[420px] md:grid-cols-[1fr_1fr_auto]">
                  <Metric label="Progress" value={`${progress.completed}/${progress.total}`} />
                  <span className={statusPill('Awaiting Review')}>Awaiting Review</span>
                  <Link to={`/projects/${project.id}/areas/${area.id}`} className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white">Open</Link>
                </div>
              </div>
            </div>
          );})}
          {myReviews.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">No tasks awaiting review.</div>}
        </div>
      )}

      {!loading && activeTab === 'My Activity' && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="space-y-3">
            {myActivity.map(({ project, log }) => (
              <div key={log.id} className="rounded border border-slate-100 bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-900">{log.action}</p>
                <p className="text-xs text-slate-500">{project.clientName} - {log.details}</p>
              </div>
            ))}
            {myActivity.length === 0 && <p className="text-center text-sm font-semibold text-slate-500">No activity yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'Profile Settings' && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-extrabold text-slate-950">Profile Settings</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Metric label="Name" value={currentUser?.name || '-'} />
            <Metric label="Email" value={currentUser?.email || '-'} />
            <Metric label="Role" value={currentUser?.role || '-'} />
          </div>
        </div>
      )}
    </PageContainer>
  );
}

const singletonWorkspaceEndpoint = (type?: string | null) => {
  if (type === 'PLANNING_WORKSPACE') return 'planning';
  if (type === 'PROJECT_MANAGEMENT_WORKSPACE') return 'project-management';
  if (['MEETING_WORKSPACE', 'CLOSING_MEETING_WORKSPACE', 'COMMITTEE_MEETING_WORKSPACE'].includes(type || '')) return 'meeting';
  if (type === 'AREA_CHECKLIST_WORKSPACE') return 'area-checklist';
  return null;
};

const trackerWorkspaceType = (type?: string | null) => {
  const map: Record<string, string> = {
    DATA_REQUEST_WORKSPACE: 'data-requests',
    PROCESS_WALKTHROUGH_WORKSPACE: 'walkthroughs',
    RCM_WORKSPACE: 'rcm',
    SAMPLING_WORKSPACE: 'sampling',
    WEEKLY_STATUS_WORKSPACE: 'weekly',
    INTERIM_REVIEW_WORKSPACE: 'interim',
    REPORT_WORKSPACE: 'reports',
    REPORT_REVIEW_WORKSPACE: 'report-reviews',
    REPORT_SUBMISSION_WORKSPACE: 'submissions',
  };
  return type ? map[type] : null;
};

function WorkspaceBoolean({ label, checked, onChange }: { key?: React.Key; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function GenericWorkspaceTable({ rows, columns, onAdd, onUpdate, onDelete }: { rows: any[]; columns: Array<{ key: string; label: string; type?: string }>; onAdd: () => void; onUpdate: (id: string, patch: any) => void; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div>
          <h3 className="font-extrabold text-slate-950">Workspace Tracker</h3>
          <p className="text-xs font-semibold text-slate-500">Inline tracker data drives milestone progress.</p>
        </div>
        <button onClick={onAdd} className="rounded bg-slate-950 px-3 py-2 text-xs font-bold text-white"><Plus className="mr-1 inline h-4 w-4" /> Add Row</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              {columns.map((column) => <th key={column.key} className="px-3 py-3">{column.label}</th>)}
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length && <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center font-bold text-slate-500">No tracker rows yet.</td></tr>}
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2">
                    {column.type === 'status' ? (
                      <select className={inputClass} value={row[column.key] || ''} onChange={(event) => onUpdate(row.id, { [column.key]: event.target.value })}>
                        {['PENDING', 'OPEN', 'IN_PROGRESS', 'SENT_TO_CLIENT', 'RECEIVED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'APPROVED', 'RESOLVED', 'CLOSED', 'BLOCKED'].map((status) => <option key={status}>{status}</option>)}
                      </select>
                    ) : column.type === 'date' ? (
                      <input className={inputClass} type="date" value={row[column.key]?.slice?.(0, 10) || ''} onChange={(event) => onUpdate(row.id, { [column.key]: event.target.value || null })} />
                    ) : (
                      <input className={inputClass} value={row[column.key] || ''} onChange={(event) => onUpdate(row.id, { [column.key]: event.target.value })} />
                    )}
                  </td>
                ))}
                <td className="px-3 py-2"><button onClick={() => onDelete(row.id)} className="rounded bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MilestoneWorkspacePage() {
  const { id, milestoneId } = useParams() as { id: string; milestoneId: string };
  const navigate = useNavigate();
  const [detail, setDetail] = useState<{ milestone: ProjectMilestone & { project?: ApiProject }; workspace: any } | null>(null);
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    const [detailData, userData] = await Promise.all([apiJson(`/api/project-milestones/${milestoneId}`), apiJson('/api/users')]);
    setDetail(detailData);
    setUsers(normalizeUsers(userData));
  };

  useEffect(() => {
    setLoading(true);
    load().catch((err) => setError(err.message || 'Unable to load milestone workspace')).finally(() => setLoading(false));
  }, [milestoneId]);

  const milestone = detail?.milestone;
  const workspace = detail?.workspace;

  const updateSingleton = async (patch: any) => {
    if (!milestone) return;
    const endpoint = singletonWorkspaceEndpoint(milestone.workspaceType);
    if (!endpoint) return;
    await apiJson(`/api/milestone-workspaces/${endpoint}/${milestone.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await load();
  };

  const updateMilestone = async (patch: any) => {
    if (!milestone) return;
    await apiJson(`/api/project-milestones/${milestone.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await load();
  };

  const trackerType = trackerWorkspaceType(milestone?.workspaceType);
  const addTracker = async (defaults: any) => {
    if (!milestone || !trackerType) return;
    await apiJson(`/api/milestone-workspaces/${trackerType}/${milestone.id}/items`, { method: 'POST', body: JSON.stringify(defaults) });
    await load();
  };
  const updateTracker = async (rowId: string, patch: any) => {
    if (!trackerType) return;
    await apiJson(`/api/milestone-workspace-items/${trackerType}/${rowId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await load();
  };
  const deleteTracker = async (rowId: string) => {
    if (!trackerType || !confirm('Delete this tracker row?')) return;
    await apiJson(`/api/milestone-workspace-items/${trackerType}/${rowId}`, { method: 'DELETE' });
    await load();
  };

  if (loading) return <PageContainer title="Milestone" subtitle="Loading workspace"><div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading milestone workspace...</div></PageContainer>;
  if (!milestone) return <PageContainer title="Milestone" subtitle="Not found"><div className="rounded border border-rose-100 bg-rose-50 p-6 text-rose-700">{error || 'Milestone not found'}</div></PageContainer>;

  const renderWorkspace = () => {
    if (milestone.workspaceType === 'PLANNING_WORKSPACE') {
      const checks = [
        ['scopeDefined', 'Scope defined'],
        ['objectivesDefined', 'Objectives defined'],
        ['auditCriteriaDefined', 'Audit criteria defined'],
        ['engagementLetterLinked', 'Engagement letter linked'],
        ['ndaLinked', 'NDA linked'],
        ['auditPlanLinked', 'Audit plan linked'],
        ['teamAllocated', 'Team allocated'],
        ['schedulePrepared', 'Schedule prepared'],
        ['samplingApproachDefined', 'Sampling approach defined'],
      ];
      return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {checks.map(([key, label]) => <WorkspaceBoolean key={key} label={label} checked={!!workspace?.[key]} onChange={(checked) => updateSingleton({ [key]: checked })} />)}
          <Field label="Applicable Standards"><input className={inputClass} value={workspace?.applicableStandards || ''} onChange={(event) => updateSingleton({ applicableStandards: event.target.value })} /></Field>
          <Field label="Remarks"><textarea className={textareaClass} value={workspace?.remarks || ''} onChange={(event) => updateSingleton({ remarks: event.target.value })} /></Field>
        </div>
      );
    }
    if (milestone.workspaceType === 'PROJECT_MANAGEMENT_WORKSPACE') {
      const checks = [
        ['escalationMatrixDefined', 'Escalation matrix'],
        ['communicationPlanDefined', 'Communication plan'],
        ['weeklyTrackingEnabled', 'Weekly tracking cadence'],
        ['risksLogged', 'Risk log'],
      ];
      return <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{checks.map(([key, label]) => <WorkspaceBoolean key={key} label={label} checked={!!workspace?.[key]} onChange={(checked) => updateSingleton({ [key]: checked })} />)}</div>;
    }
    if (['MEETING_WORKSPACE', 'CLOSING_MEETING_WORKSPACE', 'COMMITTEE_MEETING_WORKSPACE'].includes(milestone.workspaceType || '')) {
      return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Field label="Meeting Date"><input className={inputClass} type="date" value={workspace?.meetingDate?.slice?.(0, 10) || ''} onChange={(event) => updateSingleton({ meetingDate: event.target.value || null })} /></Field>
          <Field label="Meeting Time"><input className={inputClass} value={workspace?.meetingTime || ''} onChange={(event) => updateSingleton({ meetingTime: event.target.value })} /></Field>
          <Field label="Location"><input className={inputClass} value={workspace?.location || ''} onChange={(event) => updateSingleton({ location: event.target.value })} /></Field>
          <Field label="Attendees"><input className={inputClass} value={workspace?.attendees || ''} onChange={(event) => updateSingleton({ attendees: event.target.value })} /></Field>
          <Field label="Agenda"><textarea className={textareaClass} value={workspace?.agenda || ''} onChange={(event) => updateSingleton({ agenda: event.target.value })} /></Field>
          <Field label="Minutes of Meeting"><textarea className={textareaClass} value={workspace?.minutesOfMeeting || ''} onChange={(event) => updateSingleton({ minutesOfMeeting: event.target.value })} /></Field>
          <WorkspaceBoolean label="Attendance linked" checked={!!workspace?.attendanceLinked} onChange={(checked) => updateSingleton({ attendanceLinked: checked })} />
          <WorkspaceBoolean label="MoM linked" checked={!!workspace?.momLinked} onChange={(checked) => updateSingleton({ momLinked: checked })} />
          <WorkspaceBoolean label="Meeting completed" checked={!!workspace?.completed} onChange={(checked) => updateSingleton({ completed: checked })} />
        </div>
      );
    }
    if (milestone.workspaceType === 'AREA_CHECKLIST_WORKSPACE' || milestone.workspaceType === 'EXECUTION_WORKSPACE') {
      const areas = Array.isArray(workspace) ? workspace : workspace?.areas || [];
      return (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4"><h3 className="font-extrabold text-slate-950">{milestone.workspaceType === 'EXECUTION_WORKSPACE' ? 'Execution Summary' : 'Assignment Summary'}</h3></div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500"><tr><th className="px-3 py-3">Area</th><th className="px-3 py-3">Maker</th><th className="px-3 py-3">Reviewer</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Open</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{areas.map((area: ProjectAreaAllocation) => <tr key={area.id}><td className="px-3 py-3 font-bold">{area.areaName}</td><td className="px-3 py-3">{(area as any).maker?.name || userName(users, area.makerUserId)}</td><td className="px-3 py-3">{(area as any).reviewer?.name || userName(users, area.reviewerUserId) || '-'}</td><td className="px-3 py-3"><span className={statusPill(area.status)}>{area.status}</span></td><td className="px-3 py-3"><Link to={`/projects/${id}/areas/${area.id}`} className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white">Open</Link></td></tr>)}</tbody>
          </table>
        </div>
      );
    }
    if (milestone.workspaceType === 'QUERY_WORKSPACE') {
      const rows = Array.isArray(workspace) ? workspace : [];
      return <GenericWorkspaceTable rows={rows} columns={[{ key: 'queryText', label: 'Query' }, { key: 'assignedTo', label: 'Assigned To' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status', type: 'status' }, { key: 'dueDate', label: 'Due Date', type: 'date' }]} onAdd={() => navigate(`/projects/${id}`)} onUpdate={() => {}} onDelete={() => {}} />;
    }
    if (trackerType === 'data-requests') return <GenericWorkspaceTable rows={workspace || []} columns={[{ key: 'requestTitle', label: 'Request' }, { key: 'assignedTo', label: 'Assigned To' }, { key: 'dueDate', label: 'Due Date', type: 'date' }, { key: 'status', label: 'Status', type: 'status' }, { key: 'response', label: 'Response' }]} onAdd={() => addTracker({ requestTitle: 'New data request', status: 'OPEN' })} onUpdate={updateTracker} onDelete={deleteTracker} />;
    if (trackerType === 'walkthroughs') return <GenericWorkspaceTable rows={workspace || []} columns={[{ key: 'processName', label: 'Process' }, { key: 'department', label: 'Dept' }, { key: 'processOwner', label: 'Owner' }, { key: 'walkthroughDate', label: 'Date', type: 'date' }, { key: 'status', label: 'Status', type: 'status' }, { key: 'gapsIdentified', label: 'Gaps' }]} onAdd={() => addTracker({ processName: 'New process', status: 'PENDING' })} onUpdate={updateTracker} onDelete={deleteTracker} />;
    if (trackerType === 'rcm') return <GenericWorkspaceTable rows={workspace || []} columns={[{ key: 'processArea', label: 'Process Area' }, { key: 'riskDescription', label: 'Risk' }, { key: 'controlDescription', label: 'Control' }, { key: 'controlOwner', label: 'Owner' }, { key: 'controlType', label: 'Type' }, { key: 'frequency', label: 'Frequency' }, { key: 'testingApproach', label: 'Testing Approach' }, { key: 'status', label: 'Status', type: 'status' }]} onAdd={() => addTracker({ processArea: 'New process', riskDescription: 'Risk', controlDescription: 'Control', status: 'DRAFT' })} onUpdate={updateTracker} onDelete={deleteTracker} />;
    if (trackerType === 'sampling') return <GenericWorkspaceTable rows={workspace || []} columns={[{ key: 'populationName', label: 'Population' }, { key: 'populationSize', label: 'Size' }, { key: 'samplingMethod', label: 'Method' }, { key: 'sampleSize', label: 'Sample Size' }, { key: 'selectedSamples', label: 'Samples Selected' }, { key: 'status', label: 'Status', type: 'status' }]} onAdd={() => addTracker({ populationName: 'New population', status: 'PENDING' })} onUpdate={updateTracker} onDelete={deleteTracker} />;
    if (trackerType === 'weekly') return <GenericWorkspaceTable rows={workspace || []} columns={[{ key: 'weekStartDate', label: 'Week Start', type: 'date' }, { key: 'summary', label: 'Summary' }, { key: 'completedWork', label: 'Completed' }, { key: 'pendingWork', label: 'Pending' }, { key: 'blockers', label: 'Blockers' }, { key: 'nextSteps', label: 'Next Steps' }]} onAdd={() => addTracker({ weekStartDate: new Date().toISOString().slice(0, 10), summary: 'Weekly update' })} onUpdate={updateTracker} onDelete={deleteTracker} />;
    if (trackerType === 'interim') return <GenericWorkspaceTable rows={workspace || []} columns={[{ key: 'reviewerId', label: 'Reviewer' }, { key: 'reviewDate', label: 'Review Date', type: 'date' }, { key: 'reviewComments', label: 'Comments' }, { key: 'openPoints', label: 'Open Points' }, { key: 'resolvedPoints', label: 'Resolved' }, { key: 'status', label: 'Status', type: 'status' }]} onAdd={() => addTracker({ status: 'PENDING' })} onUpdate={updateTracker} onDelete={deleteTracker} />;
    if (trackerType === 'reports') return <GenericWorkspaceTable rows={workspace || []} columns={[{ key: 'version', label: 'Version' }, { key: 'reportType', label: 'Type' }, { key: 'repositoryItemId', label: 'Repository Item' }, { key: 'status', label: 'Status', type: 'status' }]} onAdd={() => addTracker({ version: 'v1', reportType: milestone.milestoneName.includes('Final') ? 'FINAL' : 'DRAFT', status: 'DRAFT' })} onUpdate={updateTracker} onDelete={deleteTracker} />;
    if (trackerType === 'report-reviews') return <GenericWorkspaceTable rows={workspace || []} columns={[{ key: 'comment', label: 'Comment' }, { key: 'severity', label: 'Severity' }, { key: 'reviewerId', label: 'Reviewer' }, { key: 'status', label: 'Status', type: 'status' }, { key: 'resolvedAt', label: 'Resolved On', type: 'date' }]} onAdd={() => addTracker({ comment: 'New review comment', status: 'OPEN' })} onUpdate={updateTracker} onDelete={deleteTracker} />;
    if (trackerType === 'submissions') return <GenericWorkspaceTable rows={workspace || []} columns={[{ key: 'submittedTo', label: 'Submitted To' }, { key: 'submittedDate', label: 'Submitted Date', type: 'date' }, { key: 'submissionMode', label: 'Mode' }, { key: 'status', label: 'Status', type: 'status' }]} onAdd={() => addTracker({ status: 'PENDING' })} onUpdate={updateTracker} onDelete={deleteTracker} />;
    return <div className="rounded-lg border border-slate-200 bg-white p-6 font-semibold text-slate-600">Workspace view is ready for this milestone type.</div>;
  };

  return (
    <PageContainer
      title={milestone.milestoneName}
      subtitle={`${milestone.project?.projectName || 'Project'} - ${(milestone.workspaceType || 'WORKSPACE').replaceAll('_', ' ')}`}
      actions={<button onClick={() => navigate(`/projects/${id}`)} className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Project</button>}
    >
      {error && <div className="rounded border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Milestone Workspace</p>
            <h1 className="text-2xl font-extrabold text-slate-950">{milestone.milestoneName}</h1>
            <p className="text-sm font-semibold text-slate-500">{milestone.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Metric label="Status" value={milestone.isOverdue ? 'OVERDUE' : milestone.status} />
            <Metric label="Owner" value={milestone.owner?.name || userName(users, milestone.ownerId) || 'Unassigned'} />
            <Metric label="Target" value={formatDate(milestone.targetDate)} />
            <Metric label="Progress" value={`${milestone.progressPercentage || 0}%`} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <select className={inputClass} value={milestone.status} onChange={(event) => updateMilestone({ status: event.target.value })}>
            {['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'].map((status) => <option key={status}>{status}</option>)}
          </select>
          <input className={inputClass} type="date" value={milestone.targetDate?.slice(0, 10) || ''} onChange={(event) => updateMilestone({ targetDate: event.target.value || null })} />
          <Link to="/repository" className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">Attach from Repository</Link>
          <Link to="/repository" className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Upload from Device</Link>
          <Link to="/repository" className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Get from Google Drive</Link>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${milestone.progressPercentage || 0}%` }} /></div>
        <p className="mt-2 text-xs font-bold text-slate-500">Required action: {milestone.requiredAction || 'Open milestone workspace'}</p>
      </div>
      {renderWorkspace()}
    </PageContainer>
  );
}

export function ProjectDetailsPage() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useCurrentUser();
  const [project, setProject] = useState<ApiProject | null>(null);
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  const reload = async () => {
    setError('');
    const [projectData, userData] = await Promise.all([
      apiJson(`/api/projects/${id}`),
      apiJson('/api/users'),
    ]);
    setProject(projectData);
    setUsers(normalizeUsers(userData));
  };

  useEffect(() => {
    setLoading(true);
    reload().catch((err) => setError(err.message || 'Unable to load project')).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get('tab');
    if (requestedTab && tabs.includes(requestedTab)) setActiveTab(requestedTab);
  }, [location.search]);

  useEffect(() => {
    const openTab = (event: Event) => {
      const tab = (event as CustomEvent<string>).detail;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('auditie-open-tab', openTab);
    return () => window.removeEventListener('auditie-open-tab', openTab);
  }, []);

  const tabs = ['Overview', 'Assignments', 'Repository', 'Queries', 'Observations', 'Reports', 'Timeline'];
  const canEdit = currentUser?.role === 'ADMIN' || project?.auditManagerId === currentUser?.id;

  const deleteProject = async () => {
    if (!project || !confirm(`Delete project "${project.projectName}"? This cannot be undone.`)) return;
    await apiJson(`/api/projects/${project.id}`, { method: 'DELETE' });
    navigate('/projects');
  };

  if (loading) return <PageContainer title="Project" subtitle="Loading assignment"><div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading assignment...</div></PageContainer>;
  if (!project) return <PageContainer title="Project" subtitle="Not found"><div className="rounded border border-rose-100 bg-rose-50 p-6 text-rose-700">{error || 'Project not found'}</div></PageContainer>;

  return (
    <PageContainer
      title={project.clientName}
      subtitle={`${project.natureOfProject || project.frameworks} - ${project.currentStage || 'Planning'}`}
      actions={
        <div className="flex items-center gap-2">
          <span className={statusPill(project.status)}>{project.status}</span>
          {canEdit && <button onClick={() => setShowEdit(true)} className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white">Edit Project</button>}
          {currentUser?.role === 'ADMIN' && <button onClick={deleteProject} className="rounded bg-rose-600 px-3 py-2 text-xs font-bold text-white">Delete</button>}
          <button onClick={() => navigate('/projects')} className="rounded bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Portfolio</button>
        </div>
      }
    >
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-blue-50 text-blue-700"><ShieldCheck className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-950">{project.projectName}</h1>
              <p className="text-sm font-semibold text-slate-500">Execution: {formatDate(project.assignmentExecutionStartDate)} to {formatDate(project.assignmentExecutionEndDate)}</p>
            </div>
          </div>
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-xs font-bold text-slate-600"><span>Overall Progress</span><span>{project.progressPercentage || 0}%</span></div>
            <div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${project.progressPercentage || 0}%` }} /></div>
          </div>
        </div>
      </div>

      {error && <div className="rounded border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn('whitespace-nowrap border-b-2 px-3 py-3 text-sm font-bold', activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-950')}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && <ProjectOverviewTab project={project} users={users} />}
      {activeTab === 'Assignments' && <TeamAreaAllocationTab project={project} users={users} reload={reload} />}
      {activeTab === 'Repository' && <EvidenceTab project={project} reload={reload} />}
      {activeTab === 'Queries' && <QueriesDiscussionTab project={project} users={users} reload={reload} />}
      {activeTab === 'Observations' && <ProjectObservationsTab project={project} />}
      {activeTab === 'Reports' && <ReportsTab project={project} reload={reload} />}
      {activeTab === 'Timeline' && <ReviewProgramTimelineTab project={project} users={users} reload={reload} />}

      {showEdit && (
        <ProjectEditorModal
          users={users}
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setProject(updated);
            setShowEdit(false);
          }}
        />
      )}
    </PageContainer>
  );
}
