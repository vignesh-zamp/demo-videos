const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "DEV_003";
const CASE_NAME = "NC-PR-2026-0447 — Bioreactor DO Probe Excursion";

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

const waitForSignal = async (signalId) => {
    console.log(`Waiting for human signal: ${signalId}...`);
    const signalFile = path.join(__dirname, '../interaction-signals.json');
    for (let i = 0; i < 15; i++) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (!content) continue;
                const signals = JSON.parse(content);
                if (signals[signalId]) {
                    delete signals[signalId];
                    const tmp = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                    fs.writeFileSync(tmp, JSON.stringify(signals, null, 4));
                    fs.renameSync(tmp, signalFile);
                }
                break;
            }
        } catch (e) { await delay(Math.floor(Math.random() * 200) + 100); }
    }
    while (true) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (content) {
                    const signals = JSON.parse(content);
                    if (signals[signalId]) {
                        console.log(`Signal ${signalId} received!`);
                        delete signals[signalId];
                        const tmp = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                        fs.writeFileSync(tmp, JSON.stringify(signals, null, 4));
                        fs.renameSync(tmp, signalFile);
                        return true;
                    }
                }
            }
        } catch (e) {}
        await delay(1000);
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);

    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: {
            "NC Number": "NC-PR-2026-0447", "Site": "Puerto Rico (PR)",
            "Equipment": "BR-PR-005", "Product": "Prolia",
            "Batch Day": "14", "Classification": "Minor", "Confidence": "p=0.07 (moderate)"
        }
    });

    const steps = [
        {
            id: "step-1", title_p: "Reading NC initiation form from TrackWise...",
            title_s: "NC-PR-2026-0447 parsed — dissolved oxygen excursion on Bioreactor BR-PR-005",
            reasoning: ["Source: TrackWise QMS, Puerto Rico site", "Event: DO dropped below validated range for 12 minutes on Day 14 of culture", "Equipment: Bioreactor BR-PR-005, 2000L scale", "Recovery: DO recovered post-sparging adjustment"],
            artifacts: [{ id: "nc-form", type: "pdf", label: "NC-PR-2026-0447 Initiation Form", data: "/data/nc_pr_2026_0447_initiation.pdf" }]
        },
        {
            id: "step-2", title_p: "Semantic analysis of event description...",
            title_s: "Failure mode: DO probe drift during high-titer culture phase (Days 12-16)",
            reasoning: ["Free-text: 'DO dropped to 28% vs setpoint 40% for 12 min on Day 14, recovered after manual sparging increase'", "Pattern flag: Day 14 is peak cell density phase — highest oxygen demand", "Probe drift vs controller fault: 12-min duration suggests gradual drift, not sudden failure"]
        },
        {
            id: "step-3", title_p: "Pulling process data from PI/OSIsoft historian...",
            title_s: "48-hour trend shows gradual DO sensor drift starting Day 13, 18:00",
            reasoning: ["PI/OSIsoft query: DO, temperature, pH for BR-PR-005, Day 13-15", "DO trend: Stable at 40% through Day 13 noon, gradual decline to 28% by Day 14 06:00", "Temperature and pH remained within spec — issue isolated to DO measurement/control", "Sparging rate was at maximum auto-range before manual intervention"],
            artifacts: [{ id: "pi-trend", type: "json", label: "PI/OSIsoft DO Trend — BR-PR-005 48hr", data: { equipment: "BR-PR-005", parameter: "Dissolved Oxygen (%)", setpoint: 40, minimum_observed: 28, excursion_duration_min: 12, drift_onset: "Day 13, 18:00", recovery: "Day 14, 06:12 (post-manual sparging)", temperature_stable: true, ph_stable: true } }]
        },
        {
            id: "step-4", title_p: "Querying TrackWise for similar DO NCs across network...",
            title_s: "6 similar DO NCs found across 3 sites in past 4 weeks — all Days 12-16",
            reasoning: ["Semantic search: 6 NCs with >0.78 similarity", "All involve DO excursions during late-culture phase (Days 12-16)", "Sites: PR (2), ATO (3), IRE (1)", "All on 2000L scale bioreactors", "Common thread: All batches running higher-than-average titer"]
        },
        {
            id: "step-5", title_p: "Cross-referencing batch data from SAP and titer from LIMS...",
            title_s: "All 7 batches show >10% above historical titer average — oxygen demand exceeding probe calibration range",
            reasoning: ["SAP batch records + LIMS titer results for all 7 NCs:", "Average titer: 4.8 g/L vs historical average 4.2 g/L (+14%)", "Higher titer = higher cell density = higher oxygen demand", "Current DO probe calibration (SOP-CAL-018) validated for titer up to 4.5 g/L", "7 of 7 batches exceeded this validation range"],
            artifacts: [{ id: "titer-data", type: "json", label: "LIMS Titer Correlation — 7 NC Batches", data: { batches_analyzed: 7, avg_titer: "4.8 g/L", historical_avg: "4.2 g/L", percent_above: "14%", calibration_validated_to: "4.5 g/L", all_exceed_validation: true } }]
        },
        {
            id: "step-6", title_p: "Checking calibration records in SAP PM...",
            title_s: "All probes within spec per SOP-CAL-018 — but calibration protocol outdated for current titer levels",
            reasoning: ["SAP PM: All 7 DO probes calibrated within last 90 days", "All passed per SOP-CAL-018 Rev 4 criteria", "Issue: SOP-CAL-018 was validated when max titer was 4.5 g/L", "Current batches routinely hitting 4.8-5.0 g/L due to media optimization", "Probes are technically 'in spec' but operating beyond validation envelope"]
        },
        {
            id: "step-7", title_p: "Running statistical analysis...",
            title_s: "Statistical confidence moderate (p=0.07) — but pattern matches 2024 precursor to batch failures",
            reasoning: ["Statistical test: p=0.07 (below standard 0.05 threshold)", "However: Historical pattern match found", "In Q3 2024, identical DO drift pattern preceded 2 batch failures at ATO", "Those failures cost $3.2M in lost product", "The 2024 sequence: 5 minor DO NCs → ignored → 2 batch failures in Week 6", "Current sequence: 7 minor DO NCs in 4 weeks — trajectory matches 2024 precursor"]
        },
        {
            id: "step-8", title_p: "Emerging pattern detected — human review required...",
            title_s: "DECISION REQUIRED: Escalate DO probe drift to trend advisory or continue monitoring?",
            reasoning: ["EMERGING PATTERN: DO probe drift on high-titer batches across 3 sites", "Statistical confidence: Moderate (p=0.07)", "Historical match: 87% similarity to 2024 sequence that preceded $3.2M batch failures", "Root cause hypothesis: SOP-CAL-018 calibration range inadequate for current titer levels", "Option A: Escalate — issue trend advisory, recommend SOP-CAL-018 revision", "Option B: Continue monitoring — wait for more data points"],
            artifacts: [{ id: "escalation-choice", type: "json", label: "Escalation Decision Summary", data: { pattern: "DO probe drift on high-titer batches", sites_affected: 3, ncs_in_cluster: 7, confidence: "p=0.07 (moderate)", historical_match: "87% to 2024 $3.2M event", recommendation: "Escalate (historical precedent outweighs moderate p-value)" } }]
        },
        {
            id: "step-9", title_p: "Human approved escalation — generating trend advisory...",
            title_s: "Trend advisory generated — SOP-CAL-018 revision recommended across all sites",
            reasoning: ["Escalation approved by Quality reviewer", "Trend Advisory issued:", "  1. Immediate: Increase DO probe calibration frequency from quarterly to monthly", "  2. Short-term: Revise SOP-CAL-018 validation range to cover titer up to 5.5 g/L", "  3. Long-term: Evaluate next-gen optical DO sensors for high-titer applications", "Change control initiated in TrackWise for SOP-CAL-018 revision"],
            artifacts: [{ id: "sop-rec", type: "pdf", label: "SOP-CAL-018 Revision Recommendation", data: "/data/sop_cal_018_revision_recommendation.pdf" }]
        },
        {
            id: "step-10", title_p: "Finalizing trend advisory...",
            title_s: "Process complete — trend advisory issued, SOP change control initiated",
            reasoning: ["Trend advisory distributed to all 3 affected sites", "SOP-CAL-018 change control opened in TrackWise", "Calibration frequency increase effective immediately", "Follow-up review scheduled in 30 days", "Total time: ~60 seconds analysis + human review vs weeks of manual trending"]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i]; const isFinal = i === steps.length - 1;

        updateProcessLog(PROCESS_ID, { id: step.id, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), title: step.title_p, status: "processing" });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000 + Math.random() * 500);

        if (step.id === "step-8") {
            updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: "warning", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", step.title_s);
            await waitForSignal("APPROVE_ESCALATION");
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Escalation approved — generating trend advisory");
        } else {
            updateProcessLog(PROCESS_ID, { id: step.id, title: step.title_s, status: isFinal ? "completed" : "success", reasoning: step.reasoning || [], artifacts: step.artifacts || [] });
            await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
            await delay(1500);
        }
    }
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
