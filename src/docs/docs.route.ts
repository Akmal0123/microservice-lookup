import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { openApiSpec } from './openapi.js';
import { envConfig } from '../config/env.js';

export default async function docsRoutes(fastify: FastifyInstance) {
  // 1. OpenAPI 3.1 JSON Specification
  fastify.get('/docs/openapi.json', async (request, reply) => {
    return reply.header('content-type', 'application/json; charset=utf-8').send(openApiSpec);
  });

  // 2. Interactive Scalar API Documentation & Testing Console
  fastify.get('/docs', async (request, reply) => {
    const html = `<!doctype html>
<html lang="id">
  <head>
    <title>Fastify Integration Service — API Documentation & Testing</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>">
    <style>
      body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
      .quick-bar {
        background: #111827;
        color: #e5e7eb;
        padding: 8px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        border-bottom: 1px solid #374151;
      }
      .quick-bar a {
        color: #818cf8;
        text-decoration: none;
        font-weight: 500;
        margin-left: 12px;
      }
      .quick-bar a:hover {
        text-decoration: underline;
      }
      .badge {
        background: #312e81;
        color: #c7d2fe;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="quick-bar">
      <div>
        <span class="badge">FASTIFY PORT 5000</span>
        <strong style="margin-left: 8px;">Integration Service API</strong>
      </div>
      <div>
        <a href="/dev/tokens" target="_blank">🔑 Get Test Tokens (JWT A & B)</a>
        <a href="/swagger">Swagger UI View</a>
        <a href="/docs/hub">🌐 Unified API Hub</a>
        <a href="http://localhost:8000/docs" target="_blank">AMS Docs (:8000)</a>
        <a href="http://localhost:9000/docs" target="_blank">EIS Docs (:9000)</a>
      </div>
    </div>
    <script
      id="api-reference"
      data-url="/docs/openapi.json"
      data-configuration='{
        "theme": "purple",
        "darkMode": true,
        "searchHotKey": "k",
        "metaData": {
          "title": "Fastify Integration Service API"
        }
      }'>
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
    return reply.header('content-type', 'text/html; charset=utf-8').send(html);
  });

  // 3. Classic Swagger UI View
  fastify.get('/swagger', async (request, reply) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Fastify Integration Service — Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>">
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .top-nav {
      background: #1e293b;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: sans-serif;
      font-size: 14px;
    }
    .top-nav a { color: #38bdf8; text-decoration: none; margin-left: 15px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="top-nav">
    <div><strong>Fastify Integration Service</strong> &mdash; Swagger UI</div>
    <div>
      <a href="/docs">Back to Scalar Docs</a>
      <a href="/dev/tokens" target="_blank">🔑 Get Test Tokens</a>
      <a href="/docs/hub">🌐 Unified API Hub</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/docs/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
    return reply.header('content-type', 'text/html; charset=utf-8').send(html);
  });

  // 4. Test Token Helper (Generates valid JWT for AMS -> microservice-lookup testing)
  fastify.get('/dev/tokens', async (request, reply) => {
    const now = Math.floor(Date.now() / 1000);
    // JWT (AMS -> microservice-lookup) with full scopes, valid for 24 hours for dev convenience
    const jwtToken = jwt.sign(
      {
        iss: envConfig.jwt.issuer,
        aud: envConfig.jwt.audience,
        sub: 'ams-service',
        user: {
          id: 1,
          name: 'Administrator',
          email: 'admin@tigaserangkai.co.id',
        },
        scope: [
          'lookup:read',
          'integration:purchase-order:read',
          'integration:purchase-request:read',
        ],
        iat: now,
        exp: now + 86400,
      },
      envConfig.jwt.secret,
      { algorithm: 'HS256' }
    );

    return reply.send({
      success: true,
      message: 'Token pengujian berhasil dibuat! Gunakan token JWT ini pada header Authorization: Bearer <token>',
      generated_at: new Date().toISOString(),
      architecture: {
        flow: 'AMS -> microservice-lookup (JWT Auth) -> EIS Database (Sequelize ORM)',
        jwt_b_status: 'NOT REQUIRED (Microservice connects directly to EIS MySQL database via Sequelize ORM)',
      },
      jwt_ams_to_microservice: {
        description: 'Gunakan token ini pada header Authorization untuk memanggil microservice-lookup (Port 5000)',
        token: jwtToken,
        issuer: envConfig.jwt.issuer,
        audience: envConfig.jwt.audience,
        scopes: ['lookup:read', 'integration:purchase-order:read', 'integration:purchase-request:read'],
        expires_in: '24 hours',
        curl_example: `curl -H "Authorization: Bearer ${jwtToken}" http://localhost:5000/api/v1/integration/purchase-orders/PO-2026-0001`,
      },
      jwt_a_ams_to_fastify: {
        token: jwtToken,
        issuer: envConfig.jwt.issuer,
        audience: envConfig.jwt.audience,
      },
    });
  });

  // 5. Unified API Hub Route
  fastify.get('/docs/hub', async (request, reply) => {
    const hubHtml = getHubHtml();
    return reply.header('content-type', 'text/html; charset=utf-8').send(hubHtml);
  });
}

function getHubHtml(): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tiga Serangkai — Unified API Documentation & Testing Hub</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234f46e5'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --accent: #6366f1;
      --accent-hover: #4f46e5;
      --accent-light: #e0e7ff;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      border-bottom: 1px solid var(--card-border);
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      color: white;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }
    .brand-title h1 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(to right, #ffffff, #c7d2fe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-title p {
      font-size: 13px;
      color: var(--text-muted);
    }
    .system-health {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .health-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--card-border);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #64748b;
      display: inline-block;
      transition: all 0.3s ease;
    }
    .status-dot.online { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .status-dot.offline { background: #ef4444; box-shadow: 0 0 8px #ef4444; }

    .nav-tabs {
      display: flex;
      background: #111827;
      padding: 8px 32px 0 32px;
      border-bottom: 1px solid var(--card-border);
      gap: 8px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
    }
    .tab-btn.active {
      color: #ffffff;
      background: var(--card-bg);
      border-top: 3px solid var(--accent);
      border-left: 1px solid var(--card-border);
      border-right: 1px solid var(--card-border);
      border-bottom: 1px solid var(--card-bg);
      margin-bottom: -1px;
    }

    .main-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .tab-pane {
      display: none;
      flex: 1;
      height: calc(100vh - 145px);
    }
    .tab-pane.active {
      display: flex;
      flex-direction: column;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: var(--bg-dark);
    }

    /* Token Generator Panel */
    .token-panel {
      padding: 24px 32px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      overflow-y: auto;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 14px;
    }
    .token-box {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #a5b4fc;
      word-break: break-all;
      max-height: 120px;
      overflow-y: auto;
      margin-bottom: 12px;
    }
    .btn {
      background: var(--accent);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn:hover { background: var(--accent-hover); }
    .btn-secondary {
      background: #334155;
      color: #e2e8f0;
    }
    .btn-secondary:hover { background: #475569; }

    .test-suite-banner {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15));
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 14px;
      padding: 24px;
      margin-top: 10px;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="logo-badge">TS</div>
      <div class="brand-title">
        <h1>Tiga Serangkai API Documentation & Testing Hub</h1>
        <p>Approval Management System (AMS) • Fastify Integration Service • External Inventory System (EIS)</p>
      </div>
    </div>
    <div class="system-health">
      <div class="health-pill" id="ams-health">
        <span class="status-dot" id="ams-dot"></span>
        <span>AMS (:8000)</span>
      </div>
      <div class="health-pill" id="fastify-health">
        <span class="status-dot" id="fastify-dot"></span>
        <span>Fastify (:5000)</span>
      </div>
      <div class="health-pill" id="eis-health">
        <span class="status-dot" id="eis-dot"></span>
        <span>EIS (:9000)</span>
      </div>
      <button class="btn btn-secondary" onclick="checkAllHealth()" style="padding: 6px 12px; font-size: 12px;">🔄 Re-Check</button>
    </div>
  </header>

  <nav class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('hub-panel')">⚡ Quick Test & Tokens</button>
    <button class="tab-btn" onclick="switchTab('fastify-doc')">⚡ Fastify Integration Service (:5000)</button>
    <button class="tab-btn" onclick="switchTab('ams-doc')">📋 Approval Management System (:8000)</button>
    <button class="tab-btn" onclick="switchTab('eis-doc')">📦 External Inventory System (:9000)</button>
  </nav>

  <div class="main-container">
    <!-- Hub Panel -->
    <div id="hub-panel" class="tab-pane active token-panel">
      <div class="grid-2">
        <!-- JWT A Card -->
        <div class="card">
          <div class="card-title">
            <span>🔑 JWT A (AMS ➔ Fastify)</span>
            <span class="badge" style="background:#312e81; color:#c7d2fe; padding:2px 8px; border-radius:6px; font-size:11px;">Port 5000</span>
          </div>
          <div class="card-subtitle">Digunakan untuk otentikasi saat memanggil Fastify Integration Service. Memiliki scope: <code style="color:#818cf8;">integration:purchase-order:read</code> & <code style="color:#818cf8;">integration:purchase-request:read</code>.</div>
          <div class="token-box" id="jwt-a-box">Memuat token...</div>
          <div style="display:flex; gap:10px;">
            <button class="btn" onclick="copyToken('jwt-a-box')">📋 Copy JWT A</button>
            <button class="btn btn-secondary" onclick="generateNewTokens()">🔄 Refresh</button>
          </div>
        </div>

        <!-- JWT B Card -->
        <div class="card">
          <div class="card-title">
            <span>🔐 JWT B (Fastify ➔ EIS)</span>
            <span class="badge" style="background:#065f46; color:#a7f3d0; padding:2px 8px; border-radius:6px; font-size:11px;">Port 9000</span>
          </div>
          <div class="card-subtitle">Digunakan untuk otentikasi internal antara Fastify dan API v1 External Inventory System. Memiliki scope: <code style="color:#34d399;">purchase-order:read</code> & <code style="color:#34d399;">purchase-request:read</code>.</div>
          <div class="token-box" id="jwt-b-box">Memuat token...</div>
          <div style="display:flex; gap:10px;">
            <button class="btn" onclick="copyToken('jwt-b-box')">📋 Copy JWT B</button>
            <button class="btn btn-secondary" onclick="generateNewTokens()">🔄 Refresh</button>
          </div>
        </div>
      </div>

      <!-- Quick Tester -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-title">🚀 Instant Live API Runner</div>
        <div class="card-subtitle">Pilih skenario pengujian di bawah ini untuk melihat hasil live dari backend:</div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;">
          <button class="btn" onclick="runTest('/health', 'Fastify Health Check')">Fastify: Health Check</button>
          <button class="btn" onclick="runAuthTest('/api/v1/integration/purchase-orders/PO-2026-0001', 'Get PO-2026-0001')">Fastify ➔ EIS: Get PO-2026-0001</button>
          <button class="btn" onclick="runAuthTest('/api/v1/integration/purchase-requests/PR-2026-0001', 'Get PR-2026-0001')">Fastify ➔ EIS: Get PR-2026-0001</button>
          <button class="btn" onclick="runAuthTest('/api/v1/integration/lookup?q=2026', 'Unified Lookup')">Fastify: Unified Lookup</button>
        </div>
        <div style="position:relative;">
          <pre id="quick-test-output" style="background:#090d16; border:1px solid #1e293b; border-radius:8px; padding:14px; color:#e2e8f0; font-family:'JetBrains Mono', monospace; font-size:13px; max-height:280px; overflow:auto;">Klik salah satu tombol uji di atas untuk menjalankan request secara langsung...</pre>
        </div>
      </div>

      <!-- Testing Tools Banner -->
      <div class="test-suite-banner">
        <h3 style="font-size:16px; font-weight:700; margin-bottom:8px;">📦 Alat Pengujian Tambahan Tersedia di Repository:</h3>
        <p style="font-size:13px; color:var(--text-muted); line-height:1.6; margin-bottom:14px;">
          Untuk kemudahan testing di lingkungan development Anda, kami telah menyiapkan tools pengujian siap pakai:
        </p>
        <ul style="font-size:13px; color:#cbd5e1; margin-left:20px; line-height:1.8;">
          <li><strong>Postman / Thunder Client:</strong> <code>api-testing/Tiga-Serangkai-APIs.postman_collection.json</code></li>
          <li><strong>VS Code / Cursor REST Client:</strong> <code>api-testing/api-tests.http</code> (Eksekusi 1-klik di editor)</li>
          <li><strong>Automated CLI Test Runner:</strong> Jalankan <code>test-apis.bat</code> atau <code>node api-testing/test-all-apis.mjs</code></li>
        </ul>
      </div>
    </div>

    <!-- Fastify Scalar Doc Frame -->
    <div id="fastify-doc" class="tab-pane">
      <iframe src="/docs" id="fastify-frame"></iframe>
    </div>

    <!-- AMS Doc Frame -->
    <div id="ams-doc" class="tab-pane">
      <iframe src="http://localhost:8000/docs" id="ams-frame"></iframe>
    </div>

    <!-- EIS Doc Frame -->
    <div id="eis-doc" class="tab-pane">
      <iframe src="http://localhost:9000/docs" id="eis-frame"></iframe>
    </div>
  </div>

  <script>
    let currentJwtA = '';
    let currentJwtB = '';

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

      event.currentTarget.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }

    async function checkHealth(url, dotId) {
      const dot = document.getElementById(dotId);
      try {
        const res = await fetch(url, { method: 'GET', mode: 'cors' });
        if (res.ok) {
          dot.className = 'status-dot online';
        } else {
          dot.className = 'status-dot offline';
        }
      } catch (e) {
        dot.className = 'status-dot offline';
      }
    }

    function checkAllHealth() {
      checkHealth('/health', 'fastify-dot');
      checkHealth('http://localhost:8000/api/dokumen', 'ams-dot');
      checkHealth('http://localhost:9000/api/companies', 'eis-dot');
    }

    async function generateNewTokens() {
      try {
        const res = await fetch('/dev/tokens');
        const json = await res.json();
        currentJwtA = json.jwt_a_ams_to_fastify.token;
        currentJwtB = json.jwt_b_fastify_to_eis.token;
        document.getElementById('jwt-a-box').innerText = currentJwtA;
        document.getElementById('jwt-b-box').innerText = currentJwtB;
      } catch (err) {
        document.getElementById('jwt-a-box').innerText = 'Gagal memuat token: ' + err.message;
      }
    }

    function copyToken(boxId) {
      const text = document.getElementById(boxId).innerText;
      navigator.clipboard.writeText(text);
      alert('Token berhasil disalin ke clipboard!');
    }

    async function runTest(endpoint, label) {
      const output = document.getElementById('quick-test-output');
      output.innerText = 'Mengirim request ke ' + endpoint + '...';
      try {
        const start = performance.now();
        const res = await fetch(endpoint);
        const data = await res.json();
        const latency = Math.round(performance.now() - start);
        output.innerText = \`// [\${label}] HTTP \${res.status} OK (\${latency}ms)\n\` + JSON.stringify(data, null, 2);
      } catch (e) {
        output.innerText = 'Error: ' + e.message;
      }
    }

    async function runAuthTest(endpoint, label) {
      const output = document.getElementById('quick-test-output');
      output.innerText = 'Mengirim request ber-otentikasi ke ' + endpoint + '...';
      try {
        if (!currentJwtA) await generateNewTokens();
        const start = performance.now();
        const res = await fetch(endpoint, {
          headers: { 'Authorization': 'Bearer ' + currentJwtA }
        });
        const data = await res.json();
        const latency = Math.round(performance.now() - start);
        output.innerText = \`// [\${label}] HTTP \${res.status} (\${latency}ms)\n\` + JSON.stringify(data, null, 2);
      } catch (e) {
        output.innerText = 'Error: ' + e.message;
      }
    }

    // Init
    generateNewTokens();
    checkAllHealth();
  </script>
</body>
</html>`;
}
