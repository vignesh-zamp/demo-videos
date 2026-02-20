const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "DEV_002";
const CASE_NAME = "NC-IRE-2026-1103 — EM Excursion Grade B Area";

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
    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate };
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: processId, status, currentStatus }) });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try { const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8')); const idx = processes.findIndex(p => p.id === String(processId)); if (idx !== -1) { processes[idx].status = status; processes[idx].currentStatus = currentStatus; fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4)); } } catch (err) {}
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: {
            "NC Number": "NC-IRE-2026-1103", "Site": "Ireland (IRE)",
            "Area": "Grade B, Room 204", "Organism": "Micrococcus luteus",
            "Classification": "Major", "Proven Fix Available": "Yes (ATO CAPA-0445)"
        }
    });

    const steps = [
        {
            id: "step-1", title_p: "Reading NC initiation form from TrackWise...",
            title_s: "NC-IRE-2026-1103 parsed — viable air excursion in Grade B cleanroom",
            reasoning: ["Source: TrackWise QMS, Ireland site", "Event: Viable air sample excursion, Grade B area Room 204", "Organism identified: Micrococcus luteus, 12 CFU vs limit of 10 CFU", "Monitoring point: VA-204-03 (adjacent to gowning airlock)"],
            artifacts: [{ id: "nc-form", type: "pdf", label: "NC-IRE-2026-1103 Initiation Form", data: "/data/nc_ire_2026_1103_initiation.pdf" }]
        },
        {
            id: "step-2", title_p: "Semantic analysis of event description...",
            title_s: "Failure mode: Micrococcus luteus viable air excursion near gowning transition",
            reasoning: ["Free-text: 'Routine EM monitoring detected Micrococcus luteus at 12 CFU on viable air sample VA-204-03, Grade B corridor adjacent to gowning Room 203 airlock'", "Key semantic tags: EM excursion, Micrococcus, gowning proximity, Grade B", "Note: Micrococcus is skin-associated flora — suggests gowning procedure gap"]
        },
        {
            id: "step-3", title_p: "Pulling EM trending data from LIMS — Ireland Room 204...",
            title_s: "LIMS data confirms 12-month upward drift at monitoring point VA-204-03",
            reasoning: ["LIMS query: 12-month viable air trend for Room 204, all monitoring points", "VA-204-03 trend: 3 CFU avg (Q1 2025) → 5 CFU (Q2) → 7 CFU (Q3) → 10-12 CFU (Q4/Q1 2026)", "Alert limit (8 CFU) breached 4 times in last 3 months", "Action limit (10 CFU) breached twice — including this NC", "Other Room 204 points stable — issue localized to VA-204-03 (near airlock)"]
        },
        {
            id: "step-4", title_p: "Querying TrackWise for similar EM NCs across network...",
            title_s: "14 similar EM NCs found at ATO from 2024-2025 — same organism, same area type",
            reasoning: ["Semantic search across 18,400 NCs", "14 matches at Thousand Oaks (ATO): Micrococcus excursions in Grade B areas near gowning", "Pattern: ATO experienced identical drift pattern in 2024", "ATO resolved via CAPA-ATO-2025-0445 (revised gowning protocol)", "No similar NCs at PR or OH"]
        },
        {
            id: "step-5", title_p: "Pulling CAPA-ATO-2025-0445 from TrackWise — checking effectiveness...",
            title_s: "CAPA proven effective — 83% reduction in Micrococcus counts at ATO (p=0.001)",
            reasoning: ["CAPA-ATO-2025-0445: 'Revised gowning protocol — added secondary glove change at B/C transition'", "Implemented: July 2025 at ATO", "Effectiveness data from LIMS: ATO Micrococcus counts dropped 83% post-CAPA", "Statistical significance: p=0.001 (highly significant)", "No recurrence at ATO in 6 months since implementation"],
            artifacts: [{ id: "capa-eff", type: "pdf", label: "CAPA-ATO-2025-0445 Effectiveness Report", data: "/data/capa_ato_2025_0445_effectiveness.pdf" }]
        },
        {
            id: "step-6", title_p: "Comparing gowning SOPs — Ireland vs ATO via Veeva Vault...",
            title_s: "Ireland SOP 2 revisions behind ATO — missing secondary glove change step",
            reasoning: ["Veeva Vault comparison:", "  ATO: SOP-ATO-GWN-014 Rev 5 (updated July 2025 per CAPA-0445)", "  Ireland: SOP-IRE-GWN-014 Rev 3 (last updated March 2024)", "Key difference: ATO Rev 5 includes 'secondary glove change at Grade B/C transition'", "Ireland Rev 3 does not include this step", "This is the exact procedure change that eliminated Micrococcus at ATO"],
            artifacts: [{ id: "sop-compare", type: "json", label: "SOP Comparison — IRE Rev 3 vs ATO Rev 5", data: { ato_sop: "SOP-ATO-GWN-014 Rev 5", ire_sop: "SOP-IRE-GWN-014 Rev 3", revision_gap: 2, key_difference: "Secondary glove change at Grade B/C transition", ato_updated: "2025-07-15", ire_updated: "2024-03-22" } }]
        },
        {
            id: "step-7", title_p: "Recording browser agent — Veeva Vault SOP comparison...",
            title_s: "Browser agent captured comparing SOP versions in Veeva Vault",
            reasoning: ["Pace navigated Veeva Vault Document Library", "Opened SOP-IRE-GWN-014 Rev 3 and SOP-ATO-GWN-014 Rev 5 side-by-side", "Highlighted the missing secondary glove change step"],
            artifacts: [{ id: "browser-2", type: "video", label: "Pace Comparing SOPs in Veeva Vault", data: "/data/dev_002_veeva_vault_sop_compare.webm" }]
        },
        {
            id: "step-8", title_p: "Checking ComplianceWire training records for Ireland gowning...",
            title_s: "Ireland gowning training last completed March 2024 — 11 months ago",
            reasoning: ["ComplianceWire query: Ireland site, gowning qualification", "Last training cycle: March 2024 (annual requirement)", "Next due: March 2025 — NOW OVERDUE by 11 months", "Training curriculum does not include secondary glove change (matches old SOP Rev 3)", "ATO operators retrained July 2025 on updated protocol"]
        },
        {
            id: "step-9", title_p: "Generating CAPA Propagation Recommendation...",
            title_s: "CAPA propagation recommended — adopt ATO gowning protocol at Ireland",
            reasoning: ["Recommendation: Propagate CAPA-ATO-2025-0445 to Ireland", "Evidence strength: Proven 83% reduction at ATO, statistically significant", "Actions required:", "  1. Update SOP-IRE-GWN-014 from Rev 3 to Rev 5 (add secondary glove change)", "  2. Retrain Ireland gowning staff via ComplianceWire", "  3. Increase EM monitoring frequency at VA-204-03 for 90-day verification", "Estimated implementation: 2-3 weeks (vs months if discovered manually)"],
            artifacts: [{ id: "propagation", type: "pdf", label: "CAPA Propagation Recommendation — Ireland Gowning", data: "/data/capa_propagation_recommendation.pdf" }]
        },
        {
            id: "step-10", title_p: "Finalizing and delivering recommendation...",
            title_s: "Process complete — CAPA propagation recommendation delivered to Ireland QA",
            reasoning: ["Propagation recommendation attached to NC-IRE-2026-1103 in TrackWise", "Cross-reference linked to CAPA-ATO-2025-0445", "Notification sent to Ireland Site Quality Head and Global CAPA Review Board", "SOP change control initiated in Veeva Vault", "Training requirement flagged in ComplianceWire", "Time saved: Estimated 3-4 weeks of manual cross-site investigation"]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i]; const isFinal = i === steps.length - 1;
        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000 + Math.random() * 500);
        updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
        await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
        await delay(1500);
    }
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
