try { require('dotenv').config(); } catch(e) {}
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const KB_PATH = path.join(__dirname, 'src/data/knowledgeBase.md');
const FEEDBACK_QUEUE_PATH = path.join(__dirname, 'feedbackQueue.json');
const KB_VERSIONS_PATH = path.join(DATA_DIR, 'kbVersions.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');

let state = { sent: false, confirmed: false, signals: {} };
const runningProcesses = new Map();

// Startup initialization
const PROCESSES_FILE = path.join(DATA_DIR, 'processes.json');
const BASE_FILE = path.join(DATA_DIR, 'base_processes.json');
if (!fs.existsSync(PROCESSES_FILE) && fs.existsSync(BASE_FILE)) {
    fs.copyFileSync(BASE_FILE, PROCESSES_FILE);
}
const signalFile = path.join(__dirname, 'interaction-signals.json');
if (!fs.existsSync(signalFile)) {
    fs.writeFileSync(signalFile, JSON.stringify({ APPROVE_ESCALATION: false }, null, 4));
}
if (!fs.existsSync(FEEDBACK_QUEUE_PATH)) fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
if (!fs.existsSync(KB_VERSIONS_PATH)) fs.writeFileSync(KB_VERSIONS_PATH, '[]');
if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

const MIME_TYPES = {
    '.html': 'text/html', '.js': 'application/javascript', '.jsx': 'application/javascript',
    '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf',
    '.webm': 'video/webm', '.mp4': 'video/mp4', '.md': 'text/markdown',
    '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2'
};

const parseBody = (req) => new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
});

async function callGemini(messages, systemPrompt) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.VITE_MODEL || 'gemini-2.5-flash' });
    
    const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));
    
    const result = await model.generateContent({
        contents,
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined
    });
    return result.response.text();
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const cleanPath = url.pathname;

    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        return res.end();
    }

    // === RESET ===
    if (cleanPath === '/reset') {
        state = { sent: false, confirmed: false, signals: {} };
        console.log('Demo Reset Triggered');

        fs.writeFileSync(signalFile, JSON.stringify({ APPROVE_ESCALATION: false }, null, 4));

        runningProcesses.forEach((proc, id) => {
            try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) {}
        });
        runningProcesses.clear();

        exec('pkill -9 -f "node(.*)simulation_scripts" || true', (err) => {
            setTimeout(() => {
                const cases = [
                    {
                        id: "DEV_001", name: "NC-ATO-2026-0892 \u2014 Filter Integrity Test Failure",
                        category: "Deviation Trend Intelligence", stockId: "NC-ATO-2026-0892",
                        year: new Date().toISOString().split('T')[0], status: "In Progress",
                        currentStatus: "Initializing...", fileName: "TrackWise NC Initiation Form",
                        site: "Thousand Oaks (ATO)", product: "Repatha", classification: "Minor"
                    },
                    {
                        id: "DEV_002", name: "NC-IRE-2026-1103 \u2014 EM Excursion Grade B Area",
                        category: "Deviation Trend Intelligence", stockId: "NC-IRE-2026-1103",
                        year: new Date().toISOString().split('T')[0], status: "In Progress",
                        currentStatus: "Initializing...", fileName: "TrackWise NC Initiation Form",
                        site: "Ireland (IRE)", product: "Enbrel", classification: "Major"
                    },
                    {
                        id: "DEV_003", name: "NC-PR-2026-0447 \u2014 Bioreactor DO Probe Excursion",
                        category: "Deviation Trend Intelligence", stockId: "NC-PR-2026-0447",
                        year: new Date().toISOString().split('T')[0], status: "In Progress",
                        currentStatus: "Initializing...", fileName: "TrackWise NC Initiation Form",
                        site: "Puerto Rico (PR)", product: "Prolia", classification: "Minor"
                    },
                    {
                        id: "DEV_004", name: "NC-ATO-2026-0915 \u2014 Temperature Control Drift",
                        category: "Deviation Trend Intelligence", stockId: "NC-ATO-2026-0915",
                        year: new Date().toISOString().split('T')[0], status: "In Progress",
                        currentStatus: "Initializing...", fileName: "TrackWise NC Initiation Form",
                        site: "Thousand Oaks (ATO)", product: "Aimovig", classification: "Minor"
                    },
                    {
                        id: "DEV_005", name: "NC-OH-2026-0088 \u2014 Cleaning Validation Failure",
                        category: "Deviation Trend Intelligence", stockId: "NC-OH-2026-0088",
                        year: new Date().toISOString().split('T')[0], status: "In Progress",
                        currentStatus: "Initializing...", fileName: "TrackWise NC Initiation Form",
                        site: "Ohio (OH)", product: "Lumakras", classification: "Major"
                    }
                ];
                fs.writeFileSync(PROCESSES_FILE, JSON.stringify(cases, null, 4));

                // Reset process logs
                cases.forEach(c => {
                    fs.writeFileSync(path.join(DATA_DIR, `process_${c.id}.json`),
                        JSON.stringify({ logs: [], keyDetails: {}, sidebarArtifacts: [] }, null, 4));
                });

                // Reset feedback queue and KB versions
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
                fs.writeFileSync(KB_VERSIONS_PATH, '[]');

                const scripts = [
                    { file: 'dev_story_1_happy_path.cjs', id: 'DEV_001' },
                    { file: 'dev_story_2_happy_path.cjs', id: 'DEV_002' },
                    { file: 'dev_story_3_needs_attention.cjs', id: 'DEV_003' },
                    { file: 'dev_story_4_needs_attention.cjs', id: 'DEV_004' },
                    { file: 'dev_story_5_needs_review.cjs', id: 'DEV_005' }
                ];

                let totalDelay = 0;
                scripts.forEach((script) => {
                    setTimeout(() => {
                        const scriptPath = path.join(__dirname, 'simulation_scripts', script.file);
                        const child = exec(
                            `node "${scriptPath}" > "${scriptPath}.log" 2>&1`,
                            (error) => {
                                if (error && error.code !== 0) console.error(`${script.file} error:`, error.message);
                                runningProcesses.delete(script.id);
                            }
                        );
                        runningProcesses.set(script.id, child);
                    }, totalDelay * 1000);
                    totalDelay += 2;
                });
            }, 1000);
        });

        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // === EMAIL STATUS ===
    if (cleanPath === '/email-status') {
        if (req.method === 'GET') {
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ sent: state.sent }));
        }
        if (req.method === 'POST') {
            const parsed = await parseBody(req);
            state.sent = parsed.sent || false;
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok' }));
        }
    }

    // === SIGNAL ===
    if (cleanPath === '/signal' && req.method === 'POST') {
        const parsed = await parseBody(req);
        const sf = path.join(__dirname, 'interaction-signals.json');
        let signals = {};
        try { signals = JSON.parse(fs.readFileSync(sf, 'utf8')); } catch {}
        signals[parsed.signalId] = true;
        const tmp = sf + '.' + Math.random().toString(36).substring(7) + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(signals, null, 4));
        fs.renameSync(tmp, sf);
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    if (cleanPath === '/signal-status' && req.method === 'GET') {
        const sf = path.join(__dirname, 'interaction-signals.json');
        let signals = {};
        try { signals = JSON.parse(fs.readFileSync(sf, 'utf8')); } catch {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(signals));
    }

    // === UPDATE STATUS (from simulation scripts) ===
    if (cleanPath === '/api/update-status' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
            const idx = processes.findIndex(p => p.id === String(parsed.id));
            if (idx !== -1) {
                processes[idx].status = parsed.status;
                processes[idx].currentStatus = parsed.currentStatus;
                fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4));
            }
        } catch (err) { console.error('Update status error:', err); }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // === CHAT (dual contract: KB chat + Work-with-Pace) ===
    if (cleanPath === '/api/chat' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            let messages, systemPrompt;
            if (parsed.messages && parsed.systemPrompt) {
                messages = parsed.messages;
                systemPrompt = parsed.systemPrompt;
            } else {
                const kbContent = parsed.knowledgeBase || '';
                systemPrompt = `You are Pace, an AI assistant for Amgen's Deviation Trend Intelligence system. Answer questions based on this knowledge base:\n\n${kbContent}\n\nBe helpful, specific, and reference the knowledge base content when relevant.`;
                messages = [];
                if (parsed.history) {
                    parsed.history.forEach(h => messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));
                }
                messages.push({ role: 'user', content: parsed.message });
            }
            const response = await callGemini(messages, systemPrompt);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ response }));
        } catch (err) {
            console.error('Chat error:', err);
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // === FEEDBACK QUESTIONS ===
    if (cleanPath === '/api/feedback/questions' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            const systemPrompt = `You are an AI assistant helping improve a knowledge base. Given user feedback and current KB content, generate exactly 3 clarifying questions to better understand what changes are needed. Return as JSON array of strings.`;
            const messages = [{ role: 'user', content: `Feedback: ${parsed.feedback}\n\nCurrent KB:\n${parsed.knowledgeBase}\n\nGenerate 3 clarifying questions as a JSON array.` }];
            const response = await callGemini(messages, systemPrompt);
            const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const questions = JSON.parse(cleaned);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ questions }));
        } catch (err) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // === FEEDBACK SUMMARIZE ===
    if (cleanPath === '/api/feedback/summarize' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            const systemPrompt = `You are an AI assistant. Summarize the user's feedback and their answers to clarifying questions into a clear, actionable proposal for updating the knowledge base. Be specific about what should change.`;
            const qaPairs = (parsed.questions || []).map((q, i) => `Q: ${q}\nA: ${(parsed.answers || [])[i] || 'No answer'}`).join('\n');
            const messages = [{ role: 'user', content: `Original feedback: ${parsed.feedback}\n\nClarifying Q&A:\n${qaPairs}\n\nCurrent KB:\n${parsed.knowledgeBase}\n\nSummarize into a specific proposal.` }];
            const response = await callGemini(messages, systemPrompt);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ summary: response }));
        } catch (err) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // === FEEDBACK QUEUE ===
    if (cleanPath === '/api/feedback/queue') {
        if (req.method === 'GET') {
            let queue = [];
            try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch {}
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ queue }));
        }
        if (req.method === 'POST') {
            const parsed = await parseBody(req);
            let queue = [];
            try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch {}
            queue.push({ ...parsed, status: 'pending', timestamp: new Date().toISOString() });
            fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok' }));
        }
    }

    // === DELETE FEEDBACK ITEM ===
    if (cleanPath.startsWith('/api/feedback/queue/') && req.method === 'DELETE') {
        const feedbackId = cleanPath.split('/').pop();
        let queue = [];
        try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch {}
        queue = queue.filter(item => item.id !== feedbackId);
        fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // === APPLY FEEDBACK ===
    if (cleanPath === '/api/feedback/apply' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            let queue = [];
            try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch {}
            const item = queue.find(i => i.id === parsed.feedbackId);
            if (!item) throw new Error('Feedback item not found');

            const currentKB = fs.readFileSync(KB_PATH, 'utf8');
            const systemPrompt = `You are a knowledge base editor. Apply the requested change to the knowledge base content. Return ONLY the updated knowledge base content, nothing else.`;
            const messages = [{ role: 'user', content: `Change request: ${item.summary}\n\nCurrent KB:\n${currentKB}\n\nApply the change and return the full updated KB.` }];
            const updatedKB = await callGemini(messages, systemPrompt);

            // Save snapshots
            const timestamp = new Date().toISOString();
            const prevFile = `kb_before_${Date.now()}.md`;
            const snapFile = `kb_after_${Date.now()}.md`;
            fs.writeFileSync(path.join(SNAPSHOTS_DIR, prevFile), currentKB);
            fs.writeFileSync(path.join(SNAPSHOTS_DIR, snapFile), updatedKB);
            fs.writeFileSync(KB_PATH, updatedKB);

            // Update versions
            let versions = [];
            try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch {}
            versions.push({ id: `v${versions.length + 1}`, timestamp, snapshotFile: snapFile, previousFile: prevFile, changes: [item.summary] });
            fs.writeFileSync(KB_VERSIONS_PATH, JSON.stringify(versions, null, 4));

            // Update queue item status
            queue = queue.map(i => i.id === parsed.feedbackId ? { ...i, status: 'applied' } : i);
            fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 4));

            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, content: updatedKB }));
        } catch (err) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // === KB CONTENT ===
    if (cleanPath === '/api/kb/content' && req.method === 'GET') {
        const versionId = url.searchParams.get('versionId');
        try {
            let content;
            if (versionId) {
                let versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8'));
                const version = versions.find(v => v.id === versionId);
                if (version) {
                    content = fs.readFileSync(path.join(SNAPSHOTS_DIR, version.snapshotFile), 'utf8');
                } else {
                    content = fs.readFileSync(KB_PATH, 'utf8');
                }
            } else {
                content = fs.readFileSync(KB_PATH, 'utf8');
            }
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ content }));
        } catch (err) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // === KB VERSIONS ===
    if (cleanPath === '/api/kb/versions' && req.method === 'GET') {
        let versions = [];
        try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch {}
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ versions }));
    }

    // === KB SNAPSHOT ===
    if (cleanPath.startsWith('/api/kb/snapshot/') && req.method === 'GET') {
        const filename = cleanPath.split('/').pop();
        const filePath = path.join(SNAPSHOTS_DIR, filename);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/markdown' });
            return res.end(content);
        }
        res.writeHead(404, corsHeaders);
        return res.end('Not found');
    }

    // === KB UPDATE ===
    if (cleanPath === '/api/kb/update' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            fs.writeFileSync(KB_PATH, parsed.content);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok' }));
        } catch (err) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // === DEBUG PATHS ===
    if (cleanPath === '/debug-paths' && req.method === 'GET') {
        const dataFiles = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : [];
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ DATA_DIR, files: dataFiles, cwd: process.cwd() }));
    }

    // === STATIC FILE SERVING ===
    let filePath = path.join(PUBLIC_DIR, cleanPath === '/' ? 'index.html' : cleanPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { ...corsHeaders, 'Content-Type': mime });
        return res.end(content);
    }

    res.writeHead(404, corsHeaders);
    res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Deviation Trend Intelligence server running on port ${PORT}`);
});
