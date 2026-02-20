const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "DEV_004";
const CASE_NAME = "NC-ATO-2026-0915 — Temperature Control Drift";

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

const waitForEmail = async () => {
    console.log("Waiting for user to send email...");
    const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
    try { await fetch(`${API_URL}/email-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sent: false }) }); } catch (e) { console.error("Failed to reset email status", e); }
    while (true) {
        try {
            const response = await fetch(`${API_URL}/email-status`);
            if (response.ok) { const { sent } = await response.json(); if (sent) { console.log("Email Sent!"); return true; } }
        } catch (e) {}
        await delay(2000);
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: {
            "NC Number": "NC-ATO-2026-0915", "Site": "Thousand Oaks (ATO)",
            "Equipment": "BR-030-003", "Suite": "Bioreactor Suite 3",
            "Risk Score": "78/100", "Pattern Match": "87% to $12M event"
        }
    });

    const steps = [
        {
            id: "step-1", title_p: "Reading NC initiation form from TrackWise...",
            title_s: "NC-ATO-2026-0915 parsed — temperature drift +0.8°C in Bioreactor Suite 3",
            reasoning: ["Source: TrackWise QMS, Thousand Oaks site", "Event: Temperature control drift +0.8°C above setpoint for 23 minutes", "Equipment: BR-030-003, Bioreactor Suite 3", "Shift: Night Shift B, 02:15-02:38"],
            artifacts: [{ id: "nc-form", type: "pdf", label: "NC-ATO-2026-0915 Initiation Form", data: "/data/nc_ato_2026_0915_initiation.pdf" }]
        },
        {
            id: "step-2", title_p: "Semantic analysis of event description...",
            title_s: "Failure mode: Gradual temperature drift during Night Shift — 3rd incident in Suite 3 in 6 weeks",
            reasoning: ["Free-text: 'Temperature increased from 37.0°C setpoint to 37.8°C over 23 min period, Night Shift B, alarm acknowledged but response delayed'", "Key context: This is the 3rd minor NC in Bioreactor Suite 3 in 6 weeks", "Previous NCs: NC-ATO-2026-0847 (temp +0.5°C) and NC-ATO-2026-0873 (temp +0.6°C)", "Trend: Severity increasing — 0.5°C → 0.6°C → 0.8°C"]
        },
        {
            id: "step-3", title_p: "Updating risk scores for Bioreactor Suite 3...",
            title_s: "Risk score escalated: 62 → 78/100 — approaching critical threshold",
            reasoning: ["Previous risk score: 62/100 (elevated)", "Update factors:", "  +8: Third NC in 6-week window", "  +5: Increasing severity trend (0.5 → 0.6 → 0.8°C)", "  +3: Night shift timing (reduced staffing)", "New risk score: 78/100", "Critical threshold: 75/100 — NOW EXCEEDED", "This triggers automatic escalation recommendation"]
        },
        {
            id: "step-4", title_p: "Pulling sensor data from PI/OSIsoft — 60-day temperature trend...",
            title_s: "PI/OSIsoft shows thermocouple response degradation over 6 weeks",
            reasoning: ["PI/OSIsoft 60-day trend for BR-030-003:", "Week 1-2: Response time 8 sec (normal)", "Week 3-4: Response time 12 sec (borderline)", "Week 5-6: Response time 18 sec (degraded)", "Thermocouple is reading accurately but responding slowly to changes", "Slow response = controller reacts late = overshoot before correction"],
            artifacts: [{ id: "pi-trend", type: "json", label: "PI/OSIsoft 60-Day Temperature Trend — BR-030-003", data: { equipment: "BR-030-003", parameter: "Temperature (°C)", setpoint: 37.0, trend_60day: { weeks_1_2: "8 sec response (normal)", weeks_3_4: "12 sec response (borderline)", weeks_5_6: "18 sec response (degraded)" }, diagnosis: "Thermocouple response degradation" } }]
        },
        {
            id: "step-5", title_p: "Recording browser agent — PI/OSIsoft trend pull...",
            title_s: "Browser agent captured pulling sensor data from PI/OSIsoft historian",
            reasoning: ["Pace navigated PI/OSIsoft ProcessBook", "Pulled 60-day temperature trend for BR-030-003", "Overlaid thermocouple response time analysis"],
            artifacts: [{ id: "browser-4", type: "video", label: "Pace Pulling Data from PI/OSIsoft", data: "/data/dev_004_pi_osisoft_trend_pull.webm" }]
        },
        {
            id: "step-6", title_p: "Pulling maintenance history from SAP PM...",
            title_s: "SAP PM: Thermocouple calibrated 6 weeks ago by contract technician — correlates with drift onset",
            reasoning: ["SAP PM Work Order: WO-ATO-2026-1847", "Date: 6 weeks ago (correlates exactly with drift onset)", "Performed by: Contract technician (not regular maintenance team)", "Calibration result: PASS", "Note: Contract technician used different calibration procedure than standard", "Possible root cause: Improper calibration technique affecting long-term stability"],
            artifacts: [{ id: "sap-pm", type: "json", label: "SAP PM Maintenance Timeline — BR-030-003", data: { work_order: "WO-ATO-2026-1847", date: "6 weeks ago", technician: "Contract (non-standard)", calibration_result: "PASS", procedure_deviation: "Different calibration method used", correlation: "Drift onset matches calibration date" } }]
        },
        {
            id: "step-7", title_p: "Historical pattern matching in TrackWise...",
            title_s: "87% similarity to sequence preceding NC-ATO-2024-0156 — $12M batch loss",
            reasoning: ["TrackWise historical match: NC-ATO-2024-0156", "2024 sequence: 4 minor temp NCs over 8 weeks → ignored → bioreactor batch failure", "Batch loss: $12M (Repatha batch condemned)", "Current sequence matches 87% of the 2024 precursor pattern", "Key similarity: Both involved thermocouple response degradation post-maintenance", "Key difference: Current detection is earlier (3 NCs vs 4 before the 2024 failure)"],
            artifacts: [{ id: "pattern", type: "pdf", label: "Historical Pattern Comparison — 2024 vs 2026", data: "/data/historical_pattern_comparison.pdf" }]
        },
        {
            id: "step-8", title_p: "Drafting escalation email to ATO Site Quality Head...",
            title_s: "REVIEW REQUIRED: Escalation email drafted to Dr. Sarah Chen — risk score critical",
            reasoning: ["Email drafted to: Dr. Sarah Chen (ATO Site Quality Head)", "Subject: URGENT — Bioreactor Suite 3 Risk Score Critical (78/100)", "Key points in email:", "  1. Three temperature NCs in 6 weeks with increasing severity", "  2. 87% pattern match to 2024 $12M batch loss sequence", "  3. Root cause hypothesis: Contract technician calibration 6 weeks ago", "Recommended actions:", "  A. Immediate thermocouple replacement on BR-030-003", "  B. Audit all contract technician calibrations from past 90 days", "  C. Increase Suite 3 monitoring to continuous (24/7 alarm escalation)"],
            artifacts: [{ id: "email-draft", type: "email", label: "Escalation Email — Dr. Sarah Chen", data: { to: "dr.chen@amgen.com", subject: "URGENT: Bioreactor Suite 3 Risk Score Critical (78/100) — Action Required", body: "Dr. Chen,\n\nPace has identified a critical risk pattern in Bioreactor Suite 3 that requires immediate attention.\n\n## Risk Summary\n- **Risk Score**: 78/100 (crossed critical threshold of 75)\n- **Pattern**: 3 temperature NCs in 6 weeks with increasing severity (+0.5°C → +0.6°C → +0.8°C)\n- **Historical Match**: 87% similarity to NC-ATO-2024-0156 sequence that preceded a $12M Repatha batch loss\n\n## Root Cause Hypothesis\nThermocouple response degradation on BR-030-003, onset correlating with contract technician calibration (WO-ATO-2026-1847) 6 weeks ago. PI/OSIsoft data shows response time degraded from 8 sec to 18 sec.\n\n## Recommended Actions\n1. **Immediate**: Replace thermocouple on BR-030-003 before next batch\n2. **This Week**: Audit all contract technician calibrations from past 90 days across Suite 3\n3. **Ongoing**: Escalate Suite 3 to continuous monitoring (24/7 alarm escalation to on-call QA)\n\nFull evidence package attached to NC-ATO-2026-0915 in TrackWise.\n\nBest regards,\nPace — Deviation Trend Intelligence" } }]
        },
        {
            id: "step-9", title_p: "Escalation email sent — documenting in TrackWise...",
            title_s: "Email sent to Dr. Chen — escalation documented, follow-up scheduled 48 hours",
            reasoning: ["Email delivered to dr.chen@amgen.com", "CC: ATO Quality Management, Global Quality Trending", "Escalation logged in TrackWise NC-ATO-2026-0915", "48-hour follow-up reminder set", "Risk score will be recalculated after corrective actions"]
        },
        {
            id: "step-10", title_p: "Finalizing escalation workflow...",
            title_s: "Process complete — critical escalation delivered with full evidence package",
            reasoning: ["Escalation complete:", "  - Email sent to Site Quality Head", "  - Full evidence package (PI/OSIsoft trends, SAP PM history, historical pattern) attached in TrackWise", "  - Risk score documented and trending", "  - Follow-up workflow initiated", "Time saved: This pattern would have taken 4-6 weeks to identify manually", "Cost avoidance: Early detection prevents potential repeat of $12M batch loss"]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i]; const isFinal = i === steps.length - 1;

        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000 + Math.random() * 500);

        if (step.id === "step-8") {
            updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_s, status: "warning", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", "Draft Review: Escalation Email Pending");
            await waitForEmail();
            updateProcessLog(PROCESS_ID, { id: step.id, title: "Escalation email sent to Dr. Sarah Chen", status: "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Escalation email sent");
            await delay(1500);
        } else {
            updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
            await delay(1500);
        }
    }
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
