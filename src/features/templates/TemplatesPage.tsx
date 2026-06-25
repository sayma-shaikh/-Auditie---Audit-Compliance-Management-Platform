import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileText,
  FileUp,
  Package,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type WorkspaceTab = 'templates' | 'registers' | 'generated';
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ProjectOption = {
  id: string;
  projectName: string;
  clientName: string;
  frameworks?: string;
  natureOfProject?: string | null;
  registeredOfficeAddress?: string | null;
  corporateOfficeAddress?: string | null;
  website?: string | null;
  typeOfIndustry?: string | null;
  assignmentPeriodCoverage?: string | null;
  auditManagerId?: string | null;
};

const commonFieldKeys = [
  'CLIENT_LEGAL_NAME',
  'CLIENT_SHORT_NAME',
  'DOCUMENT_REFERENCE_PREFIX',
  'EFFECTIVE_DATE',
  'NEXT_REVIEW_DATE',
  'INTRODUCTION_TEXT',
];

const allowedPlaceholderKeys = [...commonFieldKeys, 'CLIENT_LOGO'];
type ValidationWarning = {
  scope: string;
  stepNumber: WizardStep;
  fieldKey: string;
  templateId?: string;
  location: string;
  message: string;
};

function PageContainer({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex-1 min-h-screen bg-slate-50 flex flex-col lg:ml-0">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-4 px-8 shrink-0">
        <div className="min-w-0">
          <h1 className="truncate text-base font-extrabold text-slate-950">{title}</h1>
          {subtitle && <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-400">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-7xl space-y-6">{children}</div>
      </main>
    </div>
  );
}

function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.id) setUser(data);
      })
      .catch(() => {});
  }, []);
  return user;
}

function parseJson(value: any, fallback: any) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function apiJson(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

function labelFromKey(key: string) {
  return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function shortPreview(value: any, limit = 180) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'Not detected';
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function deriveShortNameFromClientName(value?: string | null) {
  const words = String(value || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return '';
  const suffixes = new Set(['pvt', 'ltd', 'limited', 'private', 'llp', 'llc', 'inc', 'corp', 'corporation', 'company', 'co']);
  const filtered = words.filter((word, index) => index === 0 || !suffixes.has(word.toLowerCase().replace(/\./g, '')));
  return filtered[0] || words[0] || '';
}

function normalizeProjects(data: any): ProjectOption[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.projects)) return data.projects;
  return [];
}

function fieldInputClass() {
  return 'w-full rounded border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
}

function BulkGenerateWizard({
  templates,
  selectedIds,
  initialProjectId,
  onClose,
  onComplete,
}: {
  templates: any[];
  selectedIds: string[];
  initialProjectId: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId || 'global');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(selectedIds);
  const [filters, setFilters] = useState({ framework: '', category: '', status: 'READY' });
  const [commonValues, setCommonValues] = useState<Record<string, string>>({
    CLIENT_LEGAL_NAME: '',
    CLIENT_SHORT_NAME: '',
    EFFECTIVE_DATE: '',
    NEXT_REVIEW_DATE: '',
    DOCUMENT_REFERENCE_PREFIX: '',
    INTRODUCTION_TEXT: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const templateRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [focusedTemplateId, setFocusedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    apiJson('/api/projects')
      .then((data) => setProjects(normalizeProjects(data)))
      .catch(() => setProjects([]));
  }, []);

  const selectedProject = projects.find((project) => project.id === projectId);
  const selectedTemplates = templates.filter((template) => selectedTemplateIds.includes(template.id));

  useEffect(() => {
    if (!selectedProject) return;
    setCommonValues((prev) => ({
      ...prev,
      CLIENT_LEGAL_NAME: prev.CLIENT_LEGAL_NAME || selectedProject.clientName || '',
      CLIENT_SHORT_NAME: prev.CLIENT_SHORT_NAME || deriveShortNameFromClientName(selectedProject.clientName),
      DOCUMENT_REFERENCE_PREFIX: prev.DOCUMENT_REFERENCE_PREFIX || selectedProject.clientName || '',
      INTRODUCTION_TEXT: prev.INTRODUCTION_TEXT || `${selectedProject.clientName} is a ${selectedProject.typeOfIndustry || 'business'} organization undergoing ${selectedProject.natureOfProject || selectedProject.frameworks || 'audit'} readiness.`,
    }));
  }, [selectedProject?.id]);

  const visibleTemplates = templates.filter((template) => {
    const statusOk = !filters.status || template.status === filters.status;
    const frameworkOk = !filters.framework || template.framework === filters.framework;
    const categoryOk = !filters.category || template.category === filters.category;
    return statusOk && frameworkOk && categoryOk;
  });

  const frameworkOptions = Array.from(new Set(templates.map((template) => template.framework).filter(Boolean)));
  const categoryOptions = Array.from(new Set(templates.map((template) => template.category).filter(Boolean)));

  const validate = () => {
    const warnings: ValidationWarning[] = [];
    if (!projectId) warnings.push({ scope: 'Batch', stepNumber: 1, fieldKey: 'projectId', location: 'Project selection', message: 'Project or client is required.' });
    if (!selectedTemplateIds.length) warnings.push({ scope: 'Batch', stepNumber: 2, fieldKey: 'templateIds', location: 'Template selection', message: 'Select at least one template.' });
    commonFieldKeys.forEach((key) => {
      if (!commonValues[key]) {
        warnings.push({
          scope: 'Common fields',
          stepNumber: 3,
          fieldKey: key,
          location: key === 'INTRODUCTION_TEXT' ? 'Introduction textarea' : 'Replacement Fields input',
          message: `${labelFromKey(key)} is missing.`,
        });
      }
    });
    if (!logoFile) {
      warnings.push({
        scope: 'Common fields',
        stepNumber: 3,
        fieldKey: 'CLIENT_LOGO',
        location: 'Logo upload input',
        message: 'Client Logo is missing.',
      });
    }
    selectedTemplates.forEach((template) => {
      const detection = parseJson(template.placeholdersDetected, { detections: [] });
      const ref = (detection.detections || []).find((item: any) => item.placeholder === 'DOCUMENT_REFERENCE_PREFIX');
      if (!ref?.referenceSuffix) {
        warnings.push({
          scope: template.title,
          stepNumber: 4,
          fieldKey: 'DOCUMENT_REFERENCE_PREFIX',
          templateId: template.id,
          location: 'Reference check row',
          message: 'Document reference suffix could not be detected for this template. Verify the old prefix mapping before generation.',
        });
      }
      if (!detection.detections?.some((item: any) => item.placeholder === 'INTRODUCTION_TEXT')) {
        warnings.push({
          scope: template.title,
          stepNumber: 4,
          fieldKey: 'INTRODUCTION_TEXT',
          templateId: template.id,
          location: 'Template section mapping',
          message: 'Introduction section detection is missing for this template. Verify the source content before generation.',
        });
      }
    });
    setValidationWarnings(warnings);
    return warnings;
  };

  const generate = async () => {
    const warnings = validate();
    if (warnings.length && !confirm('Validation warnings exist. Continue generation anyway?')) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('templateIds', JSON.stringify(selectedTemplateIds));
      formData.append('commonValues', JSON.stringify(commonValues));
      formData.append('documentOverrides', JSON.stringify([]));
      formData.append('outputFormat', 'DOCX');
      formData.append('saveToRepository', 'false');
      if (logoFile) formData.append('clientLogo', logoFile);
      const data = await apiJson('/api/templates/bulk-generate', {
        method: 'POST',
        body: formData,
      });
      setResult(data);
      setStep(7);
      onComplete();
    } catch (error: any) {
      alert(error?.message || 'Bulk generation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const acceptLogoFile = (file?: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      alert('Use PNG, JPG, JPEG, or WEBP for the client logo.');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const fixWarning = (warning: ValidationWarning) => {
    setFocusedTemplateId(warning.templateId || null);
    setStep((warning.stepNumber || 3) as WizardStep);
    setTimeout(() => {
      if (warning.fieldKey === 'CLIENT_LOGO') {
        logoInputRef.current?.click();
        return;
      }
      if (warning.templateId && templateRowRefs.current[warning.templateId]) {
        templateRowRefs.current[warning.templateId]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      fieldRefs.current[warning.fieldKey]?.focus();
    }, 80);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex h-full max-h-[94vh] max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-extrabold text-slate-950">Bulk Generate Documents</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Step {step} of 7</p>
          </div>
          <button onClick={onClose} className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr]">
          <aside className="border-r border-slate-200 bg-slate-50 p-4">
            {['Project', 'Templates', 'Replacement Fields', 'Reference Check', 'Preview', 'Generate', 'Output'].map((label, index) => (
              <button key={label} onClick={() => setStep((index + 1) as WizardStep)} className={cn('mb-1 flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-bold', step === index + 1 ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white')}>
                <span className="flex h-5 w-5 items-center justify-center rounded bg-white/20 text-[10px]">{index + 1}</span>
                {label}
              </button>
            ))}
          </aside>

          <main className="min-h-0 overflow-y-auto p-6">
            {step === 1 && (
              <section className="space-y-4">
                <h3 className="font-extrabold text-slate-950">Select Project / Client</h3>
                <select className={fieldInputClass()} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                  <option value="global">Global / Manual Client</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.projectName || project.clientName}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Client', selectedProject?.clientName || commonValues.CLIENT_LEGAL_NAME || '-'],
                    ['Framework', selectedProject?.frameworks || selectedProject?.natureOfProject || '-'],
                    ['Registered Office', selectedProject?.registeredOfficeAddress || '-'],
                    ['Website', selectedProject?.website || '-'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-950">Select Templates</h3>
                  <span className="text-xs font-bold text-blue-600">{selectedTemplateIds.length} selected</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <select className={fieldInputClass()} value={filters.framework} onChange={(event) => setFilters({ ...filters, framework: event.target.value })}><option value="">All Frameworks</option>{frameworkOptions.map((item) => <option key={item}>{item}</option>)}</select>
                  <select className={fieldInputClass()} value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All Categories</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select>
                  <select className={fieldInputClass()} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Any Status</option><option value="READY">Ready for Generation</option><option value="DETECTED">Detection Completed</option></select>
                </div>
                <div className="divide-y divide-slate-100 rounded border border-slate-200">
                  {visibleTemplates.map((template) => (
                    <label key={template.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      <input type="checkbox" checked={selectedTemplateIds.includes(template.id)} onChange={() => toggleTemplate(template.id)} />
                      <FileText className="h-4 w-4 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{template.title}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{template.framework} / {template.category}</p>
                      </div>
                      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">{template.status}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-4">
                <h3 className="font-extrabold text-slate-950">Common Replacement Fields</h3>
                <div className="grid grid-cols-2 gap-3">
                  {commonFieldKeys.map((key) => (
                    <label key={key} className={cn(key.includes('TEXT') || key.includes('OFFICE') ? 'col-span-2' : '')}>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{labelFromKey(key)}</span>
                      {key.includes('TEXT') || key.includes('OFFICE') ? (
                        <textarea ref={(node) => { fieldRefs.current[key] = node; }} className={cn(fieldInputClass(), 'min-h-20')} value={commonValues[key] || ''} onChange={(event) => setCommonValues({ ...commonValues, [key]: event.target.value })} />
                      ) : (
                        <input ref={(node) => { fieldRefs.current[key] = node; }} className={fieldInputClass()} value={commonValues[key] || ''} onChange={(event) => setCommonValues({ ...commonValues, [key]: event.target.value })} />
                      )}
                    </label>
                  ))}
                </div>
                <div
                  onPaste={(event) => {
                    const files = Array.from(event.clipboardData.files || []) as File[];
                    const file = files.find((item) => item.type?.startsWith('image/'));
                    acceptLogoFile(file);
                  }}
                  className="rounded border border-dashed border-slate-300 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">Client Logo</p>
                      <p className="text-xs font-semibold text-slate-500">Upload or paste PNG, JPG, JPEG, or WEBP. The backend replaces the first DOCX logo image, not text.</p>
                    </div>
                    <label className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white cursor-pointer">
                      Upload Logo
                      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(event) => acceptLogoFile(event.target.files?.[0])} />
                    </label>
                  </div>
                  {logoPreview && <img src={logoPreview} alt="Client logo preview" className="mt-3 h-16 max-w-48 rounded border border-slate-200 bg-white object-contain p-2" />}
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="space-y-4">
                <h3 className="font-extrabold text-slate-950">Document Reference Prefix Check</h3>
                <p className="text-sm font-semibold text-slate-600">Only the prefix before /ISMS/, /ISO/, /SOC2/, or /ITGC/ will be changed. Policy numbers and suffixes stay unchanged.</p>
                <div className="divide-y divide-slate-100 rounded border border-slate-200">
                  {selectedTemplates.map((template) => {
                    const detection = parseJson(template.placeholdersDetected, { detections: [] });
                    const ref = (detection.detections || []).find((item: any) => item.placeholder === 'DOCUMENT_REFERENCE_PREFIX');
                    const staleValues = Array.from(new Set((detection.staleBrandingSeeds || []).filter(Boolean))).slice(0, 6);
                    return (
                      <div
                        key={template.id}
                        ref={(node) => { templateRowRefs.current[template.id] = node; }}
                        className={cn(
                          'space-y-3 px-4 py-3 text-xs',
                          focusedTemplateId === template.id ? 'bg-amber-50 ring-1 ring-amber-300' : '',
                        )}
                      >
                        <div className="grid grid-cols-[1fr_220px_220px] gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{template.title}</p>
                          <p className="text-slate-500">{ref?.fullReference || 'No reference detected'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Old Prefix</p>
                          <p className="font-semibold text-slate-700">{ref?.originalValue || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Prefix</p>
                          <p className="font-semibold text-blue-700">{commonValues.DOCUMENT_REFERENCE_PREFIX || '-'}</p>
                        </div>
                      </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detected Old Values</p>
                          <p className="mt-1 text-slate-500">{staleValues.length ? staleValues.join(' | ') : 'No old branding values detected'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 5 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-950">Template Preview and Validation</h3>
                  <button onClick={validate} className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">Run Validation</button>
                </div>
                <div className="grid gap-4">
                  {selectedTemplates.map((template) => {
                    const detection = parseJson(template.placeholdersDetected, { detections: [], staleBrandingSeeds: [] });
                    const detectedNames = (detection.detections || [])
                      .filter((item: any) => item.placeholder === 'CLIENT_LEGAL_NAME' || item.placeholder === 'CLIENT_SHORT_NAME')
                      .flatMap((item: any) => item.oldValues?.length ? item.oldValues : [item.originalValue])
                      .filter(Boolean);
                    const detectedDates = (detection.detections || [])
                      .filter((item: any) => item.placeholder === 'EFFECTIVE_DATE' || item.placeholder === 'NEXT_REVIEW_DATE');
                    const introduction = (detection.detections || []).find((item: any) => item.placeholder === 'INTRODUCTION_TEXT');
                    const logo = (detection.detections || []).find((item: any) => item.placeholder === 'CLIENT_LOGO');

                    return (
                      <div key={template.id} className="rounded border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{template.title}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{template.framework} / {template.category}</p>
                          </div>
                          <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">Preview Ready</span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detected Company Names</p>
                            <p className="mt-1 text-xs font-semibold text-slate-700">{detectedNames.length ? Array.from(new Set(detectedNames)).slice(0, 6).join(' | ') : 'Not detected'}</p>
                          </div>
                          <div className="rounded border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detected Dates</p>
                            <p className="mt-1 text-xs font-semibold text-slate-700">{detectedDates.length ? detectedDates.map((item: any) => `${item.label}: ${item.originalValue}`).join(' | ') : 'Not detected'}</p>
                          </div>
                          <div className="rounded border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detected Logos</p>
                            <p className="mt-1 text-xs font-semibold text-slate-700">{logo?.originalValue || 'No embedded logo detected'}</p>
                          </div>
                          <div className="rounded border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Replacement Summary</p>
                            <p className="mt-1 text-xs font-semibold text-slate-700">
                              Client: {commonValues.CLIENT_LEGAL_NAME || '-'} | Review: {commonValues.NEXT_REVIEW_DATE || '-'} | Logo: {logoFile ? 'Queued' : 'Missing'}
                            </p>
                          </div>
                          <div className="rounded border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detected Introduction Section</p>
                            <p className="mt-1 text-xs font-semibold text-slate-700">{shortPreview(introduction?.originalValue)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded border border-slate-200">
                  {validationWarnings.length === 0 ? (
                    <div className="p-8 text-center text-sm font-semibold text-slate-500">No validation issues found.</div>
                  ) : validationWarnings.map((warning, index) => (
                    <div key={`${warning.scope}-${index}`} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{warning.scope}</p>
                        <p className="text-xs text-amber-700">{warning.message}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Step {warning.stepNumber} / {warning.fieldKey} / {warning.location}</p>
                      </div>
                      <button onClick={() => fixWarning(warning)} className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">Fix Now</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {step === 6 && (
              <section className="space-y-4">
                <h3 className="font-extrabold text-slate-950">Generate Editable DOCX Files</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Templates</p><p className="text-2xl font-extrabold text-slate-900">{selectedTemplateIds.length}</p></div>
                  <div className="rounded border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Warnings</p><p className="text-2xl font-extrabold text-amber-600">{validationWarnings.length}</p></div>
                  <div className="rounded border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Output</p><p className="text-2xl font-extrabold text-blue-600">DOCX + ZIP</p></div>
                </div>
                <button disabled={submitting} onClick={generate} className="rounded bg-blue-600 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50">{submitting ? 'Generating...' : 'Generate Batch'}</button>
              </section>
            )}

            {step === 7 && (
              <section className="space-y-4">
                <h3 className="font-extrabold text-slate-950">Generated Output</h3>
                {result ? (
                  <>
                    <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 p-4">
                      <div><p className="font-bold text-emerald-900">Batch complete</p><p className="text-xs font-semibold text-emerald-700">{result.generatedDocuments?.length || 0} documents generated</p></div>
                      {result.zipDownloadUrl && <button onClick={() => window.open(result.zipDownloadUrl, '_blank')} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><Package className="mr-1 inline h-3.5 w-3.5" />Download All ZIP</button>}
                    </div>
                    <div className="rounded border border-slate-200 bg-white">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-bold text-slate-900">Replacement Report</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shown before document download</p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {(result.replacementReports || []).map((report: any) => (
                          <div key={report.templateId} className="px-4 py-3">
                            <p className="text-sm font-bold text-slate-900">{report.templateName}</p>
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              <div className="rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Company Name: {report.companyName ? `✓ ${report.companyName.replaced} replacements` : 'Not detected'}</div>
                              <div className="rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Short Name: {report.shortName ? `✓ ${report.shortName.replaced} replacements` : 'Not detected'}</div>
                              <div className="rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Document Reference Prefix: {report.documentReferencePrefix ? `✓ ${report.documentReferencePrefix.replaced} replacements` : 'Not detected'}</div>
                              <div className="rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Review Date: {report.reviewDate ? `✓ ${report.reviewDate.replaced} replacements` : 'Not detected'}</div>
                              <div className="rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Effective Date: {report.effectiveDate ? `✓ ${report.effectiveDate.replaced} replacements` : 'Not detected'}</div>
                              <div className="rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Logo: {report.logo?.ok ? `✓ ${report.logo.replaced} replacements` : 'Not replaced'}</div>
                              <div className="rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Introduction: {report.introduction?.replaced ? '✓ section replaced' : 'Not replaced'}</div>
                              <div className="rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Warnings: {report.warningsCount || 0}</div>
                            </div>
                            {!!report.valuesUsed && (
                              <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                                Values Used: Effective `{report.valuesUsed.effectiveDate || '-'}` | Review `{report.valuesUsed.nextReviewDate || '-'}`
                              </div>
                            )}
                          </div>
                        ))}
                        {!result.replacementReports?.length && <div className="px-4 py-6 text-sm font-semibold text-slate-500">No replacement report available.</div>}
                      </div>
                    </div>
                    {!!result.warnings?.length && (
                      <div className="rounded border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-bold text-amber-900">Warnings</p>
                        <div className="mt-2 space-y-2">
                          {result.warnings.map((warning: any, index: number) => (
                            <div key={index} className="text-xs font-semibold text-amber-800">
                              {warning.templateName || warning.templateId || 'Template'}: {(warning.warnings || []).join(' | ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="rounded border border-slate-200">
                      {(result.generatedDocuments || []).map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0">
                          <div><p className="text-sm font-bold text-slate-900">{doc.documentName}</p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{doc.status}</p></div>
                          <button onClick={() => window.open(`/api/generated-documents/${doc.id}/download-docx`, '_blank')} className="text-xs font-bold text-blue-600">Download DOCX</button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="text-sm font-semibold text-slate-500">No batch generated yet.</p>}
              </section>
            )}
          </main>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button disabled={step === 1} onClick={() => setStep((Math.max(1, step - 1) as WizardStep))} className="rounded border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"><ArrowLeft className="mr-1 inline h-3.5 w-3.5" />Back</button>
          {step < 7 && <button onClick={() => setStep((Math.min(7, step + 1) as WizardStep))} className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white">Next<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>}
        </div>
      </motion.div>
    </div>
  );
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [selectedRegister, setSelectedRegister] = useState<any | null>(null);
  const [registerPreview, setRegisterPreview] = useState<any | null>(null);
  const [mapping, setMapping] = useState<Record<string, any>>({});
  const [includedPlaceholders, setIncludedPlaceholders] = useState<Record<string, boolean>>({});
  const [workspace, setWorkspace] = useState<WorkspaceTab>('templates');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState('global');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showBulkWizard, setShowBulkWizard] = useState(false);
  const user = useCurrentUser();
  const versionInputRef = useRef<HTMLInputElement | null>(null);

  const loadTemplates = () => {
    fetch('/api/templates', { credentials: 'include' }).then(res => res.json()).then(data => {
      setTemplates(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  };

  const loadRegisters = () => {
    fetch(`/api/projects/${projectId}/registers`, { credentials: 'include' }).then(res => res.json()).then(data => setRegisters(Array.isArray(data) ? data : []));
  };

  const loadBatches = () => {
    fetch('/api/document-generation-batches', { credentials: 'include' }).then(res => res.json()).then(data => setBatches(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    loadTemplates();
    loadBatches();
  }, []);

  useEffect(() => {
    loadRegisters();
  }, [projectId]);

  const openTemplate = (template: any) => {
    const detection = parseJson(template.placeholdersDetected, { detections: [] });
    setSelectedTemplate(template);
    const savedMapping = parseJson(template.placeholderMapping, {});
    const nextMapping: Record<string, any> = {};
    (detection.detections || []).forEach((item: any) => {
      nextMapping[item.placeholder] = savedMapping[item.placeholder]?.oldValues
        ? savedMapping[item.placeholder]
        : { oldValues: item.oldValues?.length ? item.oldValues : [item.originalValue].filter(Boolean) };
    });
    setMapping(nextMapping);
    setIncludedPlaceholders(Object.fromEntries((detection.detections || []).map((item: any) => [item.placeholder, true])));
  };

  const detections = selectedTemplate ? parseJson(selectedTemplate.placeholdersDetected, { detections: [] }).detections || [] : [];

  const saveMapping = async () => {
    if (!selectedTemplate) return;
    const filteredMapping = Object.fromEntries(Object.entries(mapping).filter(([key]) => includedPlaceholders[key] !== false && allowedPlaceholderKeys.includes(key)));
    try {
      const data = await apiJson(`/api/templates/${selectedTemplate.id}/save-placeholder-mapping`, {
        method: 'POST',
        body: JSON.stringify({ mapping: filteredMapping }),
      });
      setSelectedTemplate(data);
      setTemplates(prev => prev.map(item => item.id === data.id ? data : item));
      alert('Placeholder mapping confirmed. Template is ready for generation.');
    } catch (error: any) {
      alert(error?.message || 'Could not save placeholder mapping');
    }
  };

  const rerunDetection = async (templateId: string) => {
    try {
      const data = await apiJson(`/api/templates/${templateId}/detect-metadata`, { method: 'POST' });
      setSelectedTemplate(data);
      setTemplates(prev => prev.map(item => item.id === data.id ? data : item));
      openTemplate(data);
    } catch (error: any) {
      alert(error?.message || 'Detection failed');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const title = prompt('Enter Template Title', file.name.replace(/\.docx$/i, ''));
    const framework = prompt('Enter Framework (e.g. ISO 27001)', 'ISO 27001');
    const category = prompt('Enter Category (Policy, Procedure, SOP, Template)', 'Policy');
    if (!title || !framework || !category) return;

    const formData = new FormData();
    formData.append('template', file);
    formData.append('title', title);
    formData.append('framework', framework);
    formData.append('category', category);
    formData.append('templateType', 'DOCX_POLICY');

    setUploading(true);
    try {
      const res = await fetch('/api/templates/upload', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      if (!res.ok) return alert(data.message || 'Upload failed');
      setTemplates(prev => [data, ...prev]);
      openTemplate(data);
      alert('Upload completed. Metadata detection is ready for review.');
    } catch {
      alert('Upload failed. Check backend terminal for details.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async (templateId: string) => {
    const values = {
      CLIENT_LEGAL_NAME: prompt('Client Legal Name', '') || '',
      CLIENT_SHORT_NAME: prompt('Client Short Name', '') || '',
      DOCUMENT_REFERENCE_PREFIX: prompt('Document Reference Prefix', '') || '',
      EFFECTIVE_DATE: prompt('Effective Date', '') || '',
      NEXT_REVIEW_DATE: prompt('Next Review Date', '') || '',
    };
    try {
      const data = await apiJson(`/api/templates/${templateId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ projectId, values }),
      });
      window.open(data.downloadUrl, '_blank');
      loadBatches();
    } catch (error: any) {
      alert(error?.message || 'Generation failed');
    }
  };

  const handleDeleteTemplate = async (template: any) => {
    const confirmed = window.confirm(`Delete policy template "${template.title}" from the active library?`);
    if (!confirmed) return;

    try {
      const data = await apiJson(`/api/templates/${template.id}`, { method: 'DELETE' });
      setTemplates((prev) => prev.filter((item) => item.id !== template.id));
      setSelectedTemplateIds((prev) => prev.filter((id) => id !== template.id));
      if (selectedTemplate?.id === template.id) {
        setSelectedTemplate(null);
        setMapping({});
        setIncludedPlaceholders({});
      }
      alert(data.message || 'Template deleted successfully.');
    } catch (error: any) {
      alert(error?.message || 'Template delete failed');
    }
  };

  const openRegister = async (id: string) => {
    try {
      const data = await apiJson(`/api/registers/${id}/preview`);
      setSelectedRegister(data);
      setRegisterPreview(data);
    } catch (error: any) {
      alert(error?.message || 'Could not load register preview');
    }
  };

  const handleRegisterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('register', file);
    formData.append('registerName', prompt('Register Name', file.name.replace(/\.[^.]+$/, '')) || file.name.replace(/\.[^.]+$/, ''));
    formData.append('framework', prompt('Framework', 'ISO 27001') || 'ISO 27001');
    formData.append('linkedAuditArea', prompt('Linked Audit Area', 'Access Control') || '');
    formData.append('linkedControl', prompt('Linked Control', '') || '');
    formData.append('changeSummary', 'Initial upload');
    setUploading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/registers/upload`, { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      if (!res.ok) return alert(data.message || 'Register upload failed');
      setRegisters(prev => [data, ...prev]);
      await openRegister(data.id);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleNewRegisterVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRegister || !e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('register', e.target.files[0]);
    formData.append('changeSummary', prompt('Change Summary', 'Updated working register') || '');
    const res = await fetch(`/api/registers/${selectedRegister.id}/upload-new-version`, { method: 'POST', credentials: 'include', body: formData });
    const data = await res.json();
    if (!res.ok) return alert(data.message || 'Version upload failed');
    loadRegisters();
    await openRegister(data.id);
    e.target.value = '';
  };

  const updateRegisterStatus = async (action: 'approve' | 'request-update') => {
    if (!selectedRegister) return;
    try {
      const data = await apiJson(`/api/registers/${selectedRegister.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ details: action === 'request-update' ? prompt('Update request note', '') : '' }),
      });
      setSelectedRegister({ ...selectedRegister, status: data.status });
      setRegisterPreview({ ...registerPreview, status: data.status });
      loadRegisters();
    } catch (error: any) {
      alert(error?.message || 'Status update failed');
    }
  };

  const selectedTemplateCount = selectedTemplateIds.length;

  const generationDocuments = useMemo(() => batches.flatMap((batch) => batch.generatedDocuments || []), [batches]);

  return (
    <PageContainer
      title="Template Automation"
      subtitle="Smart policy templates, bulk DOCX generation, and controlled register management"
      actions={(
        <div className="flex items-center gap-2">
          <input value={projectId} onChange={(e) => setProjectId(e.target.value || 'global')} className="w-36 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold outline-none" />
          {workspace === 'templates' && (
            <button onClick={() => setShowBulkWizard(true)} className="rounded bg-blue-600 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
              <Package className="mr-1 inline h-3.5 w-3.5" />Bulk Generate{selectedTemplateCount ? ` (${selectedTemplateCount})` : ''}
            </button>
          )}
          {user?.role === 'ADMIN' && workspace === 'templates' && (
            <label className="bg-slate-900 text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md cursor-pointer">
              <FileUp className="w-3.5 h-3.5" />{uploading ? 'Processing...' : 'Upload Policy Template'}
              <input type="file" accept=".docx" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          )}
          {workspace === 'registers' && (
            <label className="bg-slate-900 text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md cursor-pointer">
              <Upload className="w-3.5 h-3.5" />{uploading ? 'Processing...' : 'Upload Register'}
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleRegisterUpload} disabled={uploading} />
            </label>
          )}
        </div>
      )}
    >
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-1 inline-flex">
          {[
            ['templates', 'Templates'],
            ['registers', 'Registers'],
            ['generated', 'Generated'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setWorkspace(key as WorkspaceTab)} className={cn("px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition", workspace === key ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900")}>{label}</button>
          ))}
        </div>

        {workspace === 'templates' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Template Library</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{templates.length} master templates</span>
              </div>
              <div className="divide-y divide-slate-100">
                {templates.map((template) => {
                  const detection = parseJson(template.placeholdersDetected, { detections: [] });
                  return (
                    <div key={template.id} className={cn("w-full px-5 py-4 hover:bg-slate-50 transition flex items-center justify-between gap-4", selectedTemplate?.id === template.id && "bg-blue-50/60")}>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" checked={selectedTemplateIds.includes(template.id)} onChange={() => setSelectedTemplateIds((prev) => prev.includes(template.id) ? prev.filter((id) => id !== template.id) : [...prev, template.id])} />
                      </label>
                      <button onClick={() => openTemplate(template)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">{template.title}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{template.framework} / {template.category}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest">{template.status || 'Uploaded'}</span>
                        <span className="text-[10px] font-bold text-blue-600">{(detection.detections || []).length} fields</span>
                        {user?.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(template)}
                            className="rounded border border-rose-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50"
                            title="Delete policy template"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {templates.length === 0 && !loading && <div className="py-12 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.25em]">No smart templates available</div>}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Metadata Detection Review</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedTemplate ? selectedTemplate.title : 'Select a template to review placeholder mapping.'}</p>
              </div>
              {selectedTemplate ? (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => rerunDetection(selectedTemplate.id)} className="px-3 py-2 rounded border border-slate-200 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 flex items-center justify-center gap-2"><Search className="w-3.5 h-3.5" />Detect</button>
                    <button onClick={saveMapping} className="px-3 py-2 rounded bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />Confirm</button>
                    <button onClick={() => handleGenerate(selectedTemplate.id)} className="px-3 py-2 rounded bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"><ArrowUpRight className="w-3.5 h-3.5" />Generate</button>
                  </div>
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {detections.filter((item: any) => allowedPlaceholderKeys.includes(item.placeholder)).map((item: any, index: number) => (
                      <div key={`${item.placeholder}-${index}`} className="border border-slate-200 rounded p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2">
                            <input type="checkbox" className="mt-1" checked={includedPlaceholders[item.placeholder] !== false} onChange={(event) => setIncludedPlaceholders({ ...includedPlaceholders, [item.placeholder]: event.target.checked })} />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{item.label}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{'{{'}{item.placeholder}{'}}'} / {item.sourceType}</p>
                              <p className="text-[10px] font-semibold text-slate-400">Found in: {item.sourceField}</p>
                            </div>
                          </label>
                          <span className="text-[10px] font-bold text-emerald-600">{Math.round((item.confidence || 0) * 100)}%</span>
                        </div>
                        {item.placeholder === 'CLIENT_LOGO' ? (
                          <p className="rounded bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">Logo is replaced through image upload during generation.</p>
                        ) : (
                          <textarea
                            value={(mapping[item.placeholder]?.oldValues || item.oldValues || [item.originalValue]).join('\n')}
                            onChange={(e) => setMapping({
                              ...mapping,
                              [item.placeholder]: { oldValues: e.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean) },
                            })}
                            className="min-h-20 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-blue-500"
                          />
                        )}
                      </div>
                    ))}
                    {detections.length === 0 && <p className="text-xs text-slate-400">No placeholders detected yet.</p>}
                  </div>
                </div>
              ) : <div className="p-8 text-center text-xs text-slate-400">Upload or select a DOCX policy to start automation.</div>}
            </div>
          </div>
        )}

        {workspace === 'registers' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Register Library</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Project {projectId}</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-3">Register</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Version</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {registers.map((register) => (
                    <tr key={register.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-bold text-slate-900">{register.registerName}</td>
                      <td className="px-5 py-4 text-slate-500">{register.registerType}</td>
                      <td className="px-5 py-4 text-slate-500">v{register.currentVersion}</td>
                      <td className="px-5 py-4"><span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest">{register.status}</span></td>
                      <td className="px-5 py-4 text-right"><button onClick={() => openRegister(register.id)} className="text-blue-600 font-bold uppercase tracking-widest text-[10px]">Preview</button></td>
                    </tr>
                  ))}
                  {registers.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">No registers uploaded for this project.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Register Preview</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedRegister?.registerName || 'Select a register to inspect metadata.'}</p>
              </div>
              {registerPreview ? (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sheets</p><p className="font-semibold text-slate-800">{(registerPreview.sheetNames || []).join(', ')}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Modified</p><p className="font-semibold text-slate-800">{new Date(registerPreview.lastModified).toLocaleDateString()}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Audit Area</p><p className="font-semibold text-slate-800">{registerPreview.linkedAuditArea || '-'}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Control</p><p className="font-semibold text-slate-800">{registerPreview.linkedControl || '-'}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => window.open(`/api/registers/${registerPreview.id}/download`, '_blank')} className="flex-1 px-3 py-2 rounded border border-slate-200 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"><Download className="w-3.5 h-3.5" />Download</button>
                    <button onClick={() => versionInputRef.current?.click()} className="flex-1 px-3 py-2 rounded bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest">New Version</button>
                    <input ref={versionInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleNewRegisterVersion} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateRegisterStatus('approve')} className="flex-1 px-3 py-2 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest">Approve</button>
                    <button onClick={() => updateRegisterStatus('request-update')} className="flex-1 px-3 py-2 rounded bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest">Request Update</button>
                  </div>
                  <div className="overflow-auto border border-slate-200 rounded max-h-72">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-slate-50 sticky top-0"><tr>{(registerPreview.detectedColumns || []).map((col: string) => <th key={col} className="px-2 py-2 font-bold text-slate-500 whitespace-nowrap">{col}</th>)}</tr></thead>
                      <tbody>{(registerPreview.previewRows || []).map((row: string[], idx: number) => <tr key={idx} className="border-t border-slate-100">{(registerPreview.detectedColumns || []).map((col: string, colIdx: number) => <td key={col} className="px-2 py-2 text-slate-600 whitespace-nowrap">{row[colIdx] || ''}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Version History</p>
                    <div className="space-y-2">{(registerPreview.versions || []).map((version: any) => <div key={version.id} className="flex justify-between text-xs bg-slate-50 rounded px-3 py-2"><span>v{version.versionNo}</span><span className="text-slate-400">{version.changeSummary || 'No summary'}</span></div>)}</div>
                  </div>
                </div>
              ) : <div className="p-8 text-center text-xs text-slate-400">Excel files remain controlled documents. Preview is read-only.</div>}
            </div>
          </div>
        )}

        {workspace === 'generated' && (
          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{batch.batchName}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{batch.generatedCount} generated / {batch.warningCount} warnings / {new Date(batch.generatedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">{batch.status}</span>
                    {batch.zipPath && <button onClick={() => window.open(`/api/document-generation-batches/${batch.id}/download-zip`, '_blank')} className="rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Package className="mr-1 inline h-3.5 w-3.5" />Download All ZIP</button>}
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400"><tr><th className="px-5 py-3">Document</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(batch.generatedDocuments || []).map((doc: any) => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-bold text-slate-900">{doc.documentName}</td>
                        <td className="px-5 py-4 text-slate-500">{doc.documentReferenceNo || '-'}</td>
                        <td className="px-5 py-4"><span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest">{doc.status}</span></td>
                        <td className="px-5 py-4 text-right"><button onClick={() => window.open(`/api/generated-documents/${doc.id}/download-docx`, '_blank')} className="text-blue-600 font-bold uppercase tracking-widest text-[10px]">Download DOCX</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {batches.length === 0 && generationDocuments.length === 0 && <div className="rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-slate-400">No generated batches yet.</div>}
          </div>
        )}
      </div>

      {showBulkWizard && (
        <BulkGenerateWizard
          templates={templates}
          selectedIds={selectedTemplateIds}
          initialProjectId={projectId}
          onClose={() => setShowBulkWizard(false)}
          onComplete={() => {
            loadBatches();
            setWorkspace('generated');
          }}
        />
      )}
    </PageContainer>
  );
}
