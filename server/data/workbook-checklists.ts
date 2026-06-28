import type { ChecklistTemplateDefinition } from './checklist-library.ts';

export const workbookChecklistTemplates = [
  {
    "name": "HR Walkthrough",
    "type": "TABLE_CHECKLIST",
    "workpaperType": "WALKTHROUGH_CHECKLIST",
    "framework": "Auditie Checklist Workbook",
    "areaKey": "hr-walkthrough",
    "evidenceRequirement": "Follow source workbook sheet: HR checklist. Link evidence using the Repository module.",
    "columns": [
      {
        "columnName": "Sr No.",
        "columnKey": "srNo",
        "columnType": "text"
      },
      {
        "columnName": "ISO Clause",
        "columnKey": "iSOClause",
        "columnType": "text"
      },
      {
        "columnName": "Control Area",
        "columnKey": "controlArea",
        "columnType": "text"
      },
      {
        "columnName": "Audit Check",
        "columnKey": "auditCheck",
        "columnType": "text"
      },
      {
        "columnName": "Evidence Expected",
        "columnKey": "evidenceExpected",
        "columnType": "text"
      },
      {
        "columnName": "Status",
        "columnKey": "status",
        "columnType": "text"
      },
      {
        "columnName": "Auditor Observation",
        "columnKey": "auditorObservation",
        "columnType": "text"
      }
    ],
    "seedRows": [
      {
        "srNo": "1",
        "iSOClause": "A.6.1",
        "controlArea": "Employee Screening",
        "auditCheck": "Is employee screening process documented?",
        "evidenceExpected": "Screening Policy / SOP",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "2",
        "iSOClause": "A.6.1",
        "controlArea": "Employee Screening",
        "auditCheck": "Are background verification checks performed before hiring?",
        "evidenceExpected": "BGV Reports",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "3",
        "iSOClause": "A.6.1",
        "controlArea": "Employee Screening",
        "auditCheck": "Are temporary, contract and third-party personnel screened?",
        "evidenceExpected": "Contractor Screening Records",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "4",
        "iSOClause": "A.6.2",
        "controlArea": "Employment Terms",
        "auditCheck": "Are IS responsibilities included in appointment letters?",
        "evidenceExpected": "Appointment Letter Template",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "5",
        "iSOClause": "A.6.2",
        "controlArea": "Employment Terms",
        "auditCheck": "Are employees informed of information security responsibilities?",
        "evidenceExpected": "Employee Handbook / Policy",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "6",
        "iSOClause": "A.6.2",
        "controlArea": "NDA",
        "auditCheck": "Is NDA signed by all employees?",
        "evidenceExpected": "NDA Records",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "7",
        "iSOClause": "A.6.2",
        "controlArea": "NDA",
        "auditCheck": "Is NDA signed by contractors and consultants?",
        "evidenceExpected": "Contractor NDA Records",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "8",
        "iSOClause": "A.6.2",
        "controlArea": "HR Policies",
        "auditCheck": "Is there an HR policy approved by management?",
        "evidenceExpected": "HR Policy",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "9",
        "iSOClause": "A.6.2",
        "controlArea": "HR Retention",
        "auditCheck": "Is an HR document retention policy defined?",
        "evidenceExpected": "Retention Policy",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "10",
        "iSOClause": "A.6.3",
        "controlArea": "Security Awareness",
        "auditCheck": "Is Information Security Awareness training conducted?",
        "evidenceExpected": "Training Records",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "11",
        "iSOClause": "A.6.3",
        "controlArea": "Security Awareness",
        "auditCheck": "Is onboarding security induction conducted?",
        "evidenceExpected": "Induction Material",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "12",
        "iSOClause": "A.6.3",
        "controlArea": "Security Awareness",
        "auditCheck": "Is periodic refresher training conducted?",
        "evidenceExpected": "Training Calendar",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "13",
        "iSOClause": "A.6.3",
        "controlArea": "Training Records",
        "auditCheck": "Are attendance records maintained?",
        "evidenceExpected": "Attendance Sheets",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "14",
        "iSOClause": "A.6.3",
        "controlArea": "Training Records",
        "auditCheck": "Is training effectiveness measured?",
        "evidenceExpected": "Assessment Results",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "15",
        "iSOClause": "A.6.3",
        "controlArea": "Competency Management",
        "auditCheck": "Is a skill matrix maintained?",
        "evidenceExpected": "Skill Matrix",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "16",
        "iSOClause": "A.6.4",
        "controlArea": "Disciplinary Process",
        "auditCheck": "Is a disciplinary procedure documented?",
        "evidenceExpected": "Disciplinary Policy",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "17",
        "iSOClause": "A.6.4",
        "controlArea": "Disciplinary Process",
        "auditCheck": "Are disciplinary actions recorded?",
        "evidenceExpected": "Disciplinary Records",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "18",
        "iSOClause": "A.6.5",
        "controlArea": "Transfer Process",
        "auditCheck": "Is role transfer process documented?",
        "evidenceExpected": "Transfer SOP",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "19",
        "iSOClause": "A.6.5",
        "controlArea": "Transfer Process",
        "auditCheck": "Are access rights reviewed during transfer?",
        "evidenceExpected": "Transfer Checklist",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "20",
        "iSOClause": "A.6.5",
        "controlArea": "Termination Process",
        "auditCheck": "Is employee exit process documented?",
        "evidenceExpected": "Exit Procedure",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "21",
        "iSOClause": "A.6.5",
        "controlArea": "Termination Process",
        "auditCheck": "Are system accesses revoked immediately upon exit?",
        "evidenceExpected": "Exit Checklist",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "22",
        "iSOClause": "A.6.5",
        "controlArea": "Asset Return",
        "auditCheck": "Are company assets collected during exit?",
        "evidenceExpected": "Asset Return Form",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "23",
        "iSOClause": "A.6.5",
        "controlArea": "Exit Communication",
        "auditCheck": "Are post-employment confidentiality obligations communicated?",
        "evidenceExpected": "Exit Acknowledgement",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "24",
        "iSOClause": "A.6.6",
        "controlArea": "Confidentiality",
        "auditCheck": "Are confidentiality obligations formally documented?",
        "evidenceExpected": "NDA / Employment Contract",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "25",
        "iSOClause": "A.6.6",
        "controlArea": "Confidentiality",
        "auditCheck": "Are confidentiality breaches addressed through disciplinary action?",
        "evidenceExpected": "Incident Records",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "26",
        "iSOClause": "A.6.7",
        "controlArea": "Remote Working",
        "auditCheck": "Is a remote working policy documented?",
        "evidenceExpected": "Remote Working Policy",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "27",
        "iSOClause": "A.6.7",
        "controlArea": "Remote Working",
        "auditCheck": "Are employees trained on secure remote working?",
        "evidenceExpected": "Training Records",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "28",
        "iSOClause": "A.6.7",
        "controlArea": "Remote Working",
        "auditCheck": "Are remote devices secured?",
        "evidenceExpected": "Device Management Records",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "29",
        "iSOClause": "A.6.8",
        "controlArea": "Incident Reporting",
        "auditCheck": "Are employees aware of incident reporting procedures?",
        "evidenceExpected": "Incident Reporting Procedure",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "30",
        "iSOClause": "A.6.8",
        "controlArea": "Incident Reporting",
        "auditCheck": "Is security incident reporting training conducted?",
        "evidenceExpected": "Training Records",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "31",
        "iSOClause": "A.5.15",
        "controlArea": "Access Control",
        "auditCheck": "Is access provisioning linked to HR onboarding?",
        "evidenceExpected": "Access Request Forms",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "32",
        "iSOClause": "A.5.18",
        "controlArea": "Access Rights",
        "auditCheck": "Is periodic user access review performed?",
        "evidenceExpected": "Access Review Reports",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "33",
        "iSOClause": "A.5.11",
        "controlArea": "Return of Assets",
        "auditCheck": "Is asset return verified during exit?",
        "evidenceExpected": "Asset Return Checklist",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "34",
        "iSOClause": "A.5.33",
        "controlArea": "Protection of Records",
        "auditCheck": "Are HR records protected from unauthorized access?",
        "evidenceExpected": "Access Matrix",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "35",
        "iSOClause": "A.5.34",
        "controlArea": "Privacy & PII",
        "auditCheck": "Is employee personal information protected?",
        "evidenceExpected": "Privacy Controls",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "36",
        "iSOClause": "A.5.34",
        "controlArea": "Privacy & PII",
        "auditCheck": "Is consent obtained where applicable?",
        "evidenceExpected": "Consent Records",
        "status": "",
        "auditorObservation": ""
      },
      {
        "srNo": "37",
        "iSOClause": "A.5.35",
        "controlArea": "Independent Review",
        "auditCheck": "Are HR security controls periodically reviewed?",
        "evidenceExpected": "Review Reports",
        "status": "",
        "auditorObservation": ""
      }
    ],
    "sourceSheet": "HR checklist"
  },
  {
    "name": "Admin Walkthrough",
    "type": "TABLE_CHECKLIST",
    "workpaperType": "WALKTHROUGH_CHECKLIST",
    "framework": "Auditie Checklist Workbook",
    "areaKey": "admin-walkthrough",
    "evidenceRequirement": "Follow source workbook sheet: Admin checklist. Link evidence using the Repository module.",
    "columns": [
      {
        "columnName": "Sr. No.",
        "columnKey": "srNo",
        "columnType": "text"
      },
      {
        "columnName": "Areas / Specific Check",
        "columnKey": "areasSpecificCheck",
        "columnType": "text"
      },
      {
        "columnName": "Evidence Expected",
        "columnKey": "evidenceExpected",
        "columnType": "text"
      },
      {
        "columnName": "ISO 27001:2022 Reference",
        "columnKey": "iSO270012022Reference",
        "columnType": "text"
      }
    ],
    "seedRows": [
      {
        "srNo": "1",
        "areasSpecificCheck": "Preventive Maintenance Report (with logs, service reports, photos)",
        "evidenceExpected": "All items serviced per schedule, no critical faults",
        "iSO270012022Reference": "A.7.13 Equipment maintenance"
      },
      {
        "srNo": "2",
        "areasSpecificCheck": "AC – Temperature & Humidity in server room / critical areas",
        "evidenceExpected": "Ambient/inlet: 18–27°C (ideal 20–24°C); RH 40–60%",
        "iSO270012022Reference": "A.7.5 Protecting against physical and environmental threats"
      },
      {
        "srNo": "3",
        "areasSpecificCheck": "AC – Filter cleaning / replacement",
        "evidenceExpected": "Clean filters, no dust buildup",
        "iSO270012022Reference": "A.7.13"
      },
      {
        "srNo": "4",
        "areasSpecificCheck": "AC – Cooling capacity check (no overload, even distribution)",
        "evidenceExpected": "No hotspots >27°C near racks",
        "iSO270012022Reference": "A.7.5, A.7.8 Equipment siting and protection"
      },
      {
        "srNo": "5",
        "areasSpecificCheck": "Fire extinguisher – Visual inspection & pressure",
        "evidenceExpected": "Green indicator, pressure in green zone, refilled per label",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "6",
        "areasSpecificCheck": "Fire extinguisher – Location & accessibility",
        "evidenceExpected": "Clearly visible, unobstructed, at proper height",
        "iSO270012022Reference": "A.7.5, A.7.3 Securing offices, rooms and facilities"
      },
      {
        "srNo": "7",
        "areasSpecificCheck": "UPS – Battery health & load test",
        "evidenceExpected": "Batteries within voltage/temp limits, no alarms",
        "iSO270012022Reference": "A.7.11 Supporting utilities"
      },
      {
        "srNo": "8",
        "areasSpecificCheck": "UPS – Temperature around UPS units",
        "evidenceExpected": "<35°C to prevent battery degradation",
        "iSO270012022Reference": "A.7.11, A.7.8"
      },
      {
        "srNo": "9",
        "areasSpecificCheck": "DG – Fuel level, test run, exhaust",
        "evidenceExpected": "Fuel >50%, test run successful, no leaks",
        "iSO270012022Reference": "A.7.11"
      },
      {
        "srNo": "10",
        "areasSpecificCheck": "Smoke Detectors – Test & cleaning",
        "evidenceExpected": "Functional test passed, clean & dust-free",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "11",
        "areasSpecificCheck": "Fire Systems (alarms, suppression e.g. FM200/gas) – Test & certification",
        "evidenceExpected": "Annual test cert, no faults, blinking/ready",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "12",
        "areasSpecificCheck": "Bio Metric Systems – Functionality & logs",
        "evidenceExpected": "All doors working, access logs reviewed",
        "iSO270012022Reference": "A.7.2 Physical entry"
      },
      {
        "srNo": "13",
        "areasSpecificCheck": "CCTV – All cameras operational incl branches",
        "evidenceExpected": "Live feed check, no blind spots",
        "iSO270012022Reference": "A.7.4 Physical security monitoring"
      },
      {
        "srNo": "14",
        "areasSpecificCheck": "Network Devices (routers, firewalls) – Preventive check",
        "evidenceExpected": "Firmware updated, temp <50°C",
        "iSO270012022Reference": "A.7.13, A.7.8"
      },
      {
        "srNo": "15",
        "areasSpecificCheck": "Backup Systems – Offsite / cloud sync check",
        "evidenceExpected": "Last backup successful, retention met",
        "iSO270012022Reference": "A.7.10 Storage media"
      },
      {
        "srNo": "16",
        "areasSpecificCheck": "CCTV Controls",
        "evidenceExpected": "",
        "iSO270012022Reference": "A.7.4"
      },
      {
        "srNo": "17",
        "areasSpecificCheck": "All CCTV working incl branches",
        "evidenceExpected": "100% uptime",
        "iSO270012022Reference": "A.7.4"
      },
      {
        "srNo": "18",
        "areasSpecificCheck": "CCTV retention period",
        "evidenceExpected": "Min. 90 days (best practice for incident evidence)",
        "iSO270012022Reference": "A.7.10"
      },
      {
        "srNo": "19",
        "areasSpecificCheck": "CCTV periodic review (start of day)",
        "evidenceExpected": "Daily check logged",
        "iSO270012022Reference": "A.7.4"
      },
      {
        "srNo": "20",
        "areasSpecificCheck": "CCTV footage log review",
        "evidenceExpected": "Weekly review for incidents",
        "iSO270012022Reference": "A.7.4"
      },
      {
        "srNo": "21",
        "areasSpecificCheck": "Access logs for CCTV viewing",
        "evidenceExpected": "Restricted to authorized personnel only",
        "iSO270012022Reference": "A.7.4, A.7.2"
      },
      {
        "srNo": "22",
        "areasSpecificCheck": "Integration with incident reporting",
        "evidenceExpected": "Footage available for investigations",
        "iSO270012022Reference": "A.7.4"
      },
      {
        "srNo": "23",
        "areasSpecificCheck": "Fire Safety",
        "evidenceExpected": "",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "24",
        "areasSpecificCheck": "All fire extinguishers – Green indicator & refilling label",
        "evidenceExpected": "Compliant",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "25",
        "areasSpecificCheck": "Fire extinguishers displayed at proper locations",
        "evidenceExpected": "Visible, marked, accessible",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "26",
        "areasSpecificCheck": "Fire exits not blocked",
        "evidenceExpected": "Clear path, no storage",
        "iSO270012022Reference": "A.7.5, A.7.3"
      },
      {
        "srNo": "27",
        "areasSpecificCheck": "Fire alarm system blinking / operational",
        "evidenceExpected": "No faults, tested",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "28",
        "areasSpecificCheck": "Fire suppression in server room (FM200/gas) – Test report",
        "evidenceExpected": "Certified, no leaks",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "29",
        "areasSpecificCheck": "Cross-border site compliance (e.g., Dubai)",
        "evidenceExpected": "Local fire regs met",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "30",
        "areasSpecificCheck": "Visitor Register",
        "evidenceExpected": "Daily entries, photo ID, purpose logged",
        "iSO270012022Reference": "A.7.2"
      },
      {
        "srNo": "31",
        "areasSpecificCheck": "NDA signing for visitors in sensitive areas (content rooms)",
        "evidenceExpected": "Signed before entry",
        "iSO270012022Reference": "A.7.2"
      },
      {
        "srNo": "32",
        "areasSpecificCheck": "Photo ID verification & logging",
        "evidenceExpected": "Scanned/copied, logged",
        "iSO270012022Reference": "A.7.2"
      },
      {
        "srNo": "33",
        "areasSpecificCheck": "Inward & Outward Register",
        "evidenceExpected": "",
        "iSO270012022Reference": "A.7.1 Physical security perimeters, A.7.2"
      },
      {
        "srNo": "34",
        "areasSpecificCheck": "Screening for data-carrying devices (USBs, drives)",
        "evidenceExpected": "Logged, scanned for malware",
        "iSO270012022Reference": "A.7.10"
      },
      {
        "srNo": "35",
        "areasSpecificCheck": "Supplier delivery records",
        "evidenceExpected": "Matched to PO, security checked",
        "iSO270012022Reference": "A.7.1"
      },
      {
        "srNo": "36",
        "areasSpecificCheck": "Asset Movement",
        "evidenceExpected": "",
        "iSO270012022Reference": "A.7.9 Security of assets off-premises, A.7.10"
      },
      {
        "srNo": "37",
        "areasSpecificCheck": "Invoice vs Gate pass",
        "evidenceExpected": "Matched, no discrepancies",
        "iSO270012022Reference": "A.7.10"
      },
      {
        "srNo": "38",
        "areasSpecificCheck": "Removal vs Gate pass",
        "evidenceExpected": "Authorized, logged",
        "iSO270012022Reference": "A.7.9"
      },
      {
        "srNo": "39",
        "areasSpecificCheck": "Returnable assets returned on time",
        "evidenceExpected": "Timely handover",
        "iSO270012022Reference": "A.7.9"
      },
      {
        "srNo": "40",
        "areasSpecificCheck": "Non-returnable – Reason specified",
        "evidenceExpected": "Documented",
        "iSO270012022Reference": "A.7.9"
      },
      {
        "srNo": "41",
        "areasSpecificCheck": "Asset classification & labeling (high-value IP assets)",
        "evidenceExpected": "Labeled \"Confidential/IP Sensitive\"",
        "iSO270012022Reference": "A.7.10"
      },
      {
        "srNo": "42",
        "areasSpecificCheck": "Encryption check on movable assets (laptops, drives)",
        "evidenceExpected": "Full disk encryption verified",
        "iSO270012022Reference": "A.7.10"
      },
      {
        "srNo": "43",
        "areasSpecificCheck": "Disposal",
        "evidenceExpected": "",
        "iSO270012022Reference": "A.7.14 Secure disposal or re-use of equipment"
      },
      {
        "srNo": "44",
        "areasSpecificCheck": "Secured disposal of HDD/data devices",
        "evidenceExpected": "Degauss/shred/cryptographic erase",
        "iSO270012022Reference": "A.7.14"
      },
      {
        "srNo": "45",
        "areasSpecificCheck": "Green Certificate",
        "evidenceExpected": "Obtained",
        "iSO270012022Reference": "A.7.14"
      },
      {
        "srNo": "46",
        "areasSpecificCheck": "Erasing Certificate of Data",
        "evidenceExpected": "Issued & filed",
        "iSO270012022Reference": "A.7.14"
      },
      {
        "srNo": "47",
        "areasSpecificCheck": "Breaking of HDD/media (non-usable)",
        "evidenceExpected": "Witnessed & photographed",
        "iSO270012022Reference": "A.7.14"
      },
      {
        "srNo": "48",
        "areasSpecificCheck": "Shredding of paper (contracts, scripts)",
        "evidenceExpected": "Cross-cut, witnessed",
        "iSO270012022Reference": "A.7.14"
      },
      {
        "srNo": "49",
        "areasSpecificCheck": "Client data disposal per law/agreement",
        "evidenceExpected": "Compliant process",
        "iSO270012022Reference": "A.7.14"
      },
      {
        "srNo": "50",
        "areasSpecificCheck": "Witnessed disposal for sensitive data",
        "evidenceExpected": "Logged with witnesses",
        "iSO270012022Reference": "A.7.14"
      },
      {
        "srNo": "51",
        "areasSpecificCheck": "Audit trail for disposal records",
        "evidenceExpected": "Maintained 1+ year",
        "iSO270012022Reference": "A.7.14"
      },
      {
        "srNo": "52",
        "areasSpecificCheck": "Server Room, Treasury, Electric Room – Entry/Exit & Environment",
        "evidenceExpected": "",
        "iSO270012022Reference": "A.7.3 Securing offices/rooms/facilities, A.7.6 Working in secure areas"
      },
      {
        "srNo": "53",
        "areasSpecificCheck": "List of users with access",
        "evidenceExpected": "Current, approved list",
        "iSO270012022Reference": "A.7.2"
      },
      {
        "srNo": "54",
        "areasSpecificCheck": "Access log review",
        "evidenceExpected": "Monthly review, anomalies reported",
        "iSO270012022Reference": "A.7.2"
      },
      {
        "srNo": "55",
        "areasSpecificCheck": "Temperature monitoring report",
        "evidenceExpected": "18–27°C (target 20–24°C), logged hourly/daily",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "56",
        "areasSpecificCheck": "Humidity monitoring report",
        "evidenceExpected": "40–60% RH",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "57",
        "areasSpecificCheck": "Inflammable/cardboard/wooden material not kept",
        "evidenceExpected": "No storage",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "58",
        "areasSpecificCheck": "Visitor register for restricted rooms",
        "evidenceExpected": "Logged",
        "iSO270012022Reference": "A.7.2"
      },
      {
        "srNo": "59",
        "areasSpecificCheck": "Leakages (water/AC) if any",
        "evidenceExpected": "No leaks, inspected",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "60",
        "areasSpecificCheck": "Wires – No jumbled/dusty/unlabelled",
        "evidenceExpected": "Organized, labeled",
        "iSO270012022Reference": "A.7.12 Cabling security"
      },
      {
        "srNo": "61",
        "areasSpecificCheck": "No movable media/laptops/mobiles in server room",
        "evidenceExpected": "Checked & clear",
        "iSO270012022Reference": "A.7.6"
      },
      {
        "srNo": "62",
        "areasSpecificCheck": "No water sprinkler (use gas suppression)",
        "evidenceExpected": "Confirmed",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "63",
        "areasSpecificCheck": "Testing reports (CCTV, fire alarm, FM200/gas)",
        "evidenceExpected": "Current certs",
        "iSO270012022Reference": "A.7.4, A.7.5"
      },
      {
        "srNo": "64",
        "areasSpecificCheck": "Raised flooring integrity",
        "evidenceExpected": "No damage",
        "iSO270012022Reference": "A.7.3"
      },
      {
        "srNo": "65",
        "areasSpecificCheck": "No windows (or sealed if present)",
        "evidenceExpected": "Sealed/tinted",
        "iSO270012022Reference": "A.7.1"
      },
      {
        "srNo": "66",
        "areasSpecificCheck": "Proper labelling of servers/racks",
        "evidenceExpected": "Clear, asset tagged",
        "iSO270012022Reference": "A.7.8"
      },
      {
        "srNo": "67",
        "areasSpecificCheck": "Backup tapes/material in fire-proof cabinet",
        "evidenceExpected": "Secured",
        "iSO270012022Reference": "A.7.10"
      },
      {
        "srNo": "68",
        "areasSpecificCheck": "No backup/mirror server in same room",
        "evidenceExpected": "Separate location",
        "iSO270012022Reference": "A.7.8"
      },
      {
        "srNo": "69",
        "areasSpecificCheck": "Biometric/MFA access",
        "evidenceExpected": "Enforced",
        "iSO270012022Reference": "A.7.2"
      },
      {
        "srNo": "70",
        "areasSpecificCheck": "Environmental monitoring (alerts for >27°C or <18°C)",
        "evidenceExpected": "Alerts configured & tested",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "71",
        "areasSpecificCheck": "Evacuation Drill",
        "evidenceExpected": "",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "72",
        "areasSpecificCheck": "Attendance sheet",
        "evidenceExpected": "100% participation target",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "73",
        "areasSpecificCheck": "Photos & evidences",
        "evidenceExpected": "Taken & filed",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "74",
        "areasSpecificCheck": "Training evidences",
        "evidenceExpected": "Records",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "75",
        "areasSpecificCheck": "Final head count",
        "evidenceExpected": "Matched",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "76",
        "areasSpecificCheck": "Data evacuation procedures (secure backup during drill)",
        "evidenceExpected": "Tested",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "77",
        "areasSpecificCheck": "Post-drill ISMS review",
        "evidenceExpected": "Minutes, improvements noted",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "78",
        "areasSpecificCheck": "Others – Own Building / Client Sites",
        "evidenceExpected": "",
        "iSO270012022Reference": "A.7.1 Physical security perimeters"
      },
      {
        "srNo": "79",
        "areasSpecificCheck": "Fencing of data centre/building walls",
        "evidenceExpected": "Secure, no breaches",
        "iSO270012022Reference": "A.7.1"
      },
      {
        "srNo": "80",
        "areasSpecificCheck": "Fire audit reports",
        "evidenceExpected": "Latest available",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "81",
        "areasSpecificCheck": "NOC for Fire, Lift",
        "evidenceExpected": "Valid",
        "iSO270012022Reference": "A.7.5"
      },
      {
        "srNo": "82",
        "areasSpecificCheck": "Refuge area & parking free from encroachments",
        "evidenceExpected": "Clear",
        "iSO270012022Reference": "A.7.1"
      },
      {
        "srNo": "83",
        "areasSpecificCheck": "Perimeter security for international sites",
        "evidenceExpected": "Compliant",
        "iSO270012022Reference": "A.7.1"
      },
      {
        "srNo": "84",
        "areasSpecificCheck": "Supplier security audits (media partners)",
        "evidenceExpected": "Conducted/records",
        "iSO270012022Reference": "A.7.1 (cross-ref Organizational controls)"
      },
      {
        "srNo": "85",
        "areasSpecificCheck": "Clear Desk and Clear Screen (content creation areas)",
        "evidenceExpected": "No sensitive docs/screens visible; locked when unattended",
        "iSO270012022Reference": "A.7.7 Clear desk and clear screen"
      },
      {
        "srNo": "86",
        "areasSpecificCheck": "Compliance spot checks",
        "evidenceExpected": "Monthly inspections",
        "iSO270012022Reference": "A.7.7"
      },
      {
        "srNo": "87",
        "areasSpecificCheck": "Security of Assets Off-Premises (laptops with scripts)",
        "evidenceExpected": "Remote tracking, encryption, loss reporting",
        "iSO270012022Reference": "A.7.9"
      },
      {
        "srNo": "88",
        "areasSpecificCheck": "Inventory & checks for offsite assets",
        "evidenceExpected": "Updated quarterly",
        "iSO270012022Reference": "A.7.9"
      }
    ],
    "sourceSheet": "Admin checklist"
  },
  {
      "name": "Application Review",
      "type": "TABLE_CHECKLIST",
      "workpaperType": "WALKTHROUGH_CHECKLIST",
      "framework": "Auditie Checklist Workbook",
      "areaKey": "application-review",
      "evidenceRequirement": "Follow source workbook sheet: ITGC ISO27001 Checklist. Link evidence using the Repository module.",
      "columns": [
          {
              "columnName": "Sr. No.",
              "columnKey": "srNo",
              "columnType": "text"
          },
          {
              "columnName": "Areas",
              "columnKey": "areas",
              "columnType": "text"
          },
          {
              "columnName": "Need to Check",
              "columnKey": "needToCheck",
              "columnType": "text"
          },
          {
              "columnName": "ISO 27001:2022 Reference",
              "columnKey": "iSO270012022Reference",
              "columnType": "text"
          },
          {
              "columnName": "Evidence Expected",
              "columnKey": "evidenceExpected",
              "columnType": "text"
          }
      ],
      "seedRows": [
          {
              "srNo": "1",
              "areas": "Login Activity",
              "needToCheck": "Login/logout trails",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "Login/logout audit log export with user ID, timestamp, IP, status, and retention period."
          },
          {
              "srNo": "2",
              "areas": "Login Activity",
              "needToCheck": "Is it blocked after certain failed attempts",
              "iSO270012022Reference": "A.5.17, A.8.5",
              "evidenceExpected": "Password/account lockout configuration screenshot and failed-login test evidence."
          },
          {
              "srNo": "3",
              "areas": "Login Activity",
              "needToCheck": "Login credentials changes than change management",
              "iSO270012022Reference": "A.5.17, A.5.18, A.8.32",
              "evidenceExpected": "Password/authentication change request ticket, approval, implementation log, and change management reference."
          },
          {
              "srNo": "4",
              "areas": "Login Activity",
              "needToCheck": "Multi-factor authentication (MFA) enforcement",
              "iSO270012022Reference": "A.5.17, A.8.5",
              "evidenceExpected": "MFA policy/configuration screenshot, enabled-user report, and exception list if any."
          },
          {
              "srNo": "5",
              "areas": "Login Activity",
              "needToCheck": "Session timeout settings and idle session handling",
              "iSO270012022Reference": "A.5.17, A.8.5",
              "evidenceExpected": "Session timeout configuration screenshot and idle-session test result."
          },
          {
              "srNo": "6",
              "areas": "Login Activity",
              "needToCheck": "IP address logging and geo-location checks for anomalies",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "Authentication log showing IP/geo fields and anomaly review evidence."
          },
          {
              "srNo": "7",
              "areas": "Login Activity",
              "needToCheck": "Rate limiting on login attempts",
              "iSO270012022Reference": "A.5.17, A.8.5",
              "evidenceExpected": "Rate-limit/WAF/API gateway configuration and failed attempt test evidence."
          },
          {
              "srNo": "8",
              "areas": "Login Activity",
              "needToCheck": "Alerts for suspicious login patterns",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "Alert rule configuration, sample alert, and incident/ticket created for suspicious login."
          },
          {
              "srNo": "9",
              "areas": "User Access List",
              "needToCheck": "Creation/deletion/approval",
              "iSO270012022Reference": "A.5.15, A.5.16, A.5.18",
              "evidenceExpected": "User access request, approval, provisioning/deprovisioning ticket, and user master extract."
          },
          {
              "srNo": "10",
              "areas": "User Access List",
              "needToCheck": "Maker/checker",
              "iSO270012022Reference": "A.5.15, A.5.16, A.5.18",
              "evidenceExpected": "Workflow screenshot showing maker-checker approval, approval matrix, and sample approved request."
          },
          {
              "srNo": "11",
              "areas": "User Access List",
              "needToCheck": "2 sample tickets of the same",
              "iSO270012022Reference": "A.5.15, A.5.16, A.5.18",
              "evidenceExpected": "Two completed sample tickets with request, approval, implementation, closure, and timestamps."
          },
          {
              "srNo": "12",
              "areas": "User Access List",
              "needToCheck": "UAT & production user to be different",
              "iSO270012022Reference": "A.8.31, A.5.18",
              "evidenceExpected": "UAT sign-off, test user list, production user list, and evidence of environment segregation."
          },
          {
              "srNo": "13",
              "areas": "User Access List",
              "needToCheck": "Read/write",
              "iSO270012022Reference": "A.5.15, A.5.16, A.5.18",
              "evidenceExpected": "Role/permission matrix showing read/write rights and user-role mapping."
          },
          {
              "srNo": "14",
              "areas": "User Access List",
              "needToCheck": "Role-based access control (RBAC) implementation",
              "iSO270012022Reference": "A.5.15, A.5.16, A.5.18",
              "evidenceExpected": "RBAC matrix, application roles list, and screenshots/export of role assignments."
          },
          {
              "srNo": "15",
              "areas": "User Access List",
              "needToCheck": "Least privilege principle adherence",
              "iSO270012022Reference": "A.5.15, A.5.16, A.5.18",
              "evidenceExpected": "Access review evidence showing business need, role minimization, and removed excess access."
          },
          {
              "srNo": "16",
              "areas": "User Access List",
              "needToCheck": "Periodic access reviews and recertification",
              "iSO270012022Reference": "A.5.18",
              "evidenceExpected": "Periodic user access review tracker, reviewer sign-off, exceptions, and closure evidence."
          },
          {
              "srNo": "17",
              "areas": "User Access List",
              "needToCheck": "Segregation of duties",
              "iSO270012022Reference": "A.5.3, A.5.18",
              "evidenceExpected": "SoD matrix, conflicting-role report, exception approvals, and mitigation controls."
          },
          {
              "srNo": "18",
              "areas": "User Access List",
              "needToCheck": "Integration with directory services (LDAP/AD)",
              "iSO270012022Reference": "A.5.16, A.5.17",
              "evidenceExpected": "LDAP/AD/SSO integration configuration and user synchronization report."
          },
          {
              "srNo": "19",
              "areas": "User Access List",
              "needToCheck": "Review of User list with HR",
              "iSO270012022Reference": "A.5.16, A.5.18, A.6.5",
              "evidenceExpected": "HR active/exit employee list reconciled with application user list and exception closure."
          },
          {
              "srNo": "20",
              "areas": "User Access List",
              "needToCheck": "Review of user roles by respective dept HOD",
              "iSO270012022Reference": "A.5.18",
              "evidenceExpected": "Department HOD access review sign-off with user-role list and dated approval."
          },
          {
              "srNo": "21",
              "areas": "User Access List",
              "needToCheck": "Audit logs for access changes",
              "iSO270012022Reference": "A.8.15, A.5.18",
              "evidenceExpected": "Access-change audit logs showing requester, approver, admin, changed role, and timestamp."
          },
          {
              "srNo": "22",
              "areas": "Change Management",
              "needToCheck": "Change management trails, dump, tracker etc",
              "iSO270012022Reference": "A.5.8, A.8.32",
              "evidenceExpected": "Change ticket/tracker with request, impact analysis, approvals, UAT/sign-off, deployment, rollback plan, and closure evidence."
          },
          {
              "srNo": "23",
              "areas": "Change Management",
              "needToCheck": "2 samples of change management",
              "iSO270012022Reference": "A.5.8, A.8.32",
              "evidenceExpected": "Two completed sample tickets with request, approval, implementation, closure, and timestamps."
          },
          {
              "srNo": "24",
              "areas": "Change Management",
              "needToCheck": "New software that has gone live (in-house)",
              "iSO270012022Reference": "A.8.32",
              "evidenceExpected": "Change ticket/tracker with request, impact analysis, approvals, UAT/sign-off, deployment, rollback plan, and closure evidence."
          },
          {
              "srNo": "25",
              "areas": "Change Management",
              "needToCheck": "UAT signoff",
              "iSO270012022Reference": "A.8.29, A.8.32",
              "evidenceExpected": "UAT sign-off, test user list, production user list, and evidence of environment segregation."
          },
          {
              "srNo": "26",
              "areas": "Change Management",
              "needToCheck": "Approval workflows with multiple levels",
              "iSO270012022Reference": "A.8.32",
              "evidenceExpected": "Change ticket/tracker with request, impact analysis, approvals, UAT/sign-off, deployment, rollback plan, and closure evidence."
          },
          {
              "srNo": "27",
              "areas": "Change Management",
              "needToCheck": "Version control system usage (Git) & branching",
              "iSO270012022Reference": "A.8.4, A.8.25, A.8.32",
              "evidenceExpected": "Change ticket/tracker with request, impact analysis, approvals, UAT/sign-off, deployment, rollback plan, and closure evidence."
          },
          {
              "srNo": "28",
              "areas": "Change Management",
              "needToCheck": "Rollback procedures and testing",
              "iSO270012022Reference": "A.8.29, A.8.32",
              "evidenceExpected": "Change ticket/tracker with request, impact analysis, approvals, UAT/sign-off, deployment, rollback plan, and closure evidence."
          },
          {
              "srNo": "29",
              "areas": "Change Management",
              "needToCheck": "Post-deployment monitoring and verification",
              "iSO270012022Reference": "A.8.29, A.8.32",
              "evidenceExpected": "Change ticket/tracker with request, impact analysis, approvals, UAT/sign-off, deployment, rollback plan, and closure evidence."
          },
          {
              "srNo": "30",
              "areas": "Change Management",
              "needToCheck": "Documentation of changes including impact analysis",
              "iSO270012022Reference": "A.8.32",
              "evidenceExpected": "Change ticket/tracker with request, impact analysis, approvals, UAT/sign-off, deployment, rollback plan, and closure evidence."
          },
          {
              "srNo": "31",
              "areas": "Change Management",
              "needToCheck": "Review of changes prioritisation and progress by Management",
              "iSO270012022Reference": "A.5.8, A.8.32",
              "evidenceExpected": "Change ticket/tracker with request, impact analysis, approvals, UAT/sign-off, deployment, rollback plan, and closure evidence."
          },
          {
              "srNo": "32",
              "areas": "Change Management",
              "needToCheck": "Integration with CI/CD pipelines",
              "iSO270012022Reference": "A.8.25, A.8.32",
              "evidenceExpected": "Change ticket/tracker with request, impact analysis, approvals, UAT/sign-off, deployment, rollback plan, and closure evidence."
          },
          {
              "srNo": "33",
              "areas": "Source Code Review",
              "needToCheck": "Application ticket dump and samples",
              "iSO270012022Reference": "A.8.25, A.8.26, A.8.28",
              "evidenceExpected": "Source code review checklist, peer approval, pull request evidence, coding standard checklist, and sampled tickets."
          },
          {
              "srNo": "34",
              "areas": "Source Code Review",
              "needToCheck": "Secure coding",
              "iSO270012022Reference": "A.8.28",
              "evidenceExpected": "Source code review checklist, peer approval, pull request evidence, coding standard checklist, and sampled tickets."
          },
          {
              "srNo": "35",
              "areas": "Source Code Review",
              "needToCheck": "Static application security testing (SAST) results",
              "iSO270012022Reference": "A.8.8, A.8.29",
              "evidenceExpected": "SAST scan report with vulnerabilities, severity, owner, remediation status, and retest result."
          },
          {
              "srNo": "36",
              "areas": "Source Code Review",
              "needToCheck": "Independent / Peer code reviews and approval processes",
              "iSO270012022Reference": "A.8.25, A.8.28",
              "evidenceExpected": "Source code review checklist, peer approval, pull request evidence, coding standard checklist, and sampled tickets."
          },
          {
              "srNo": "37",
              "areas": "Source Code Review",
              "needToCheck": "Dependency scanning for vulnerabilities",
              "iSO270012022Reference": "A.8.8, A.8.29",
              "evidenceExpected": "Dependency/SCA scan report with vulnerable libraries, CVEs, fixes, and exception approvals."
          },
          {
              "srNo": "38",
              "areas": "Source Code Review",
              "needToCheck": "Compliance with coding standards (OWASP)",
              "iSO270012022Reference": "A.8.28",
              "evidenceExpected": "Source code review checklist, peer approval, pull request evidence, coding standard checklist, and sampled tickets."
          },
          {
              "srNo": "39",
              "areas": "Source Code Review",
              "needToCheck": "Secrets management (no hard-coded credentials)",
              "iSO270012022Reference": "A.5.17, A.8.24, A.8.28",
              "evidenceExpected": "Secrets scanning report and repository evidence confirming no hard-coded credentials."
          },
          {
              "srNo": "40",
              "areas": "Source Code Review",
              "needToCheck": "check test cases and testing environment",
              "iSO270012022Reference": "A.8.29, A.8.31",
              "evidenceExpected": "Test case sheet, testing environment details, test execution evidence, and sign-off."
          },
          {
              "srNo": "41",
              "areas": "Source Code Review",
              "needToCheck": "Dynamic analysis integration",
              "iSO270012022Reference": "A.8.8, A.8.29",
              "evidenceExpected": "DAST scan report integrated with pipeline/release ticket and remediation evidence."
          },
          {
              "srNo": "42",
              "areas": "Password Parameters",
              "needToCheck": "Frontend password policy is visible",
              "iSO270012022Reference": "A.5.17, A.8.5",
              "evidenceExpected": "Password policy configuration screenshot, password reset flow evidence, hash/storage design note, and sample test result."
          },
          {
              "srNo": "43",
              "areas": "Password Parameters",
              "needToCheck": "Password complexity requirements",
              "iSO270012022Reference": "A.5.17, A.8.5",
              "evidenceExpected": "Password policy configuration screenshot, password reset flow evidence, hash/storage design note, and sample test result."
          },
          {
              "srNo": "44",
              "areas": "Password Parameters",
              "needToCheck": "Password expiration and history policies",
              "iSO270012022Reference": "A.5.17, A.8.5",
              "evidenceExpected": "Password policy configuration screenshot, password reset flow evidence, hash/storage design note, and sample test result."
          },
          {
              "srNo": "45",
              "areas": "Password Parameters",
              "needToCheck": "Secure storage (hashing with salts, bcrypt)",
              "iSO270012022Reference": "A.5.17, A.8.24",
              "evidenceExpected": "Password policy configuration screenshot, password reset flow evidence, hash/storage design note, and sample test result."
          },
          {
              "srNo": "46",
              "areas": "Password Parameters",
              "needToCheck": "Password reset mechanisms",
              "iSO270012022Reference": "A.5.17, A.8.5",
              "evidenceExpected": "Password policy configuration screenshot, password reset flow evidence, hash/storage design note, and sample test result."
          },
          {
              "srNo": "47",
              "areas": "Password Parameters",
              "needToCheck": "Resistance to common attacks",
              "iSO270012022Reference": "A.5.17, A.8.5",
              "evidenceExpected": "Password policy configuration screenshot, password reset flow evidence, hash/storage design note, and sample test result."
          },
          {
              "srNo": "48",
              "areas": "Password Parameters",
              "needToCheck": "Integration with password managers or SSO",
              "iSO270012022Reference": "A.5.17, A.8.5",
              "evidenceExpected": "Password policy configuration screenshot, password reset flow evidence, hash/storage design note, and sample test result."
          },
          {
              "srNo": "49",
              "areas": "Backup",
              "needToCheck": "BCP/DR",
              "iSO270012022Reference": "A.5.30, A.8.13",
              "evidenceExpected": "Backup policy/schedule, backup job logs, restore test evidence, retention details, encryption/access settings, and DR/BCP mapping."
          },
          {
              "srNo": "50",
              "areas": "Backup",
              "needToCheck": "Vendor report",
              "iSO270012022Reference": "A.5.19, A.5.20, A.5.21",
              "evidenceExpected": "Backup policy/schedule, backup job logs, restore test evidence, retention details, encryption/access settings, and DR/BCP mapping."
          },
          {
              "srNo": "51",
              "areas": "Backup",
              "needToCheck": "Backup frequency and retention policies",
              "iSO270012022Reference": "A.8.13",
              "evidenceExpected": "Backup policy/schedule, backup job logs, restore test evidence, retention details, encryption/access settings, and DR/BCP mapping."
          },
          {
              "srNo": "52",
              "areas": "Backup",
              "needToCheck": "Backup verification and restore testing",
              "iSO270012022Reference": "A.8.13",
              "evidenceExpected": "Backup policy/schedule, backup job logs, restore test evidence, retention details, encryption/access settings, and DR/BCP mapping."
          },
          {
              "srNo": "53",
              "areas": "Backup",
              "needToCheck": "Offsite or cloud-based storage for backups",
              "iSO270012022Reference": "A.8.13",
              "evidenceExpected": "Backup policy/schedule, backup job logs, restore test evidence, retention details, encryption/access settings, and DR/BCP mapping."
          },
          {
              "srNo": "54",
              "areas": "Backup",
              "needToCheck": "Encryption of backup data",
              "iSO270012022Reference": "A.8.13, A.8.24",
              "evidenceExpected": "Backup policy/schedule, backup job logs, restore test evidence, retention details, encryption/access settings, and DR/BCP mapping."
          },
          {
              "srNo": "55",
              "areas": "Backup",
              "needToCheck": "Access controls on backup repositories",
              "iSO270012022Reference": "A.5.15, A.5.18, A.8.13",
              "evidenceExpected": "Backup policy/schedule, backup job logs, restore test evidence, retention details, encryption/access settings, and DR/BCP mapping."
          },
          {
              "srNo": "56",
              "areas": "Backup",
              "needToCheck": "Data localization",
              "iSO270012022Reference": "A.5.31, A.5.34",
              "evidenceExpected": "Backup policy/schedule, backup job logs, restore test evidence, retention details, encryption/access settings, and DR/BCP mapping."
          },
          {
              "srNo": "57",
              "areas": "Backup",
              "needToCheck": "Integration with disaster recovery plans (RTO/RPO)",
              "iSO270012022Reference": "A.5.30, A.8.13",
              "evidenceExpected": "Backup policy/schedule, backup job logs, restore test evidence, retention details, encryption/access settings, and DR/BCP mapping."
          },
          {
              "srNo": "58",
              "areas": "Encryption & Masking",
              "needToCheck": "What data is masked/encrypted",
              "iSO270012022Reference": "A.8.11, A.8.24",
              "evidenceExpected": "Encryption/masking policy, data classification, TLS certificate details, key management evidence, and sample masked/encrypted data screenshots."
          },
          {
              "srNo": "59",
              "areas": "Encryption & Masking",
              "needToCheck": "SSL encryption and security",
              "iSO270012022Reference": "A.8.20, A.8.24",
              "evidenceExpected": "Encryption/masking policy, data classification, TLS certificate details, key management evidence, and sample masked/encrypted data screenshots."
          },
          {
              "srNo": "60",
              "areas": "Encryption & Masking",
              "needToCheck": "Personal data privacy – PII",
              "iSO270012022Reference": "A.5.31, A.5.34, A.8.24",
              "evidenceExpected": "Encryption/masking policy, data classification, TLS certificate details, key management evidence, and sample masked/encrypted data screenshots."
          },
          {
              "srNo": "61",
              "areas": "Encryption & Masking",
              "needToCheck": "Use of strong algorithms (AES-256)",
              "iSO270012022Reference": "A.8.24",
              "evidenceExpected": "Encryption/masking policy, data classification, TLS certificate details, key management evidence, and sample masked/encrypted data screenshots."
          },
          {
              "srNo": "62",
              "areas": "Encryption & Masking",
              "needToCheck": "Tokenization for sensitive data",
              "iSO270012022Reference": "A.8.11, A.8.24",
              "evidenceExpected": "Encryption/masking policy, data classification, TLS certificate details, key management evidence, and sample masked/encrypted data screenshots."
          },
          {
              "srNo": "63",
              "areas": "Encryption & Masking",
              "needToCheck": "Data classification and selective encryption",
              "iSO270012022Reference": "A.5.12, A.5.13, A.8.24",
              "evidenceExpected": "Encryption/masking policy, data classification, TLS certificate details, key management evidence, and sample masked/encrypted data screenshots."
          },
          {
              "srNo": "64",
              "areas": "Encryption & Masking",
              "needToCheck": "Certificate management for SSL/TLS",
              "iSO270012022Reference": "A.8.20, A.8.24",
              "evidenceExpected": "Encryption/masking policy, data classification, TLS certificate details, key management evidence, and sample masked/encrypted data screenshots."
          },
          {
              "srNo": "65",
              "areas": "Encryption & Masking",
              "needToCheck": "Compliance with regulations (GDPR)",
              "iSO270012022Reference": "A.5.31, A.5.34, A.8.24",
              "evidenceExpected": "Encryption/masking policy, data classification, TLS certificate details, key management evidence, and sample masked/encrypted data screenshots."
          },
          {
              "srNo": "66",
              "areas": "VA/PT",
              "needToCheck": "3rd party Risk – SOC2 ISO",
              "iSO270012022Reference": "A.5.19, A.5.20, A.5.21",
              "evidenceExpected": "VA/PT scope, latest report, risk rating, remediation tracker, closure evidence, and follow-up scan report."
          },
          {
              "srNo": "67",
              "areas": "VA/PT",
              "needToCheck": "Mob app VAPT",
              "iSO270012022Reference": "A.8.8, A.8.26, A.8.29",
              "evidenceExpected": "VA/PT scope, latest report, risk rating, remediation tracker, closure evidence, and follow-up scan report."
          },
          {
              "srNo": "68",
              "areas": "VA/PT",
              "needToCheck": "Vulnerability assessment frequency and scope",
              "iSO270012022Reference": "A.8.8, A.8.29",
              "evidenceExpected": "VA/PT scope, latest report, risk rating, remediation tracker, closure evidence, and follow-up scan report."
          },
          {
              "srNo": "69",
              "areas": "VA/PT",
              "needToCheck": "Penetration testing reports and remediation",
              "iSO270012022Reference": "A.8.8, A.8.29",
              "evidenceExpected": "VA/PT scope, latest report, risk rating, remediation tracker, closure evidence, and follow-up scan report."
          },
          {
              "srNo": "70",
              "areas": "VA/PT",
              "needToCheck": "Internal vs. external testing",
              "iSO270012022Reference": "A.8.8, A.8.29",
              "evidenceExpected": "VA/PT scope, latest report, risk rating, remediation tracker, closure evidence, and follow-up scan report."
          },
          {
              "srNo": "71",
              "areas": "VA/PT",
              "needToCheck": "Tools used (Nessus, Burp Suite)",
              "iSO270012022Reference": "A.8.8, A.8.29",
              "evidenceExpected": "VA/PT scope, latest report, risk rating, remediation tracker, closure evidence, and follow-up scan report."
          },
          {
              "srNo": "72",
              "areas": "VA/PT",
              "needToCheck": "Risk scoring and prioritization",
              "iSO270012022Reference": "A.8.8, A.8.29",
              "evidenceExpected": "VA/PT scope, latest report, risk rating, remediation tracker, closure evidence, and follow-up scan report."
          },
          {
              "srNo": "73",
              "areas": "VA/PT",
              "needToCheck": "Follow-up scans to verify fixes",
              "iSO270012022Reference": "A.8.8, A.8.29",
              "evidenceExpected": "VA/PT scope, latest report, risk rating, remediation tracker, closure evidence, and follow-up scan report."
          },
          {
              "srNo": "74",
              "areas": "VA/PT",
              "needToCheck": "Mobile-specific checks",
              "iSO270012022Reference": "A.8.8, A.8.26, A.8.29",
              "evidenceExpected": "VA/PT scope, latest report, risk rating, remediation tracker, closure evidence, and follow-up scan report."
          },
          {
              "srNo": "75",
              "areas": "API Protection",
              "needToCheck": "API integration and security report",
              "iSO270012022Reference": "A.8.20, A.8.26",
              "evidenceExpected": "API security architecture, gateway/WAF settings, auth configuration, rate limit rules, API logs, and security test report."
          },
          {
              "srNo": "76",
              "areas": "API Protection",
              "needToCheck": "Authentication mechanisms (OAuth, JWT)",
              "iSO270012022Reference": "A.5.17, A.8.5, A.8.26",
              "evidenceExpected": "API security architecture, gateway/WAF settings, auth configuration, rate limit rules, API logs, and security test report."
          },
          {
              "srNo": "77",
              "areas": "API Protection",
              "needToCheck": "Rate limiting and throttling",
              "iSO270012022Reference": "A.8.20, A.8.21, A.8.26",
              "evidenceExpected": "Rate-limit/WAF/API gateway configuration and failed attempt test evidence."
          },
          {
              "srNo": "78",
              "areas": "API Protection",
              "needToCheck": "Input validation and sanitization",
              "iSO270012022Reference": "A.8.26, A.8.28",
              "evidenceExpected": "API security architecture, gateway/WAF settings, auth configuration, rate limit rules, API logs, and security test report."
          },
          {
              "srNo": "79",
              "areas": "API Protection",
              "needToCheck": "CORS policies and CSRF protection",
              "iSO270012022Reference": "A.8.26, A.8.28",
              "evidenceExpected": "API security architecture, gateway/WAF settings, auth configuration, rate limit rules, API logs, and security test report."
          },
          {
              "srNo": "80",
              "areas": "API Protection",
              "needToCheck": "API gateway usage for centralized security",
              "iSO270012022Reference": "A.8.20, A.8.21, A.8.26",
              "evidenceExpected": "API security architecture, gateway/WAF settings, auth configuration, rate limit rules, API logs, and security test report."
          },
          {
              "srNo": "81",
              "areas": "API Protection",
              "needToCheck": "Logging and monitoring of API calls",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "API security architecture, gateway/WAF settings, auth configuration, rate limit rules, API logs, and security test report."
          },
          {
              "srNo": "82",
              "areas": "API Protection",
              "needToCheck": "Encryption for API data in transit",
              "iSO270012022Reference": "A.8.24, A.8.26",
              "evidenceExpected": "API security architecture, gateway/WAF settings, auth configuration, rate limit rules, API logs, and security test report."
          },
          {
              "srNo": "83",
              "areas": "Log Maintenance",
              "needToCheck": "Login/logout trail, master, DB",
              "iSO270012022Reference": "A.8.15, A.8.16, A.8.17",
              "evidenceExpected": "Login/logout audit log export with user ID, timestamp, IP, status, and retention period."
          },
          {
              "srNo": "84",
              "areas": "Log Maintenance",
              "needToCheck": "Centralized logging system (ELK stack)",
              "iSO270012022Reference": "A.8.15, A.8.16, A.8.17",
              "evidenceExpected": "Logging policy, centralized log dashboard/export, retention configuration, alert rules, and sample log evidence."
          },
          {
              "srNo": "85",
              "areas": "Log Maintenance",
              "needToCheck": "Log retention periods and archiving",
              "iSO270012022Reference": "A.5.33, A.8.15",
              "evidenceExpected": "Logging policy, centralized log dashboard/export, retention configuration, alert rules, and sample log evidence."
          },
          {
              "srNo": "86",
              "areas": "Log Maintenance",
              "needToCheck": "Tamper-proof logging (immutability)",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "Logging policy, centralized log dashboard/export, retention configuration, alert rules, and sample log evidence."
          },
          {
              "srNo": "87",
              "areas": "Log Maintenance",
              "needToCheck": "Real-time monitoring and alerting",
              "iSO270012022Reference": "A.8.15, A.8.16, A.8.17",
              "evidenceExpected": "Logging policy, centralized log dashboard/export, retention configuration, alert rules, and sample log evidence."
          },
          {
              "srNo": "88",
              "areas": "Log Maintenance",
              "needToCheck": "Log correlation across services",
              "iSO270012022Reference": "A.8.15, A.8.16, A.8.17",
              "evidenceExpected": "Logging policy, centralized log dashboard/export, retention configuration, alert rules, and sample log evidence."
          },
          {
              "srNo": "89",
              "areas": "Log Maintenance",
              "needToCheck": "Compliance with logging standards",
              "iSO270012022Reference": "A.5.33, A.8.15",
              "evidenceExpected": "Logging policy, centralized log dashboard/export, retention configuration, alert rules, and sample log evidence."
          },
          {
              "srNo": "90",
              "areas": "Database Segregation",
              "needToCheck": "Separation of dev/test/prod databases",
              "iSO270012022Reference": "A.8.31",
              "evidenceExpected": "Environment architecture, DB/network segregation evidence, access matrix, masked test data proof, and monitoring/backup evidence."
          },
          {
              "srNo": "91",
              "areas": "Database Segregation",
              "needToCheck": "Network segmentation (VLANs, firewalls)",
              "iSO270012022Reference": "A.8.20, A.8.22",
              "evidenceExpected": "Environment architecture, DB/network segregation evidence, access matrix, masked test data proof, and monitoring/backup evidence."
          },
          {
              "srNo": "92",
              "areas": "Database Segregation",
              "needToCheck": "Data masking in non-production environments",
              "iSO270012022Reference": "A.8.11, A.8.31",
              "evidenceExpected": "Environment architecture, DB/network segregation evidence, access matrix, masked test data proof, and monitoring/backup evidence."
          },
          {
              "srNo": "93",
              "areas": "Database Segregation",
              "needToCheck": "Access controls at database level",
              "iSO270012022Reference": "A.5.15, A.5.18, A.8.3",
              "evidenceExpected": "Environment architecture, DB/network segregation evidence, access matrix, masked test data proof, and monitoring/backup evidence."
          },
          {
              "srNo": "94",
              "areas": "Database Segregation",
              "needToCheck": "Backup and replication strategies per environment",
              "iSO270012022Reference": "A.8.13, A.8.31",
              "evidenceExpected": "Environment architecture, DB/network segregation evidence, access matrix, masked test data proof, and monitoring/backup evidence."
          },
          {
              "srNo": "95",
              "areas": "Database Segregation",
              "needToCheck": "Monitoring for cross-database access attempts",
              "iSO270012022Reference": "A.5.15, A.5.18, A.8.3",
              "evidenceExpected": "Environment architecture, DB/network segregation evidence, access matrix, masked test data proof, and monitoring/backup evidence."
          },
          {
              "srNo": "96",
              "areas": "Incident Management",
              "needToCheck": "Incident response plan documentation",
              "iSO270012022Reference": "A.5.24, A.5.26, A.5.30",
              "evidenceExpected": "IR policy/playbook, incident ticket/RCA, SLA evidence, event evidence, post-incident review, and closure tracker."
          },
          {
              "srNo": "97",
              "areas": "Incident Management",
              "needToCheck": "Ticketing system workflow",
              "iSO270012022Reference": "A.5.24, A.5.26, A.5.30",
              "evidenceExpected": "IR policy/playbook, incident ticket/RCA, SLA evidence, event evidence, post-incident review, and closure tracker."
          },
          {
              "srNo": "98",
              "areas": "Incident Management",
              "needToCheck": "SLA definitions for response and resolution",
              "iSO270012022Reference": "A.5.24, A.5.26, A.5.30",
              "evidenceExpected": "IR policy/playbook, incident ticket/RCA, SLA evidence, event evidence, post-incident review, and closure tracker."
          },
          {
              "srNo": "99",
              "areas": "Incident Management",
              "needToCheck": "Root cause analysis (RCA) processes",
              "iSO270012022Reference": "A.5.27",
              "evidenceExpected": "IR policy/playbook, incident ticket/RCA, SLA evidence, event evidence, post-incident review, and closure tracker."
          },
          {
              "srNo": "100",
              "areas": "Incident Management",
              "needToCheck": "Integration with monitoring tools for auto-ticketing",
              "iSO270012022Reference": "A.8.16, A.5.26",
              "evidenceExpected": "IR policy/playbook, incident ticket/RCA, SLA evidence, event evidence, post-incident review, and closure tracker."
          },
          {
              "srNo": "101",
              "areas": "Incident Management",
              "needToCheck": "The organization shall collect the evidences related to information security events.",
              "iSO270012022Reference": "A.5.25, A.5.28, A.8.15",
              "evidenceExpected": "IR policy/playbook, incident ticket/RCA, SLA evidence, event evidence, post-incident review, and closure tracker."
          },
          {
              "srNo": "102",
              "areas": "Incident Management",
              "needToCheck": "Post-incident reviews and lessons learned",
              "iSO270012022Reference": "A.5.27",
              "evidenceExpected": "IR policy/playbook, incident ticket/RCA, SLA evidence, event evidence, post-incident review, and closure tracker."
          },
          {
              "srNo": "103",
              "areas": "Incident Management",
              "needToCheck": "User support channels and knowledge base",
              "iSO270012022Reference": "A.5.24, A.5.25, A.5.26",
              "evidenceExpected": "IR policy/playbook, incident ticket/RCA, SLA evidence, event evidence, post-incident review, and closure tracker."
          },
          {
              "srNo": "104",
              "areas": "Log Review",
              "needToCheck": "Regular review schedules and responsible parties",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "Log review calendar, reviewer sign-off, SIEM/anomaly reports, findings tracker, action closure, and review evidence."
          },
          {
              "srNo": "105",
              "areas": "Log Review",
              "needToCheck": "Transaction & edit logs",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "Log review calendar, reviewer sign-off, SIEM/anomaly reports, findings tracker, action closure, and review evidence."
          },
          {
              "srNo": "106",
              "areas": "Log Review",
              "needToCheck": "Automated anomaly detection in logs",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "Log review calendar, reviewer sign-off, SIEM/anomaly reports, findings tracker, action closure, and review evidence."
          },
          {
              "srNo": "107",
              "areas": "Log Review",
              "needToCheck": "Reporting on key metrics",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "Log review calendar, reviewer sign-off, SIEM/anomaly reports, findings tracker, action closure, and review evidence."
          },
          {
              "srNo": "108",
              "areas": "Log Review",
              "needToCheck": "Correlation with other security tools (SIEM)",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "Log review calendar, reviewer sign-off, SIEM/anomaly reports, findings tracker, action closure, and review evidence."
          },
          {
              "srNo": "109",
              "areas": "Log Review",
              "needToCheck": "Documentation of review findings and actions",
              "iSO270012022Reference": "A.5.28, A.8.16",
              "evidenceExpected": "Log review calendar, reviewer sign-off, SIEM/anomaly reports, findings tracker, action closure, and review evidence."
          },
          {
              "srNo": "110",
              "areas": "Log Review",
              "needToCheck": "Log Review evidences",
              "iSO270012022Reference": "A.8.15, A.8.16",
              "evidenceExpected": "Log review calendar, reviewer sign-off, SIEM/anomaly reports, findings tracker, action closure, and review evidence."
          },
          {
              "srNo": "111",
              "areas": "AI-Specific Controls",
              "needToCheck": "Content safety / moderation filters for generated images & videos. Making sure no harmful content is being generated by the AI",
              "iSO270012022Reference": "A.8.26, A.8.28, A.5.34",
              "evidenceExpected": "AI content safety policy, moderation/filter configuration, blocked prompt/output samples, and review logs."
          },
          {
              "srNo": "112",
              "areas": "AI-Specific Controls",
              "needToCheck": "Watermarking / provenance metadata for all AI-generated images & videos",
              "iSO270012022Reference": "A.5.14, A.5.33, A.8.15",
              "evidenceExpected": "Watermark/provenance design, generated media sample, metadata validation, and exception process."
          },
          {
              "srNo": "113",
              "areas": "AI-Specific Controls",
              "needToCheck": "Third-party AI foundation model provider assessment (SOC2 / ISO report)",
              "iSO270012022Reference": "A.5.19, A.5.20, A.5.21, A.5.23",
              "evidenceExpected": "AI provider SOC 2/ISO report, vendor risk assessment, security questionnaire, and approval record."
          },
          {
              "srNo": "114",
              "areas": "AI-Specific Controls",
              "needToCheck": "Intellectual property & copyright compliance checks",
              "iSO270012022Reference": "A.5.31, A.5.34",
              "evidenceExpected": "IP/copyright assessment, dataset/source approval, legal review, and takedown/complaint process."
          },
          {
              "srNo": "115",
              "areas": "AI-Specific Controls",
              "needToCheck": "Signed Data Processing Agreement (DPA) with AI provider (data ownership, deletion rights)",
              "iSO270012022Reference": "A.5.19, A.5.20, A.5.21, A.5.23",
              "evidenceExpected": "Signed DPA, data processing terms, retention/deletion clauses, deletion-right evidence, and vendor ownership confirmation."
          },
          {
              "srNo": "116",
              "areas": "AI-Specific Controls",
              "needToCheck": "Backup & recovery procedures for AI models",
              "iSO270012022Reference": "A.8.13, A.5.30",
              "evidenceExpected": "AI model/config backup procedure, restore test evidence, model registry/export, and recovery plan."
          }
      ],
      "sourceSheet": "ITGC ISO27001 Checklist"
  },
  {
    "name": "System Verification",
    "type": "TABLE_CHECKLIST",
    "workpaperType": "SAMPLE_TESTING_CHECKLIST",
    "framework": "Auditie Checklist Workbook",
    "areaKey": "system-verification",
    "evidenceRequirement": "Follow source workbook sheet: Sys_ver checklist. Link evidence using the Repository module.",
    "columns": [
      {
        "columnName": "Sr. No",
        "columnKey": "srNo",
        "columnType": "text"
      },
      {
        "columnName": "Points to Check",
        "columnKey": "pointsToCheck",
        "columnType": "text"
      },
      {
        "columnName": "Evidence Expected (Manual Steps)",
        "columnKey": "evidenceExpected",
        "columnType": "text"
      },
      {
        "columnName": "Sample 1",
        "columnKey": "sample1",
        "columnType": "text"
      },
      {
        "columnName": "Sample 2",
        "columnKey": "sample2",
        "columnType": "text"
      }
    ],
    "seedRows": [
      {
        "srNo": "1",
        "pointsToCheck": "Asset identification: Asset Number / Serial No. + Employee Name",
        "evidenceExpected": "wmic bios get serialnumber",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "2",
        "pointsToCheck": "System is being used only by the assigned/authorized user",
        "evidenceExpected": "Press Win + R, type whoami and press Enter \nGo to Settings → Accounts → Your info",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "3",
        "pointsToCheck": "Operating System details and licensing",
        "evidenceExpected": "Right-click This PC → Properties → Screenshot of full window (shows OS version, build, and license status)",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "4",
        "pointsToCheck": "Endpoint security management process",
        "evidenceExpected": "Screenshot of current Antivirus / Windows Security center",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "5",
        "pointsToCheck": "List of all installed software/applications",
        "evidenceExpected": "Go to Control Panel → Programs and Features → Take multiple screenshots or export list",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "6",
        "pointsToCheck": "Only approved OS and software are installed; no outdated software",
        "evidenceExpected": "1. Screenshot of Programs and Features \n2. Screenshot of Settings → Windows Update → Update history",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "7",
        "pointsToCheck": "Approval obtained for open-source software",
        "evidenceExpected": "Approval email / ticket + screenshot of that software in Programs and Features",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "8",
        "pointsToCheck": "User accounts on the system and their types",
        "evidenceExpected": "Press Win + R, type netplwiz or lusrmgr.msc → Screenshot of all user accounts and their types",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "9",
        "pointsToCheck": "Connected devices and printers",
        "evidenceExpected": "Go to Settings → Devices → Printers & scanners and Bluetooth & devices → Screenshots",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "10",
        "pointsToCheck": "USB / Removable media access is restricted",
        "evidenceExpected": "Press Win + R, type gpedit.msc → Go to Computer Configuration → Administrative Templates → System → Device Installation → Screenshot of restrictions",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "11",
        "pointsToCheck": "No unauthorized multimedia, pirated content, or inappropriate material",
        "evidenceExpected": "Manual search in File Explorer (Documents, Downloads, Desktop, C:\\Users[Username]) + Screenshot of search results showing nothing found",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "12",
        "pointsToCheck": "Firewall is enabled",
        "evidenceExpected": "Go to Settings → Update & Security → Windows Security → Firewall & network protection → Screenshot showing Firewall is ON",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "13",
        "pointsToCheck": "OS patches and Antivirus updates are current",
        "evidenceExpected": "1. Settings → Windows Update → View update history 2. Open Windows Security → Virus & threat protection → Screenshot of protection status and last scan",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "14",
        "pointsToCheck": "Shared folders access is on need-to-know basis",
        "evidenceExpected": "Right-click shared folder → Properties → Sharing → Advanced Sharing → Permissions → Screenshot",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "15",
        "pointsToCheck": "Wi-Fi, Bluetooth and wireless connectivity controlled",
        "evidenceExpected": "Settings → Network & Internet → Wi-Fi and Bluetooth & devices → Screenshots of current status",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "16",
        "pointsToCheck": "Data Loss Prevention (DLP) tools (if any)",
        "evidenceExpected": "Screenshot of any configured DLP settings in Windows Security or Group Policy",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "17",
        "pointsToCheck": "Email access restricted to official services",
        "evidenceExpected": "Open Outlook/Email client → Screenshot of account settings showing only official email",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "18",
        "pointsToCheck": "Hard disk encryption is enabled",
        "evidenceExpected": "Open Windows Security → Device encryption OR Search for \"BitLocker\" in Start menu → Screenshot of encryption status",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "19",
        "pointsToCheck": "Screen saver timeout with password lock",
        "evidenceExpected": "Right-click Desktop → Personalize → Lock screen → Screen saver settings → Screenshot of timeout and \"On resume, display logon screen\" checked",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "20",
        "pointsToCheck": "Clear Desk and Clear Screen policy followed",
        "evidenceExpected": "Observation + Photo of clean workstation",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "21",
        "pointsToCheck": "Date, time and time zone correct",
        "evidenceExpected": "Right-click clock on taskbar → Adjust date and time → Screenshot (should be synced)",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "22",
        "pointsToCheck": "Access rights to create/delete folders on servers are restricted",
        "evidenceExpected": "Right-click server folder → Properties → Security → Edit → Screenshot of permissions",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "23",
        "pointsToCheck": "Common/shared drives not given blanket access",
        "evidenceExpected": "Right-click shared drive → Properties → Security → Screenshot showing limited users/groups",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "24",
        "pointsToCheck": "Digital signatures (if used)",
        "evidenceExpected": "Screenshot of certificate in certmgr.msc or sample signed document",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "25",
        "pointsToCheck": "Backup is configured",
        "evidenceExpected": "Search \"Backup and Restore\" in Start menu → Screenshot of backup settings and last backup",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "26",
        "pointsToCheck": "Cloud storage (OneDrive, Google Drive, etc.) access is approved",
        "evidenceExpected": "Screenshot of sync client settings + approval record",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "27",
        "pointsToCheck": "Antivirus fully configured with scheduled scans",
        "evidenceExpected": "Open Windows Security → Virus & threat protection → Screenshot of all settings, real-time protection ON, scheduled scan enabled",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "28",
        "pointsToCheck": "Network accounts and password policy",
        "evidenceExpected": "Press Win + R, type net accounts → Screenshot of result",
        "sample1": "",
        "sample2": ""
      },
      {
        "srNo": "29",
        "pointsToCheck": "Any other areas / observations",
        "evidenceExpected": "Additional screenshots or notes",
        "sample1": "",
        "sample2": ""
      }
    ],
    "sourceSheet": "Sys_ver checklist"
  },
  {
    "name": "Password Review",
    "type": "TABLE_CHECKLIST",
    "workpaperType": "TECHNICAL_REVIEW_CHECKLIST",
    "framework": "Auditie Checklist Workbook",
    "areaKey": "password-review",
    "evidenceRequirement": "Follow source workbook sheet: Password Policy . Link evidence using the Repository module.",
    "columns": [
      {
        "columnName": "#",
        "columnKey": "column1",
        "columnType": "text"
      },
      {
        "columnName": "Length",
        "columnKey": "length",
        "columnType": "text"
      },
      {
        "columnName": "Complexity",
        "columnKey": "complexity",
        "columnType": "text"
      },
      {
        "columnName": "Mandatory Rotation/ Expiry",
        "columnKey": "mandatoryRotationExpiry",
        "columnType": "text"
      },
      {
        "columnName": "History",
        "columnKey": "history",
        "columnType": "text"
      },
      {
        "columnName": "Account lock-out - No. of Failed Login Attempts",
        "columnKey": "accountLockOutNoOfFailedLoginAttempts",
        "columnType": "text"
      },
      {
        "columnName": "Account lock-out - recovery",
        "columnKey": "accountLockOutRecovery",
        "columnType": "text"
      },
      {
        "columnName": "Account Lock-out - Period",
        "columnKey": "accountLockOutPeriod",
        "columnType": "text"
      },
      {
        "columnName": "Masking on screen",
        "columnKey": "maskingOnScreen",
        "columnType": "text"
      },
      {
        "columnName": "Encryption in Database",
        "columnKey": "encryptionInDatabase",
        "columnType": "text"
      },
      {
        "columnName": "2FA",
        "columnKey": "2FA",
        "columnType": "text"
      }
    ],
    "seedRows": [
      {
        "column1": "Admin",
        "length": "8 or More",
        "complexity": "Alpha-Numeric-Special Charaters",
        "mandatoryRotationExpiry": "30 Days",
        "history": "Previous 5 Passwords",
        "accountLockOutNoOfFailedLoginAttempts": "3",
        "accountLockOutRecovery": "Only Admin",
        "accountLockOutPeriod": "99999999",
        "maskingOnScreen": "Yes",
        "encryptionInDatabase": "Yes",
        "2FA": "Yes"
      },
      {
        "column1": "User",
        "length": "6 or More",
        "complexity": "Alpha-Numeric-Special Charaters",
        "mandatoryRotationExpiry": "45 Days",
        "history": "Previous 3 Passwords",
        "accountLockOutNoOfFailedLoginAttempts": "5",
        "accountLockOutRecovery": "Auto/ Admin",
        "accountLockOutPeriod": "60 Minutes",
        "maskingOnScreen": "Yes",
        "encryptionInDatabase": "Yes",
        "2FA": "No"
      }
    ],
    "sourceSheet": "Password Policy "
  },
  {
    "name": "AWS Review",
    "type": "TABLE_CHECKLIST",
    "workpaperType": "TECHNICAL_REVIEW_CHECKLIST",
    "framework": "Auditie Checklist Workbook",
    "areaKey": "aws-review",
    "evidenceRequirement": "Follow source workbook sheet: AWS checklist. Link evidence using the Repository module.",
    "columns": [
      {
        "columnName": "ISO_Control",
        "columnKey": "iSOControl",
        "columnType": "text"
      },
      {
        "columnName": "Control_Category",
        "columnKey": "controlCategory",
        "columnType": "text"
      },
      {
        "columnName": "What_to_Check",
        "columnKey": "whatToCheck",
        "columnType": "text"
      },
      {
        "columnName": "Where_to_Check",
        "columnKey": "whereToCheck",
        "columnType": "text"
      },
      {
        "columnName": "How_to_Check",
        "columnKey": "howToCheck",
        "columnType": "text"
      },
      {
        "columnName": "Verification_Method",
        "columnKey": "verificationMethod",
        "columnType": "text"
      },
      {
        "columnName": "Expected_Configuration",
        "columnKey": "expectedConfiguration",
        "columnType": "text"
      },
      {
        "columnName": "Risk_Level",
        "columnKey": "riskLevel",
        "columnType": "text"
      }
    ],
    "seedRows": [
      {
        "iSOControl": "A.5.1",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "AWS Security Policies",
        "whereToCheck": "IAM Policies, AWS Config",
        "howToCheck": "Review IAM policies and compliance rules",
        "verificationMethod": "Policy Review",
        "expectedConfiguration": "Comprehensive security policies documented",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.5.2",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "AWS IAM Roles and Responsibilities",
        "whereToCheck": "IAM Console",
        "howToCheck": "aws iam list-roles, list-users",
        "verificationMethod": "Role Review",
        "expectedConfiguration": "Clear role definitions with appropriate permissions",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.5.9",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Asset Inventory",
        "whereToCheck": "AWS Config, Systems Manager",
        "howToCheck": "aws config describe-configuration-recorders",
        "verificationMethod": "Inventory Review",
        "expectedConfiguration": "Complete asset inventory maintained",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.5.15",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Access Control",
        "whereToCheck": "IAM, AWS SSO",
        "howToCheck": "aws iam list-access-keys, get-account-summary",
        "verificationMethod": "Access Review",
        "expectedConfiguration": "Centralized access management",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.5.16",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Identity Management",
        "whereToCheck": "AWS IAM, AWS SSO",
        "howToCheck": "aws iam get-account-password-policy",
        "verificationMethod": "Identity Review",
        "expectedConfiguration": "Strong identity management with federation",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.5.17",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Authentication",
        "whereToCheck": "IAM Password Policy, MFA",
        "howToCheck": "aws iam get-account-password-policy",
        "verificationMethod": "Auth Policy Review",
        "expectedConfiguration": "MFA enforced for all users",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.5.18",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Access Rights",
        "whereToCheck": "IAM Policies, Resource Policies",
        "howToCheck": "aws iam simulate-principal-policy",
        "verificationMethod": "Permission Review",
        "expectedConfiguration": "Least privilege access implemented",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.5.23",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Cloud Services Security",
        "whereToCheck": "AWS Security Hub, Config",
        "howToCheck": "aws securityhub get-findings",
        "verificationMethod": "Security Review",
        "expectedConfiguration": "Cloud-specific security controls active",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.6.7",
        "controlCategory": "People Controls",
        "whatToCheck": "Remote Working",
        "whereToCheck": "VPN, Direct Connect",
        "howToCheck": "Check VPN configurations and connections",
        "verificationMethod": "Remote Access Review",
        "expectedConfiguration": "Secure remote access to AWS resources",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.6.8",
        "controlCategory": "People Controls",
        "whatToCheck": "Security Event Reporting",
        "whereToCheck": "CloudWatch, SNS",
        "howToCheck": "aws logs describe-log-groups",
        "verificationMethod": "Incident Review",
        "expectedConfiguration": "Security incident response procedures",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.7.1",
        "controlCategory": "Physical Controls",
        "whatToCheck": "Physical Security",
        "whereToCheck": "AWS Data Centers",
        "howToCheck": "Review AWS SOC reports and certifications",
        "verificationMethod": "Certification Review",
        "expectedConfiguration": "AWS physical security inherited",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.7.3",
        "controlCategory": "Physical Controls",
        "whatToCheck": "Environmental Protection",
        "whereToCheck": "AWS Infrastructure",
        "howToCheck": "Review AWS environmental controls",
        "verificationMethod": "AWS Documentation",
        "expectedConfiguration": "Environmental protections by AWS",
        "riskLevel": "Low"
      },
      {
        "iSOControl": "A.7.4",
        "controlCategory": "Physical Controls",
        "whatToCheck": "Physical Monitoring",
        "whereToCheck": "AWS Monitoring",
        "howToCheck": "Review AWS physical monitoring reports",
        "verificationMethod": "Report Review",
        "expectedConfiguration": "Physical monitoring by AWS",
        "riskLevel": "Low"
      },
      {
        "iSOControl": "A.8.1",
        "controlCategory": "Technological Controls",
        "whatToCheck": "User Access Management",
        "whereToCheck": "IAM, AWS SSO",
        "howToCheck": "aws iam list-users, list-groups",
        "verificationMethod": "User Review",
        "expectedConfiguration": "User access properly managed",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.2",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Privileged Access",
        "whereToCheck": "IAM Root Account, Admin Roles",
        "howToCheck": "aws iam generate-credential-report",
        "verificationMethod": "Privilege Review",
        "expectedConfiguration": "Root account secured, admin access limited",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.3",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Information Access Restriction",
        "whereToCheck": "S3 Bucket Policies, Resource Policies",
        "howToCheck": "aws s3api get-bucket-policy",
        "verificationMethod": "Access Control Review",
        "expectedConfiguration": "Resource access properly restricted",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.5",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Secure Authentication",
        "whereToCheck": "MFA, AWS SSO",
        "howToCheck": "aws iam list-mfa-devices",
        "verificationMethod": "MFA Verification",
        "expectedConfiguration": "Multi-factor authentication enabled",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.6",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Capacity Management",
        "whereToCheck": "CloudWatch, Auto Scaling",
        "howToCheck": "aws cloudwatch list-metrics",
        "verificationMethod": "Capacity Review",
        "expectedConfiguration": "Resource monitoring and auto-scaling",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.7",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Malware Protection",
        "whereToCheck": "GuardDuty, Inspector",
        "howToCheck": "aws guardduty list-detectors",
        "verificationMethod": "Malware Review",
        "expectedConfiguration": "Advanced threat detection active",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.8",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Vulnerability Management",
        "whereToCheck": "Inspector, Security Hub",
        "howToCheck": "aws inspector list-findings",
        "verificationMethod": "Vulnerability Review",
        "expectedConfiguration": "Regular vulnerability assessments",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.9",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Configuration Management",
        "whereToCheck": "AWS Config, Systems Manager",
        "howToCheck": "aws configservice describe-configuration-recorders",
        "verificationMethod": "Config Review",
        "expectedConfiguration": "Configuration compliance monitoring",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.10",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Data Deletion",
        "whereToCheck": "S3 Lifecycle, Data Retention",
        "howToCheck": "aws s3api get-bucket-lifecycle-configuration",
        "verificationMethod": "Retention Review",
        "expectedConfiguration": "Automated data lifecycle management",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.11",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Data Masking",
        "whereToCheck": "RDS, Redshift Data Masking",
        "howToCheck": "Review database masking configurations",
        "verificationMethod": "Masking Review",
        "expectedConfiguration": "Data masking in non-production",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.12",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Data Loss Prevention",
        "whereToCheck": "Macie, GuardDuty",
        "howToCheck": "aws macie2 describe-classification-job",
        "verificationMethod": "DLP Review",
        "expectedConfiguration": "Data loss prevention monitoring",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.16",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Activity Monitoring",
        "whereToCheck": "CloudTrail, CloudWatch",
        "howToCheck": "aws cloudtrail describe-trails",
        "verificationMethod": "Monitoring Review",
        "expectedConfiguration": "Comprehensive activity logging",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.18",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Privileged Utilities",
        "whereToCheck": "Systems Manager, EC2 Instance Connect",
        "howToCheck": "aws ssm describe-instance-information",
        "verificationMethod": "Utility Review",
        "expectedConfiguration": "Privileged access tools secured",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.19",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Software Installation",
        "whereToCheck": "Systems Manager Patch Manager",
        "howToCheck": "aws ssm describe-patch-baselines",
        "verificationMethod": "Software Review",
        "expectedConfiguration": "Patch management and software control",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.20",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Network Security",
        "whereToCheck": "Security Groups, NACLs",
        "howToCheck": "aws ec2 describe-security-groups",
        "verificationMethod": "Network Review",
        "expectedConfiguration": "Network security properly configured",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.21",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Network Services Security",
        "whereToCheck": "VPC, Subnets, Route Tables",
        "howToCheck": "aws ec2 describe-vpcs",
        "verificationMethod": "Service Review",
        "expectedConfiguration": "Network services properly secured",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.22",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Network Segregation",
        "whereToCheck": "VPC, Subnets, Security Groups",
        "howToCheck": "aws ec2 describe-subnets",
        "verificationMethod": "Segregation Review",
        "expectedConfiguration": "Network segmentation implemented",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.23",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Web Filtering",
        "whereToCheck": "WAF, CloudFront",
        "howToCheck": "aws wafv2 list-web-acls",
        "verificationMethod": "Web Filter Review",
        "expectedConfiguration": "Web application firewall active",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.24",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Cryptography",
        "whereToCheck": "KMS, CloudHSM, Encryption",
        "howToCheck": "aws kms list-keys",
        "verificationMethod": "Encryption Review",
        "expectedConfiguration": "Encryption at rest and in transit",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.25",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Secure Development",
        "whereToCheck": "CodeCommit, CodeBuild, CodePipeline",
        "howToCheck": "aws codecommit list-repositories",
        "verificationMethod": "Development Review",
        "expectedConfiguration": "Secure development practices",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.26",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Application Security",
        "whereToCheck": "CodeStar, Security Testing",
        "howToCheck": "Review application security testing",
        "verificationMethod": "App Security Review",
        "expectedConfiguration": "Application security requirements",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.29",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Security Testing",
        "whereToCheck": "Inspector, Penetration Testing",
        "howToCheck": "aws inspector list-assessment-templates",
        "verificationMethod": "Testing Review",
        "expectedConfiguration": "Regular security testing",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.9.1",
        "controlCategory": "AWS Specific",
        "whatToCheck": "S3 Security",
        "whereToCheck": "S3 Console, CLI",
        "howToCheck": "aws s3api list-buckets, get-bucket-encryption",
        "verificationMethod": "S3 Review",
        "expectedConfiguration": "S3 buckets encrypted and properly configured",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.9.2",
        "controlCategory": "AWS Specific",
        "whatToCheck": "EC2 Security",
        "whereToCheck": "EC2 Console, CLI",
        "howToCheck": "aws ec2 describe-instances",
        "verificationMethod": "EC2 Review",
        "expectedConfiguration": "EC2 instances properly secured",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.9.3",
        "controlCategory": "AWS Specific",
        "whatToCheck": "RDS Security",
        "whereToCheck": "RDS Console, CLI",
        "howToCheck": "aws rds describe-db-instances",
        "verificationMethod": "Database Review",
        "expectedConfiguration": "RDS instances encrypted and secured",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.9.4",
        "controlCategory": "AWS Specific",
        "whatToCheck": "Lambda Security",
        "whereToCheck": "Lambda Console, CLI",
        "howToCheck": "aws lambda list-functions",
        "verificationMethod": "Lambda Review",
        "expectedConfiguration": "Lambda functions properly secured",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.9.5",
        "controlCategory": "AWS Specific",
        "whatToCheck": "CloudFormation Security",
        "whereToCheck": "CloudFormation Console",
        "howToCheck": "aws cloudformation list-stacks",
        "verificationMethod": "IaC Review",
        "expectedConfiguration": "Infrastructure as Code security",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.9.6",
        "controlCategory": "AWS Specific",
        "whatToCheck": "ELB Security",
        "whereToCheck": "ELB Console, CLI",
        "howToCheck": "aws elbv2 describe-load-balancers",
        "verificationMethod": "Load Balancer Review",
        "expectedConfiguration": "Load balancers properly configured",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.9.7",
        "controlCategory": "AWS Specific",
        "whatToCheck": "API Gateway Security",
        "whereToCheck": "API Gateway Console",
        "howToCheck": "aws apigateway get-rest-apis",
        "verificationMethod": "API Review",
        "expectedConfiguration": "API Gateway security controls",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.9.8",
        "controlCategory": "AWS Specific",
        "whatToCheck": "CloudWatch Logging",
        "whereToCheck": "CloudWatch Console",
        "howToCheck": "aws logs describe-log-groups",
        "verificationMethod": "Logging Review",
        "expectedConfiguration": "Comprehensive logging enabled",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.9.9",
        "controlCategory": "AWS Specific",
        "whatToCheck": "VPC Flow Logs",
        "whereToCheck": "VPC Console",
        "howToCheck": "aws ec2 describe-flow-logs",
        "verificationMethod": "Flow Log Review",
        "expectedConfiguration": "VPC Flow Logs enabled",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.9.10",
        "controlCategory": "AWS Specific",
        "whatToCheck": "AWS Backup",
        "whereToCheck": "Backup Console",
        "howToCheck": "aws backup list-backup-plans",
        "verificationMethod": "Backup Review",
        "expectedConfiguration": "Regular backups configured",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.9.11",
        "controlCategory": "AWS Specific",
        "whatToCheck": "Secrets Manager",
        "whereToCheck": "Secrets Manager Console",
        "howToCheck": "aws secretsmanager list-secrets",
        "verificationMethod": "Secrets Review",
        "expectedConfiguration": "Secrets properly managed",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.9.12",
        "controlCategory": "AWS Specific",
        "whatToCheck": "Certificate Manager",
        "whereToCheck": "ACM Console",
        "howToCheck": "aws acm list-certificates",
        "verificationMethod": "Certificate Review",
        "expectedConfiguration": "SSL/TLS certificates managed",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.9.13",
        "controlCategory": "AWS Specific",
        "whatToCheck": "Transit Gateway Security",
        "whereToCheck": "Transit Gateway Console",
        "howToCheck": "aws ec2 describe-transit-gateways",
        "verificationMethod": "Network Review",
        "expectedConfiguration": "Transit Gateway properly configured",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.9.14",
        "controlCategory": "AWS Specific",
        "whatToCheck": "Organizations Security",
        "whereToCheck": "Organizations Console",
        "howToCheck": "aws organizations list-accounts",
        "verificationMethod": "Multi-Account Review",
        "expectedConfiguration": "Multi-account security controls",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.9.15",
        "controlCategory": "AWS Specific",
        "whatToCheck": "Control Tower",
        "whereToCheck": "Control Tower Console",
        "howToCheck": "Review Control Tower guardrails",
        "verificationMethod": "Governance Review",
        "expectedConfiguration": "Governance controls implemented",
        "riskLevel": "Medium"
      }
    ],
    "sourceSheet": "AWS checklist"
  },
  {
    "name": "Linux Review",
    "type": "TABLE_CHECKLIST",
    "workpaperType": "TECHNICAL_REVIEW_CHECKLIST",
    "framework": "Auditie Checklist Workbook",
    "areaKey": "linux-review",
    "evidenceRequirement": "Follow source workbook sheet: Linux checklist. Link evidence using the Repository module.",
    "columns": [
      {
        "columnName": "ISO_Control",
        "columnKey": "iSOControl",
        "columnType": "text"
      },
      {
        "columnName": "Control_Category",
        "columnKey": "controlCategory",
        "columnType": "text"
      },
      {
        "columnName": "What_to_Check",
        "columnKey": "whatToCheck",
        "columnType": "text"
      },
      {
        "columnName": "Where_to_Check",
        "columnKey": "whereToCheck",
        "columnType": "text"
      },
      {
        "columnName": "How_to_Check",
        "columnKey": "howToCheck",
        "columnType": "text"
      },
      {
        "columnName": "Verification_Method",
        "columnKey": "verificationMethod",
        "columnType": "text"
      },
      {
        "columnName": "Expected_Configuration",
        "columnKey": "expectedConfiguration",
        "columnType": "text"
      },
      {
        "columnName": "Risk_Level",
        "columnKey": "riskLevel",
        "columnType": "text"
      }
    ],
    "seedRows": [
      {
        "iSOControl": "A.5.1",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Information Security Policy Implementation",
        "whereToCheck": "/etc/security/, /etc/pam.d/",
        "howToCheck": "Review security configuration files",
        "verificationMethod": "File Review",
        "expectedConfiguration": "Security policies configured in system files",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.5.2",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Information Security Roles and Responsibilities",
        "whereToCheck": "/etc/passwd, /etc/group",
        "howToCheck": "cat /etc/passwd | grep -v nologin",
        "verificationMethod": "Account Verification",
        "expectedConfiguration": "Role-based user accounts with appropriate groups",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.5.15",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Access Control Policy",
        "whereToCheck": "/etc/sudoers, /etc/ssh/sshd_config",
        "howToCheck": "sudo -l, cat /etc/sudoers",
        "verificationMethod": "Configuration Check",
        "expectedConfiguration": "Sudo access restricted, SSH properly configured",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.5.16",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Identity Management",
        "whereToCheck": "/etc/passwd, /etc/shadow",
        "howToCheck": "Check user account configurations",
        "verificationMethod": "Account Audit",
        "expectedConfiguration": "Strong user account management",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.5.17",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Authentication Information",
        "whereToCheck": "/etc/pam.d/common-password",
        "howToCheck": "grep password /etc/pam.d/common-password",
        "verificationMethod": "PAM Configuration",
        "expectedConfiguration": "Strong password policy via PAM",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.5.18",
        "controlCategory": "Organizational Controls",
        "whatToCheck": "Access Rights Management",
        "whereToCheck": "File system permissions",
        "howToCheck": "ls -la, getfacl",
        "verificationMethod": "Permission Verification",
        "expectedConfiguration": "Proper file permissions and ACLs",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.1",
        "controlCategory": "Technological Controls",
        "whatToCheck": "User Endpoint Devices",
        "whereToCheck": "System Updates",
        "howToCheck": "yum update --security / apt list --upgradable",
        "verificationMethod": "Update Verification",
        "expectedConfiguration": "Security updates current",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.2",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Privileged Access Rights",
        "whereToCheck": "/etc/passwd, /etc/sudoers",
        "howToCheck": "cat /etc/passwd | grep :0:, sudo -l",
        "verificationMethod": "Privilege Review",
        "expectedConfiguration": "Root access restricted, sudo properly configured",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.3",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Information Access Restriction",
        "whereToCheck": "File Permissions",
        "howToCheck": "find / -perm /go+w -type f",
        "verificationMethod": "Permission Audit",
        "expectedConfiguration": "World-writable files identified and secured",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.4",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Access to Source Code",
        "whereToCheck": "Repository Access",
        "howToCheck": "Review git/svn permissions",
        "verificationMethod": "Repository Audit",
        "expectedConfiguration": "Source code access restricted",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.5",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Secure Authentication",
        "whereToCheck": "SSH/PAM Configuration",
        "howToCheck": "grep -i PasswordAuthentication /etc/ssh/sshd_config",
        "verificationMethod": "Auth Verification",
        "expectedConfiguration": "Key-based authentication, MFA where possible",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.6",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Capacity Management",
        "whereToCheck": "System Monitoring",
        "howToCheck": "top, htop, iostat, df -h",
        "verificationMethod": "Performance Review",
        "expectedConfiguration": "Resource monitoring and alerting configured",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.7",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Protection Against Malware",
        "whereToCheck": "Antivirus Installation",
        "howToCheck": "Check ClamAV or other AV solutions",
        "verificationMethod": "Antivirus Review",
        "expectedConfiguration": "Antivirus installed and definitions current",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.8",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Management of Technical Vulnerabilities",
        "whereToCheck": "Vulnerability Scanning",
        "howToCheck": "Review vulnerability scan results",
        "verificationMethod": "Vulnerability Assessment",
        "expectedConfiguration": "Regular vulnerability scans performed",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.9",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Configuration Management",
        "whereToCheck": "System Configuration",
        "howToCheck": "Review /etc/ configurations, CIS benchmarks",
        "verificationMethod": "Configuration Audit",
        "expectedConfiguration": "Hardened configurations per CIS benchmarks",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.10",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Information Deletion",
        "whereToCheck": "Data Retention",
        "howToCheck": "Review data deletion and retention scripts",
        "verificationMethod": "Retention Review",
        "expectedConfiguration": "Secure deletion procedures implemented",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.11",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Data Masking",
        "whereToCheck": "Database Security",
        "howToCheck": "Check data masking in non-production environments",
        "verificationMethod": "Data Security Review",
        "expectedConfiguration": "Sensitive data masked in test environments",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.12",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Data Leakage Prevention",
        "whereToCheck": "DLP Implementation",
        "howToCheck": "Review DLP tools and monitoring",
        "verificationMethod": "DLP Configuration",
        "expectedConfiguration": "Data loss prevention measures active",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.16",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Monitoring Activities",
        "whereToCheck": "/var/log/, rsyslog",
        "howToCheck": "tail -f /var/log/secure, journalctl",
        "verificationMethod": "Log Monitoring",
        "expectedConfiguration": "Comprehensive system and security logging",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.18",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Use of Privileged Utility Programs",
        "whereToCheck": "System Tools",
        "howToCheck": "which su, sudo, passwd",
        "verificationMethod": "Tool Access Review",
        "expectedConfiguration": "Privileged utilities access controlled",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.19",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Installation of Software",
        "whereToCheck": "Package Management",
        "howToCheck": "rpm -qa / dpkg -l, yum history",
        "verificationMethod": "Software Review",
        "expectedConfiguration": "Software installation tracked and controlled",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.20",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Network Security Management",
        "whereToCheck": "Firewall Configuration",
        "howToCheck": "iptables -L, firewall-cmd --list-all",
        "verificationMethod": "Firewall Review",
        "expectedConfiguration": "Host-based firewall properly configured",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.21",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Security of Network Services",
        "whereToCheck": "Service Configuration",
        "howToCheck": "netstat -tulnp, systemctl list-units",
        "verificationMethod": "Service Review",
        "expectedConfiguration": "Unnecessary services disabled",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.22",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Segregation in Networks",
        "whereToCheck": "Network Configuration",
        "howToCheck": "Review network interfaces and routing",
        "verificationMethod": "Network Review",
        "expectedConfiguration": "Network segmentation implemented",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.23",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Web Filtering",
        "whereToCheck": "Proxy Configuration",
        "howToCheck": "Check proxy/web filtering configuration",
        "verificationMethod": "Web Filter Review",
        "expectedConfiguration": "Web filtering implemented if applicable",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.24",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Use of Cryptography",
        "whereToCheck": "Encryption Status",
        "howToCheck": "lsblk, cryptsetup status",
        "verificationMethod": "Encryption Verification",
        "expectedConfiguration": "Disk encryption enabled (LUKS)",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.25",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Secure System Development Life Cycle",
        "whereToCheck": "Development Practices",
        "howToCheck": "Review secure development practices",
        "verificationMethod": "Development Review",
        "expectedConfiguration": "Security integrated into SDLC",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.26",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Application Security Requirements",
        "whereToCheck": "Application Testing",
        "howToCheck": "Review application security testing",
        "verificationMethod": "Testing Review",
        "expectedConfiguration": "Security testing performed on applications",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.27",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Secure System Architecture",
        "whereToCheck": "Architecture Review",
        "howToCheck": "Review system architecture for security",
        "verificationMethod": "Architecture Review",
        "expectedConfiguration": "Secure architecture principles implemented",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.28",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Secure Coding",
        "whereToCheck": "Code Review",
        "howToCheck": "Review secure coding practices",
        "verificationMethod": "Code Review",
        "expectedConfiguration": "Secure coding standards followed",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.29",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Security Testing",
        "whereToCheck": "Penetration Testing",
        "howToCheck": "Review penetration testing results",
        "verificationMethod": "Testing Results Review",
        "expectedConfiguration": "Regular security testing performed",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.30",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Outsourced Development",
        "whereToCheck": "Vendor Management",
        "howToCheck": "Review third-party development security",
        "verificationMethod": "Vendor Review",
        "expectedConfiguration": "Third-party security requirements enforced",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.31",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Separation of Development and Production",
        "whereToCheck": "Environment Separation",
        "howToCheck": "Check dev/prod environment isolation",
        "verificationMethod": "Environment Review",
        "expectedConfiguration": "Development and production separated",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.32",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Change Management",
        "whereToCheck": "Change Control",
        "howToCheck": "Review change management procedures",
        "verificationMethod": "Change Review",
        "expectedConfiguration": "Formal change management implemented",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.33",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Test Information",
        "whereToCheck": "Test Data Management",
        "howToCheck": "Review test data security",
        "verificationMethod": "Test Data Review",
        "expectedConfiguration": "Test data properly managed",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.34",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Protection of Information Systems",
        "whereToCheck": "System Hardening",
        "howToCheck": "Review CIS benchmark compliance",
        "verificationMethod": "Hardening Verification",
        "expectedConfiguration": "Systems hardened per security baselines",
        "riskLevel": "Critical"
      },
      {
        "iSOControl": "A.8.35",
        "controlCategory": "Technological Controls",
        "whatToCheck": "SELinux/AppArmor Status",
        "whereToCheck": "/etc/selinux/config, aa-status",
        "howToCheck": "getenforce, sestatus, aa-status",
        "verificationMethod": "MAC Verification",
        "expectedConfiguration": "Mandatory Access Control enabled",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.36",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Kernel Security",
        "whereToCheck": "Kernel Parameters",
        "howToCheck": "sysctl -a | grep -E '(randomize|exec-shield)'",
        "verificationMethod": "Kernel Review",
        "expectedConfiguration": "Security kernel parameters enabled",
        "riskLevel": "High"
      },
      {
        "iSOControl": "A.8.37",
        "controlCategory": "Technological Controls",
        "whatToCheck": "USB Device Control",
        "whereToCheck": "USB Configuration",
        "howToCheck": "lsusb, check USB policies",
        "verificationMethod": "USB Control Review",
        "expectedConfiguration": "USB devices controlled or disabled",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.38",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Network Time Protocol",
        "whereToCheck": "NTP Configuration",
        "howToCheck": "ntpq -p, chrony sources",
        "verificationMethod": "Time Sync Verification",
        "expectedConfiguration": "NTP properly configured and synced",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.39",
        "controlCategory": "Technological Controls",
        "whatToCheck": "Log Rotation and Retention",
        "whereToCheck": "Logrotate Configuration",
        "howToCheck": "cat /etc/logrotate.conf",
        "verificationMethod": "Log Management Review",
        "expectedConfiguration": "Log rotation and retention configured",
        "riskLevel": "Medium"
      },
      {
        "iSOControl": "A.8.40",
        "controlCategory": "Technological Controls",
        "whatToCheck": "File Integrity Monitoring",
        "whereToCheck": "AIDE/Tripwire",
        "howToCheck": "aide --check, tripwire --check",
        "verificationMethod": "Integrity Verification",
        "expectedConfiguration": "File integrity monitoring active",
        "riskLevel": "High"
      }
    ],
    "sourceSheet": "Linux checklist"
  },
  {
    "name": "Firewall Review",
    "type": "TABLE_CHECKLIST",
    "workpaperType": "TECHNICAL_REVIEW_CHECKLIST",
    "framework": "Auditie Checklist Workbook",
    "areaKey": "firewall-review",
    "evidenceRequirement": "Follow source workbook sheet: Firewall Checklist. Link evidence using the Repository module.",
    "columns": [
      {
        "columnName": "No.",
        "columnKey": "no",
        "columnType": "text"
      },
      {
        "columnName": "Security Elements",
        "columnKey": "securityElements",
        "columnType": "text"
      }
    ],
    "seedRows": [
      {
        "no": "1",
        "securityElements": "Review the rulesets to ensure that they follow the order as follows:\n anti-spoofing filters (blocked private addresses, internal addresses appearing from the outside)\n User permit rules (e.g. allow HTTP to public webserver)\n Management permit rules (e.g. SNMP traps to network management server)\n Noise drops (e.g. discard OSPF and HSRP chatter)\n Deny and Alert (alert systems administrator about traffic that is suspicious)\n Deny and log (log remaining traffic for analysis)\nFirewalls operate on a first match basis, thus the above structure is important to ensure that suspicious traffic is kept out instead of inadvertently allowing\nthem in by not following the proper order."
      },
      {
        "no": "2",
        "securityElements": "Application based firewall\nEnsure that the administrators monitor any attempts to violate the security policy using the audit logs generated by the application level firewall.\nAlternatively some application level firewalls provide the functionality to log to intrusion detection systems. In such a circumstance ensure that the correct host, which is hosting the IDS, is defined in the application level firewall.\nEnsure that there is a process to update the application level firewall’s vulnerabilities checked to the most current vulnerabilities.\nEnsure that there is a process to update the software with the latest attack signatures.\nIn the event of the signatures being downloaded from the vendors’ site, ensure that it is a trusted site.\nIn the event of the signature being e-mailed to the systems administrator, ensure that digital signatures are used to verify the vendor and that the information transmitted has not been modified en-route.\nThe following commands should be blocked for SMTP at the application level firewall:\n EXPN (expand)\n VRFY (verify)\n DEBUG\n WIZARD\nThe following command should be blocked for FTP:\n PUT\nReview the denied URL’s and ensure that they are appropriate for e.g. any URL’s to hacker sites should be blocked. In some instances organisations may want to block access to x-rated sites or other harmful sites. As such they would subscribe to sites, which maintain listings of such harmful sites. Ensure that the URL’s to deny are updated as released by the sites that warn of harmful sites.\nEnsure that only authorised users are authenticated by the application level\nfirewall."
      },
      {
        "no": "3",
        "securityElements": "Stateful inspection\nReview the state tables to ensure that appropriate rules are set up in terms of source and destination IP’s, source and destination ports and timeouts.\nEnsure that the timeouts are appropriate so as not to give the hacker too much time to launch a successful attack.\nFor URL’s\n If a URL filtering server is used, ensure that it is appropriately defined in the firewall software. If the filtering server is external to the organisation ensure that it is a trusted source.\n If the URL is from a file, ensure that there is adequate protection\nfor this file to ensure no unauthorised modifications.\nEnsure that specific traffic containing scripts; ActiveX and java are striped prior to being allowed into the internal network.\nIf filtering on MAC addresses is allowed, review the filters to ensure that it is\nrestricted to the appropriate MAC’s as defined in the security policy."
      },
      {
        "no": "4",
        "securityElements": "Logging\nEnsure that logging is enabled and that the logs are reviewed to identify any potential patterns that could indicate an attack."
      },
      {
        "no": "5",
        "securityElements": "Patches and updates\nEnsure that the latest patches and updates relating to your firewall product is tested and installed.\nIf patches and updates are automatically downloaded from the vendors’ websites, ensure that the update is received from a trusted site."
      }
    ],
    "sourceSheet": "Firewall Checklist"
  },
  {
    "name": "Policies List Review",
    "type": "TABLE_CHECKLIST",
    "workpaperType": "DOCUMENT_REVIEW_CHECKLIST",
    "framework": "Auditie Checklist Workbook",
    "areaKey": "policies-list-review",
    "evidenceRequirement": "Follow source workbook sheet: policies List. Link evidence using the Repository module.",
    "columns": [
      {
        "columnName": "Sr.no",
        "columnKey": "srNo",
        "columnType": "text"
      },
      {
        "columnName": "Process",
        "columnKey": "process",
        "columnType": "text"
      },
      {
        "columnName": "Policy (Y/N)",
        "columnKey": "policy",
        "columnType": "text"
      },
      {
        "columnName": "Procedures",
        "columnKey": "procedures",
        "columnType": "text"
      },
      {
        "columnName": "File name",
        "columnKey": "fileName",
        "columnType": "text"
      }
    ],
    "seedRows": [
      {
        "srNo": "1",
        "process": "Cyber Incident and Recovery Management Process",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "2",
        "process": "Patch Management",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "3",
        "process": "Password Policy",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "4",
        "process": "BCP and DRP",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "5",
        "process": "Network Security",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "6",
        "process": "Backup and restoration",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "7",
        "process": "Logs monitoring and action",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "8",
        "process": "Data Retention and Disposal",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "9",
        "process": "Privacy of Personal data",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "10",
        "process": "User Access Management",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "11",
        "process": "IT Support",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "12",
        "process": "IT Assessment and Review",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "13",
        "process": "Risk Management",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "14",
        "process": "Software and Hardware hardening",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "15",
        "process": "Vulnerability and Penetration Testing",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "16",
        "process": "IT Asset Management and Classification",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "17",
        "process": "Outsourcing policy",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "18",
        "process": "Social Media",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "19",
        "process": "Work from Home and teleworking Procedures",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "20",
        "process": "Mobile Computing",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "21",
        "process": "Mobile application controls (development and maintenance)",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "22",
        "process": "Change Management Process (project Management)",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "23",
        "process": "Cloud Security",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "24",
        "process": "Human Resource Management (IT)",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "25",
        "process": "Data Leak Prevention Controls",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "26",
        "process": "Source Code Management",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "27",
        "process": "Cryptography Policy",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "28",
        "process": "Release Management Process",
        "policy": "",
        "procedures": "",
        "fileName": ""
      },
      {
        "srNo": "31",
        "process": "Network Access Control",
        "policy": "",
        "procedures": "",
        "fileName": ""
      }
    ],
    "sourceSheet": "policies List"
  }
] satisfies Array<ChecklistTemplateDefinition & { sourceSheet: string }>;
