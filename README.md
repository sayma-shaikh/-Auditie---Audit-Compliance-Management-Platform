# Auditie - Audit & Compliance Management Platform

![Status](https://img.shields.io/badge/status-active%20development-blue)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61DAFB)
![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-339933)
![ORM](https://img.shields.io/badge/ORM-Prisma-2D3748)
![License](https://img.shields.io/badge/license-MIT-green)

**Auditie** is an enterprise audit management platform built for IT Audit and Compliance consulting firms. It digitizes the complete engagement lifecycle for audits such as ISO 27001, ISO 27701, SOC 2, ITGC, VAPT, PCI DSS, HIPAA, NIST, internal audits, and client-specific compliance reviews.

Instead of managing work across hundreds of Excel files, email trails, Google Drive folders, Word reports, and manual trackers, Auditie gives audit teams one structured workspace for projects, milestones, audit areas, working papers, evidence, observations, CAPA, reporting, users, and audit logs.

> Auditie is designed from an auditor's perspective: assign areas, complete working papers, upload evidence, submit to reviewers, raise observations, track CAPA, generate reports, and preserve a defensible audit trail.

---

## Why Auditie Exists

Audit and compliance consultancies often run complex engagements using tools that were never designed for audit execution.

| Common Problem | Impact on Audit Teams |
| --- | --- |
| Hundreds of Excel files | No single source of truth for checklists, samples, observations, or trackers |
| Version control issues | Teams lose time reconciling duplicate files and outdated working papers |
| Evidence scattered in email and Drive | Reviewers cannot easily trace evidence back to the exact checklist item |
| Manual checklist tracking | Progress is hard to monitor across areas and auditors |
| Manual observation and CAPA registers | Findings, owners, due dates, and closure status become disconnected |
| Weak reviewer workflow | Makers submit work, but reviewers lack a clean queue and context |
| No centralized dashboard | Managers cannot see project health, delays, or workload quickly |
| Limited audit trail | Approval, evidence, and checklist changes are difficult to defend |
| Duplicate work across frameworks | Similar controls are repeatedly recreated for each engagement |
| Poor collaboration | Audit managers, auditors, and reviewers work in silos |

Auditie replaces this fragmented way of working with a controlled, auditable, and reusable audit execution system.

---

## Product Overview

Auditie manages an audit engagement from planning to closure:

```text
Client
  |
  v
Project Created
  |
  v
Milestones Generated
  |
  v
Areas Assigned
  |
  v
Checklists / Working Papers Generated
  |
  v
Evidence Uploaded
  |
  v
Reviewer Verification
  |
  v
Observations Created
  |
  v
CAPA Tracked
  |
  v
Reports Generated
  |
  v
Project Closed
```

---

## Core Modules

| Module | Purpose |
| --- | --- |
| Dashboard | Overall audit health, workload, deadlines, review queue, and recent activity |
| Projects | Client engagements, frameworks, team allocation, timelines, status, and progress |
| Milestones | Audit lifecycle tracker with dynamic milestone workspaces |
| Audit Areas | Area-wise execution workspaces such as HR, Admin, IT Infrastructure, AWS, Linux, Applications, and more |
| Checklist Engine | Question-based reviews and spreadsheet-style table working papers |
| Evidence Repository | Central file and folder workspace with evidence linking |
| Observations | Finding register with severity, clause, owner, reviewer, and evidence |
| CAPA | Root cause, corrective action, preventive action, verification, and closure |
| Queries | Client questions, internal discussions, responses, status, and attachments |
| Reports | Draft report, final report, observation report, CAPA report, and audit outputs |
| Templates | Document automation for policies, procedures, standards, and registers |
| Users | User assignment, review queue, workload, and performance tracking |
| Audit Logs | Full activity trail for project, checklist, evidence, review, and status changes |

---

## Dashboard

The dashboard gives managers a command-center view of audit health:

- Current projects and active engagements
- Team workload and assigned tasks
- Delayed activities and upcoming deadlines
- Review queue and pending approvals
- Recent audit activity
- Performance metrics across users and projects

This helps Audit Managers identify bottlenecks before they become project delays.

---

## Project Management

Every client engagement is managed as a project. A project contains:

- Client information
- Framework and audit type
- Audit timeline
- Audit team and Audit Manager
- Makers and reviewers
- Project status and progress
- Audit areas
- Milestones
- Evidence repository
- Queries, observations, CAPA, and reports

Projects act as the top-level container for the entire engagement.

---

## Milestone Management

Auditie uses workflow-based milestones instead of simple status cards. Milestones represent real audit lifecycle activities such as:

- Review Planning
- Overall Project Management
- Team Briefing Meeting
- Review Kick-off Meeting
- Area-wise Review Checklist
- Data Requirement Roll Out
- Process Walkthrough
- Review Risk & Control Matrix
- Data Analytics / Sampling
- Review Execution
- Weekly Status Update
- Interim Review
- Queries Discussion
- Draft Report Preparation and Review
- Final Report Preparation and Review
- Review Closing Meeting
- Review Committee Meeting

Each milestone can have:

- Responsible owner
- Status
- Target date
- Started date
- Completion date
- Progress
- Required action
- Repository attachments
- Remarks
- Comments
- History

Milestones open dedicated workspaces. For example, Review Planning opens a planning checklist, Kick-off opens a meeting workspace, Data Requirement Roll Out opens a request tracker, and RCM opens a Risk & Control Matrix tracker.

---

## Area Management

Projects are divided into audit areas. Examples include:

- HR
- Admin
- Physical Security
- IT Infrastructure
- AWS
- Azure
- Network
- Applications
- Database
- Vendor Management
- Password Policy
- Linux
- Firewall
- Policies Review

Each audit area has its own workspace for maker execution, evidence, observations, review, and history.

---

## Dynamic Checklist Engine

Auditie supports two checklist execution modes.

### Question View

Question-based checklists are useful for:

- Interviews
- Walkthroughs
- Governance reviews
- Physical verification
- Policy and procedure reviews

Auditors can answer checklist questions, add observations, attach evidence, and submit the area for review.

### Table View

Table-based checklists turn audit execution into spreadsheet-style working papers. They support:

- Dynamic columns
- Dynamic rows
- Search
- Filters
- Inline editing
- Row status
- Row comments
- Evidence per row
- Excel import
- Excel export

This is designed for audit sheets such as HR reviews, user access reviews, vendor reviews, asset verification, backup review, change management, incident registers, and other sample-based testing.

---

## Evidence Management

Evidence can be attached to checklist items, table rows, audit areas, observations, milestones, and repository records.

Supported evidence sources include:

- Central repository
- Local device uploads
- Google Drive integration

Evidence workflows support:

- Preview
- Download
- Version history
- Replace
- Delete
- Link to working papers
- Link to milestone workspaces

This ensures reviewers can trace every conclusion back to its supporting evidence.

---

## Repository

The Repository module works like an audit-focused document workspace.

Features include:

- Folder hierarchy
- File upload
- Search
- Versioning
- File preview
- Evidence linking
- Google Drive integration
- Shared project evidence store

The repository reduces dependency on scattered Drive folders and manual evidence references.

---

## Observation Register

Observations can be created from checklist findings and audit area work.

An observation captures:

- Title
- Description
- Severity
- Clause or control reference
- Audit area
- Owner
- Reviewer
- Evidence
- Status

This gives teams one place to track findings from identification through review and closure.

---

## CAPA Management

Each observation can lead to CAPA tracking.

CAPA records can track:

- Root cause
- Corrective action
- Preventive action
- Due date
- Responsible person
- Verification
- Closure

This helps consultancies move beyond reporting findings and into remediation governance.

---

## Maker-Reviewer Workflow

Auditie supports a maker-reviewer workflow designed for audit quality control.

| Role | Responsibilities |
| --- | --- |
| Maker | Completes checklist, updates working papers, uploads evidence, and creates observations |
| Reviewer | Reviews submitted work, adds comments, requests rework, approves, or rejects |
| Audit Manager | Oversees project status, area allocation, reviewer assignment, milestones, and delivery |

The workflow is designed so users do not review their own work. Reviewer queues and review statuses help ensure submitted work is visible and actionable.

---

## Timeline

The Timeline is a project manager's control center. It shows:

- Current milestone
- Pending milestones
- Completed milestones
- Delayed or overdue milestones
- Owners
- Target dates
- Started and completed dates
- Progress
- Required action
- Open workspace action

Rather than hiding work inside static cards, each milestone opens the right workspace for that audit activity.

---

## Queries

The Query module tracks questions and discussions raised during the engagement.

It can be used for:

- Client questions
- Internal discussions
- Assigned responses
- Status tracking
- Due dates
- Attachments and evidence references

This avoids losing important audit discussions in email threads.

---

## Reporting

Auditie supports report lifecycle tracking for:

- Draft Report
- Final Report
- Observation Report
- Executive Summary
- CAPA Report
- Audit Report

Report workspaces can track versions, review comments, submission status, and supporting repository documents.

---

## Template Engine

The Template Engine automates document generation for:

- Policies
- Procedures
- Standards
- Registers
- Audit documents

Templates can replace values such as:

- Company name
- Logo
- Address
- Dates
- Metadata
- Project details

This reduces repetitive manual editing in Word files and helps standardize consultancy deliverables.

---

## Users & Performance

Auditie tracks user work across engagements, including:

- Assigned tasks
- Completed tasks
- Reviews pending
- Average completion time
- Overdue work
- Workload distribution
- User performance analytics

This helps managers allocate work realistically and identify overload early.

---

## Audit Logs

Every important activity is logged, including:

- File uploaded
- Evidence linked
- Checklist updated
- Observation created
- Reviewer approved
- Reviewer requested rework
- Project status changed
- Milestone updated
- User assignment changed

The audit log provides traceability for both internal governance and client-facing defensibility.

---

## Notifications

Auditie is designed to notify users when action is needed, such as:

- Task assigned
- Review pending
- Evidence uploaded
- Observation returned
- CAPA overdue
- Milestone delayed

Notification workflows are part of the product roadmap and are intended to reduce manual follow-up by Audit Managers.

---

## AI Roadmap

Planned AI capabilities include:

- Audit assistant
- ISO guidance
- Control recommendations
- Observation drafting
- CAPA suggestions
- Evidence gap detection
- Report writing assistance
- Checklist quality review

AI is intended to support auditors, not replace professional judgment.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                      │
│        Projects • Areas • Checklists • Repository       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            v
┌─────────────────────────────────────────────────────────┐
│                  Node.js / Express API                  │
│ Auth • Projects • Milestones • Repository • Templates   │
└───────────────────────────┬─────────────────────────────┘
                            │
                            v
┌─────────────────────────────────────────────────────────┐
│                       Prisma ORM                        │
└───────────────────────────┬─────────────────────────────┘
                            │
                            v
┌─────────────────────────────────────────────────────────┐
│                    Database Layer                       │
│      Local development: SQLite • Production: PostgreSQL │
└─────────────────────────────────────────────────────────┘
                            │
                            v
┌─────────────────────────────────────────────────────────┐
│                  Storage & Integrations                 │
│          Local Repository • Google Drive • Uploads      │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| ORM | Prisma |
| Database | SQLite for local development, PostgreSQL target for production deployments |
| Authentication | JWT |
| Storage | Local repository, file uploads, Google Drive integration |
| UI | Tailwind CSS, Lucide icons, TanStack Table |

---

## Screenshots


| Area | Preview |
| --- | --- |
| Dashboard | `docs/screenshots/dashboard.png` |
| Projects | `docs/screenshots/projects.png` |
| Checklist | `docs/screenshots/checklist.png` |
| Repository | `docs/screenshots/repository.png` |
| Timeline | `docs/screenshots/timeline.png` |
| Reports | `docs/screenshots/reports.png` |
| Observations | `docs/screenshots/observations.png` |
| CAPA | `docs/screenshots/capa.png` |

---

## Getting Started

### Prerequisites

- Node.js
- npm
- Prisma CLI through project dependencies

### Installation

```bash
npm install
```

### Environment

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this-secret"
NODE_ENV="development"
```

Google Drive integration also requires OAuth credentials when enabled.

### Database

```bash
npx prisma generate
npx prisma migrate deploy
```

### Run Locally

```bash
npm run dev
```

The app runs at:

```text
http://localhost:3000
```

### Build

```bash
npm run build
```

> Windows note: if the project path contains `&`, npm command shims may fail in some shells. You can run tools directly through Node, for example `node ./node_modules/typescript/bin/tsc --noEmit`.

---

## Project Structure

```text
src/
  app/                         React app shell, auth context, layout, and routes
  features/
    projects/                  Project, milestone, audit area, and workspace UI
    templates/                 Template automation and document generation UI
  main.tsx                     Frontend bootstrap

server/
  api/                         Express route modules
  data/                        Checklist and review program libraries
  integrations/                Google Drive integration
  middleware/                  Authentication middleware
  services/                    Milestone, performance, and workflow services

prisma/
  migrations/                  Database migrations
  schema.prisma                Prisma schema
  seed.ts                      Seed script

scripts/                       Maintenance and smoke-test utilities
types/                         Local TypeScript declarations
```

Runtime folders such as `uploads/`, `generated/`, `repository/`, `dist/`, local databases, logs, credentials, and cookies are intentionally ignored by Git.

---

## Why Auditie Is Better Than Excel

| Excel-Based Audit Management | Auditie |
| --- | --- |
| Files scattered across folders | Centralized project workspace |
| Manual version control | Structured records and activity logs |
| Evidence pasted into sheets or emails | Evidence linked directly to rows, areas, observations, and milestones |
| Review status tracked manually | Maker-reviewer workflow with queue visibility |
| Progress calculated by managers | Progress derived from areas, milestones, and workspaces |
| Observations maintained separately | Findings and CAPA connected to audit execution |
| Repetitive templates | Reusable checklist and document templates |
| Hard to trace changes | Complete audit activity history |

Auditie helps consultancies deliver faster, more consistent, and more traceable audits.

---

## Future Roadmap

- AI Copilot for auditors
- Multi-tenant consultancy mode
- Client portal
- API integrations
- Microsoft Teams integration
- Slack integration
- Azure AD / SSO
- Jira integration
- Power BI dashboards
- Risk management module
- Asset management module
- Vendor risk management
- Continuous compliance monitoring
- Advanced notification engine
- Role-based repository permissions
- Production PostgreSQL deployment profile

---

## Collapsible Details

<details>
<summary><strong>Supported Audit Types</strong></summary>

- ISO 27001
- ISO 27701
- SOC 2
- ITGC
- VAPT
- PCI DSS
- HIPAA
- NIST
- Internal Audits
- Client-specific compliance engagements

</details>

<details>
<summary><strong>Example Audit Area Workflow</strong></summary>

1. Audit Manager creates project.
2. Audit Manager assigns HR area to a maker.
3. HR working paper is generated.
4. Maker fills table rows and uploads evidence.
5. Maker submits the area for review.
6. Reviewer approves or requests rework.
7. Observations and CAPA are tracked.
8. Area progress contributes to project progress.

</details>

<details>
<summary><strong>Example Milestone Workflow</strong></summary>

1. Review Planning milestone is opened.
2. Scope, objectives, criteria, team, and audit plan are completed.
3. Data Requirement Roll Out tracks requests.
4. Review Execution summarizes assigned areas.
5. Draft Report and Final Report milestones track report versions and review comments.
6. Closing milestones capture final meetings and closure actions.

</details>

---

## License

This project is licensed under the **Shaikh Sayma**.

---

## Project Status

Auditie is under active development. The platform already includes core project, audit area, checklist, repository, template, user, milestone, review, observation, CAPA, reporting, and audit log foundations. Roadmap items are documented above and should be treated as planned capabilities unless implemented in the current codebase.
