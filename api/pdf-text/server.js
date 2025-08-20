// Minimal Node server to expose pdftotext via HTTP inside a Docker-based Vercel Function
// Endpoints:
// - GET /health -> { ok: true }
// - POST /extract (Content-Type: application/pdf) -> { text }

const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const PORT = process.env.PORT || 3000;

async function handleExtract(req, res, bodyBuffer) {
  try {
    if (!Buffer.isBuffer(bodyBuffer) || bodyBuffer.length < 8) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Body must be a PDF binary payload' }));
    }
    const header = bodyBuffer.slice(0, 8).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: `Invalid PDF header: ${header}` }));
    }

    const tmpDir = path.join(os.tmpdir(), 'pdf-text-extraction');
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpPdf = path.join(tmpDir, `in-${Date.now()}.pdf`);
    const tmpTxt = path.join(tmpDir, `out-${Date.now()}.txt`);

    await fs.writeFile(tmpPdf, bodyBuffer);

    const commands = [
      `pdftotext -enc UTF-8 -layout "${tmpPdf}" "${tmpTxt}"`,
      `pdftotext -layout "${tmpPdf}" "${tmpTxt}"`,
      `pdftotext -raw "${tmpPdf}" "${tmpTxt}"`,
      `pdftotext "${tmpPdf}" "${tmpTxt}"`
    ];

    let text = '';
    for (const cmd of commands) {
      try {
        await execAsync(cmd, { timeout: 15000 });
        text = await fs.readFile(tmpTxt, 'utf8');
        if (text && text.trim().length > 20) break;
      } catch (e) {
        // try next
      }
    }

    // cleanup best-effort
    try { await fs.rm(tmpPdf, { force: true }); } catch {}
    try { await fs.rm(tmpTxt, { force: true }); } catch {}

    if (!text || text.trim().length === 0) {
      res.writeHead(422, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No text extracted' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ text: text.trim() }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: err?.message || 'Unknown error' }));
  }
}

const server = http.createServer(async (req, res) => {
  const { method, url, headers } = req;

  if (method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  if (method === 'POST' && url === '/extract') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      const body = Buffer.concat(chunks);
      await handleExtract(req, res, body);
    });
    req.on('error', (e) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`pdf-text function listening on ${PORT}`);
});
