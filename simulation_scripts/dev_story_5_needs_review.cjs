const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "DEV_005";
const CASE_NAME = "NC-OH-2026-0088 — Cleaning Validation Failure";

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
            "NC Number": "NC-OH-2026-0088", "Site": "Ohio (new, opened Feb 2024)",
            "Equipment": "CS-OH-002", "NC Rate": "2.4/batch (40% above benchmark)",
            "Classification": "Major", "Fleet Impact": "3 incoming skids at risk"
        }
    });

    const steps = [
        {
            id: "step-1", title_p: "Reading NC initiation form from TrackWise...",
            title_s: "NC-OH-2026-0088 parsed — cleaning validation failure on chromatography skid CS-OH-002",
            reasoning: ["Source: TrackWise QMS, Ohio site (new facility, opened Feb 2024)", "Event: Cleaning validation failure — residual protein 847 ppm vs 500 ppm acceptance limit", "Equipment: Chromatography skid CS-OH-002", "Product: Lumakras manufacturing train"],
            artifacts: [{ id: "nc-form", type: "pdf", label: "NC-OH-2026-0088 Initiation Form", data: "/data/nc_oh_2026_0088_initiation.pdf" }]
        },
        {
            id: "step-2", title_p: "Semantic analysis of event description...",
            title_s: "Failure mode: Residual protein 69% above limit — suggesting dead-leg in flow path",
            reasoning: ["Free-text: 'Post-cleaning rinse sample from chromatography skid CS-OH-002 showed residual protein at 847 ppm vs acceptance limit of 500 ppm. Swab sample from valve V-204 junction showed highest concentration.'", "Key insight: Highest residual at valve V-204 junction — suggests dead-leg or insufficient flow in that branch", "Residual is 69% above limit — not borderline, significant failure"]
        },
        {
            id: "step-3", title_p: "Querying TrackWise for similar NCs at Ohio...",
            title_s: "12 cleaning/qualification NCs at Ohio in past 3 months — elevated rate for new site",
            reasoning: ["Ohio site NC profile (past 6 months):", "  Total NCs: 67", "  Equipment qualification: 42 (62%)", "  Cleaning validation: 12 (18%)", "  Process deviations: 13 (20%)", "Cleaning NCs concentrated on chromatography skids (CS-series)"]
        },
        {
            id: "step-4", title_p: "Querying TrackWise network-wide for CS-series skid cleaning NCs...",
            title_s: "Limited network matches — CS-series is new to Amgen fleet, Ohio is first deployment",
            reasoning: ["Network search: Minimal matches for CS-series chromatography skids", "Reason: CS-series is a new equipment platform for Amgen", "Ohio is the pilot site for this equipment line", "No cleaning validation baseline exists from other sites", "This is a genuinely novel failure mode for the network"]
        },
        {
            id: "step-5", title_p: "Pulling Ohio full NC profile from TrackWise — benchmarking against SAP production data...",
            title_s: "Ohio NC rate: 2.4/batch vs network average 1.7 — 40% elevated, but within new-site range",
            reasoning: ["SAP production data: Ohio running ~28 batches/month", "NC rate: 67 NCs / 28 batches = 2.4 NCs/batch", "Network average at 24-month maturity: 1.7 NCs/batch", "Ohio is at 6-month maturity — expected range: 2.0-2.5 NCs/batch", "Current rate is elevated but within commissioning-normal range", "However: cleaning validation failures specifically are concerning"],
            artifacts: [{ id: "benchmark", type: "json", label: "Network Benchmark Comparison", data: { ohio_nc_rate: 2.4, network_avg_24mo: 1.7, ohio_maturity_months: 6, expected_range: "2.0-2.5", assessment: "Within commissioning-normal overall, but cleaning failures above expected" } }]
        },
        {
            id: "step-6", title_p: "Pulling validation records from Veeva Vault...",
            title_s: "Veeva Vault gap found — valve dead-leg noted in OQ report but not addressed in cleaning protocol",
            reasoning: ["Veeva Vault documents reviewed:", "  VP-OH-CL-012: Cleaning Validation Protocol for CS-OH-002", "  OQ-OH-CS-002: Operational Qualification Report", "  URS-OH-CS-001: User Requirements Specification", "Gap identified: OQ report Section 4.3.2 notes 'dead-leg at V-204 junction, ~15cm'", "Cleaning protocol VP-OH-CL-012 does not include dead-leg flush procedure", "This gap explains the residual protein concentration at V-204"],
            artifacts: [{ id: "veeva-gap", type: "json", label: "Veeva Vault Validation Gap Analysis", data: { cleaning_protocol: "VP-OH-CL-012", oq_report: "OQ-OH-CS-002", gap: "Dead-leg at V-204 junction (15cm) documented in OQ but not in cleaning protocol", impact: "Residual protein accumulates in dead-leg, not flushed during standard cleaning", fix: "Add dead-leg flush step to cleaning protocol" } }]
        },
        {
            id: "step-7", title_p: "Checking SAP PM for CS-series fleet status...",
            title_s: "3 more CS-series skids on order for Ireland and Puerto Rico — same design, same dead-leg",
            reasoning: ["SAP PM equipment database:", "  CS-OH-002: Installed (Ohio) — affected", "  CS-OH-003: Installed (Ohio) — same design, not yet validated", "  CS-IRE-001: On order (Ireland) — delivery Q3 2026", "  CS-PR-001: On order (Puerto Rico) — delivery Q4 2026", "All 4 units share identical valve manifold design", "The V-204 dead-leg exists on ALL CS-series units", "If not addressed now, Ireland and PR will hit the same cleaning failure"],
            artifacts: [{ id: "fleet", type: "pdf", label: "CS-Series Fleet Impact Assessment", data: "/data/cs_series_fleet_impact.pdf" }]
        },
        {
            id: "step-8", title_p: "Generating Ohio Site Maturity Assessment...",
            title_s: "Site maturity assessment complete — commissioning-normal rate, but dead-leg gap affects fleet",
            reasoning: ["Assessment summary:", "  Overall NC rate: Commissioning-normal (2.4/batch at 6-month maturity)", "  Cleaning validation failures: Above expected — driven by CS-series dead-leg gap", "  Equipment qualification NCs: Expected for new facility", "  Recommendation: Focus corrective action on cleaning protocol, not broad site issues"],
            artifacts: [{ id: "maturity", type: "pdf", label: "Ohio Site Maturity Assessment", data: "/data/ohio_site_maturity_assessment.pdf" }]
        },
        {
            id: "step-9", title_p: "Compiling fleet impact analysis...",
            title_s: "Fleet impact: 3 incoming CS-series skids will inherit dead-leg issue without protocol update",
            reasoning: ["Critical finding: This is not just an Ohio problem", "The CS-series valve manifold design has a 15cm dead-leg at V-204", "This will cause cleaning validation failures at every site receiving CS-series equipment", "Proactive fix: Update cleaning validation protocol BEFORE Ireland and PR installation", "Cost avoidance: Prevent 3-6 months of validation rework at each new site"]
        },
        {
            id: "step-10", title_p: "Finalizing — flagging for leadership review...",
            title_s: "Process complete — flagged for leadership review (fleet-wide impact)",
            reasoning: ["Assessment and fleet impact analysis attached to NC-OH-2026-0088 in TrackWise", "Flagged for leadership review due to fleet-wide equipment impact", "Recommended actions:", "  1. Update VP-OH-CL-012 to include dead-leg flush procedure", "  2. Revalidate CS-OH-002 and CS-OH-003 with updated protocol", "  3. Issue Engineering Change Notice to CS-series cleaning protocol template", "  4. Notify Ireland and PR project teams before skid installation", "Status: Needs Review — awaiting Quality leadership sign-off on fleet impact scope"]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i]; const isFinal = i === steps.length - 1;
        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000 + Math.random() * 500);
        updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
        await updateProcessListStatus(PROCESS_ID, isFinal ? "Needs Review" : "In Progress", step.title_s);
        await delay(1500);
    }
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
