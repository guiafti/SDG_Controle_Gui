const http = require('http');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3001;

function getPrintersList() {
  try {
    const cmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, Default | ConvertTo-Json"`;
    const out = execSync(cmd, { encoding: 'utf-8', timeout: 5000 });
    const parsed = JSON.parse(out);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const printers = list.map(p => p.Name).filter(Boolean);
    const def = list.find(p => p.Default)?.Name || printers[0] || '';
    return { printers, defaultPrinter: def };
  } catch (e) {
    return { printers: [], defaultPrinter: '' };
  }
}

function printViaSpooler(printerName, content) {
  return new Promise((resolve) => {
    const tmpFile = path.join(os.tmpdir(), `sdg_print_${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, content, { encoding: 'latin1' });

    const psScript = path.join(__dirname, 'src', 'main', 'print-raw-windows.ps1');
    const printerParam = printerName ? ` -printerName "${printerName.replace(/"/g, '`"')}"` : '';

    let command = '';
    if (fs.existsSync(psScript)) {
      command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScript}" -filePath "${tmpFile}"${printerParam}`;
    } else {
      command = `notepad /p "${tmpFile}"`;
    }

    exec(command, (err) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      resolve(!err);
    });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, *');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname.toLowerCase();

  if (pathname === '/' || pathname === '/status') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, online: true, port: PORT }));
  }

  if (pathname === '/printers' || pathname === '/list') {
    const data = getPrintersList();
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, printers: data.printers, defaultPrinter: data.defaultPrinter }));
  }

  if (pathname === '/test') {
    const printerName = url.searchParams.get('printer') || '';
    const dateStr = new Date().toLocaleString('pt-BR');
    const testText = 
      "================================\n" +
      "       SDG ROMA - PDV\n" +
      "     TESTE DE IMPRESSAO\n" +
      "================================\n" +
      `IMPRESSORA: ${printerName || 'PADRAO'}\n` +
      `DATA: ${dateStr}\n` +
      "STATUS: COMUNICACAO OK!\n" +
      "================================\n\n\n\n";

    const ok = await printViaSpooler(printerName, testText);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: ok, printer: printerName }));
  }

  if (pathname === '/print' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const json = JSON.parse(body);
        const printer = json.printerName || '';
        const text = json.text || json.rawText || '';
        const ok = await printViaSpooler(printer, text);
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: ok }));
      } catch (e) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Nao encontrado' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SDG PRINTER SERVER] Online na porta ${PORT}`);
});
