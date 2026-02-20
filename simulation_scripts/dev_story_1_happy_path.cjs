const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "DEV_001";
const CASE_NAME = "NC-ATO-2026-0892 — Filter Integrity Test Failure";

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateProcessLog = (processId, logEntry, keyDetailsUpdate = {}) => {
    const processFile = path.join(PUBLIC_DATA_DIR, `process_${processId}.json`);
    let data = { logs: [], keyDetails: {}, sidebarArtifacts: [] };
    if (fs.existsSync(processFile)) data = readJson(processFile);
    if (logEntry) {
        const existingIdx = logEntry.id ? data.logs.findIndex(l => l.id === logEntry.id) : -1;
        if (existingIdx !== -1) { data.logs[existingIdx] = { ...data.logs[existingIdx], ...logEntry }; }
        else { data.logs.push(logEntry); }
    }
    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) {
        data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate };
    }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: processId, status, currentStatus })
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try {
            const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
            const idx = processes.findIndex(p => p.id === String(processId));
            if (idx !== -1) { processes[idx].status = status; processes[idx].currentStatus = currentStatus; fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4)); }
        } catch (err) {}
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: {
            "NC Number": "NC-ATO-2026-0892", "Site": "Thousand Oaks (ATO)",
            "Product": "Repatha", "Equipment": "FLT-030-007",
            "Classification": "Minor", "Cluster Size": "10 NCs / 4 sites"
        }
    });

    const steps = [
        {
            id: "step-1", title_p: "Reading NC initiation form from TrackWise...",
            title_s: "NC-ATO-2026-0892 parsed — filter integrity failure on FLT-030-007",
            reasoning: ["Source: TrackWise QMS, NC Initiation Form", "Event: Post-use integrity test failure on 0.22μm sterilizing filter", "Equipment: FLT-030-007, Filling Line 3, Building 30", "Shift: Night Shift A, Operator EMP-3847"],
            artifacts: [{ id: "nc-form", type: "pdf", label: "NC-ATO-2026-0892 Initiation Form", data: "/data/nc_ato_2026_0892_initiation.pdf" }]
        },
        {
            id: "step-2", title_p: "Performing semantic analysis of event description...",
            title_s: "Failure mode extracted — diffusive flow rate 18% above acceptance limit",
            reasoning: ["Free-text analysis: 'Post-use integrity test on 0.22μm Millipore Durapore CVGL filter showed diffusive flow of 14.2 mL/min vs limit of 12.0 mL/min'", "Failure mode: Diffusive flow exceedance", "Filter type: Millipore Durapore CVGL (hydrophilic PVDF)", "Note: TrackWise dropdown classified as 'Equipment Malfunction' — semantic analysis correctly identifies as filtration failure"]
        },
        {
            id: "step-3", title_p: "Querying TrackWise historical database — 18,400 NCs, 24-month window...",
            title_s: "9 semantically similar NCs identified across 4 sites",
            reasoning: ["Search method: Semantic similarity on free-text Event Description (not dropdown category)", "Database: 18,400 NCs across ATO, IRE, PR, OH", "Results: 9 NCs with >0.82 similarity score", "Cross-site matches despite different TrackWise categories:", "  - ATO: 3 NCs filed as 'Equipment Malfunction'", "  - IRE: 2 NCs filed as 'Process Deviation'", "  - PR: 3 NCs filed as 'Filtration Failure'", "  - OH: 1 NC filed as 'Equipment Qualification'"],
            artifacts: [{ id: "cluster", type: "json", label: "Semantic Cluster — 10 Similar NCs", data: { total_ncs_scanned: 18400, matches: 9, similarity_threshold: 0.82, sites_affected: ["ATO", "IRE", "PR", "OH"], category_codes_unified: ["Equipment Malfunction", "Process Deviation", "Filtration Failure", "Equipment Qualification"], date_range: "2025-11 to 2026-02" } }]
        },
        {
            id: "step-4", title_p: "Cross-referencing with 10th NC — total cluster now 10...",
            title_s: "10 NCs confirmed in cluster — 3 different TrackWise dropdown categories unified",
            reasoning: ["Including current NC: 10 total in cluster", "All 10 involve 0.22μm PVDF sterilizing filters", "All 10 occurred during post-use integrity testing", "All 10 post-date November 2025"]
        },
        {
            id: "step-5", title_p: "Pulling equipment and procurement data from SAP PM and SAP MM...",
            title_s: "Root cause signal — 8 of 10 NCs trace to Vendor Z filter lot change in Nov 2025",
            reasoning: ["SAP PM: Equipment maintenance records for all 10 filter housings — all within calibration", "SAP MM: Filter lot numbers cross-referenced against purchase orders", "Finding: 8 of 10 NCs used filters from Vendor Z Lot #VZ-2025-1847", "Vendor Z issued formulation change notification (FCN) in October 2025", "SAP MM PO data: All 10 NCs occurred AFTER Vendor Z FCN effective date"],
            artifacts: [{ id: "vendor-timeline", type: "json", label: "SAP MM — Vendor Z Procurement Timeline", data: { vendor: "Vendor Z (Millipore)", change_type: "Filter membrane formulation change", fcn_date: "2025-10-15", fcn_ref: "FCN-VZ-2025-0892", affected_lots: ["VZ-2025-1847", "VZ-2025-1903"], ncs_pre_change: 0, ncs_post_change: 10, sites_receiving_new_lots: ["ATO", "IRE", "PR", "OH"] } }]
        },
        {
            id: "step-6", title_p: "Checking CAPA records in TrackWise...",
            title_s: "2 existing CAPAs found — 1 partially effective, 1 overdue",
            reasoning: ["CAPA-ATO-2025-0445: 'Increase post-use test sample size' — implemented Dec 2025", "  Status: Partially effective (recurrence reduced 40%, not eliminated)", "CAPA-PR-2025-0892: 'Vendor qualification re-assessment for Vendor Z'", "  Status: OPEN, Due date: 2026-01-15, NOW 33 DAYS OVERDUE", "Neither CAPA addresses the root cause (vendor formulation change)"]
        },
        {
            id: "step-7", title_p: "Recording browser agent activity — TrackWise NC query...",
            title_s: "Browser agent captured querying TrackWise for similar NCs",
            reasoning: ["Pace navigated TrackWise Quality Events module", "Executed semantic search across all sites", "Exported cluster results for investigation package"],
            artifacts: [{ id: "browser-1", type: "video", label: "Pace Querying TrackWise — NC Similarity Search", data: "/data/dev_001_trackwise_nc_query.webm" }]
        },
        {
            id: "step-8", title_p: "Generating Investigation Assist Package...",
            title_s: "Evidence package assembled — batch records, maintenance logs, vendor data, similar NCs",
            reasoning: ["Package contents:", "  1. NC initiation forms for all 10 clustered NCs (from TrackWise)", "  2. Equipment maintenance records for 10 filter housings (from SAP PM)", "  3. Filter lot procurement timeline (from SAP MM)", "  4. Vendor Z FCN document reference (from SAP MM)", "  5. CAPA-ATO-2025-0445 effectiveness data (from TrackWise)", "  6. CAPA-PR-2025-0892 status (OVERDUE) (from TrackWise)", "Estimated time saved: 4-6 days of manual evidence gathering"]
        },
        {
            id: "step-9", title_p: "Generating Cross-Site Trend Alert Report...",
            title_s: "Cross-Site Trend Alert generated — vendor-linked cluster affecting 4 sites",
            reasoning: ["Report highlights:", "  - 10 NCs across 4 sites linked to single vendor formulation change", "  - Root cause: Vendor Z FCN-VZ-2025-0892 (membrane formulation)", "  - Existing CAPAs insufficient — neither addresses vendor root cause", "  - CAPA-PR-2025-0892 is 33 days overdue", "  - Recommended actions: Vendor Z qualification hold, alternative supplier qualification"],
            artifacts: [{ id: "trend-alert", type: "pdf", label: "Cross-Site Trend Alert — Filter Integrity Cluster", data: "/data/cross_site_trend_alert_filter.pdf" }]
        },
        {
            id: "step-10", title_p: "Finalizing and attaching to TrackWise...",
            title_s: "Process complete — trend alert delivered, investigation assist package attached",
            reasoning: ["Cross-Site Trend Alert attached to NC-ATO-2026-0892 in TrackWise", "Investigation Assist Package linked to all 10 NCs in cluster", "Notification sent to Global Quality Trending team", "Overdue CAPA-PR-2025-0892 flagged for immediate follow-up", "Total processing time: ~45 seconds vs estimated 4-6 days manual"]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = i === steps.length - 1;
        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000 + Math.random() * 500);
        updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
        await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
        await delay(1500);
    }
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
