using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.Threading;
using System.Collections.Generic;
using System.Drawing.Printing;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace SdgRomaLauncher {

    // =========================================================================
    // 🖨️ RawPrinterHelper: Win32 Spooler API (winspool.drv) para ESC/POS direto
    // =========================================================================
    public static class RawPrinterHelper {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public class DOCINFOA {
            [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
            [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
            [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
        }

        [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

        [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

        [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

        public static string ResolveInstalledPrinter(string requestedName) {
            if (string.IsNullOrEmpty(requestedName)) {
                try {
                    return new PrinterSettings().PrinterName ?? "";
                } catch {
                    return "";
                }
            }

            foreach (string p in PrinterSettings.InstalledPrinters) {
                if (string.Equals(p, requestedName, StringComparison.OrdinalIgnoreCase)) {
                    return p;
                }
            }

            string reqLower = requestedName.Trim().ToLowerInvariant();
            foreach (string p in PrinterSettings.InstalledPrinters) {
                if (p.ToLowerInvariant().Contains(reqLower) || reqLower.Contains(p.ToLowerInvariant())) {
                    return p;
                }
            }

            return requestedName;
        }

        public static bool SendBytes(string szPrinterName, byte[] bytes) {
            if (string.IsNullOrEmpty(szPrinterName) || bytes == null || bytes.Length == 0) return false;

            string realPrinter = ResolveInstalledPrinter(szPrinterName);
            IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
            Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

            IntPtr hPrinter = IntPtr.Zero;
            DOCINFOA di = new DOCINFOA();
            di.pDocName = "SDG_Roma_Cupom";
            di.pDataType = "RAW";
            bool bSuccess = false;

            try {
                if (OpenPrinter(realPrinter.Normalize(), out hPrinter, IntPtr.Zero)) {
                    if (StartDocPrinter(hPrinter, 1, di)) {
                        if (StartPagePrinter(hPrinter)) {
                            int dwWritten = 0;
                            bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                            EndPagePrinter(hPrinter);
                        }
                        EndDocPrinter(hPrinter);
                    }
                    ClosePrinter(hPrinter);
                }
            } catch {
                bSuccess = false;
            } finally {
                Marshal.FreeCoTaskMem(pUnmanagedBytes);
            }
            return bSuccess;
        }
    }

    // =========================================================================
    // 🌐 Servidor HTTP Local (Porta 3001) para comunicação direta com a Web
    // =========================================================================
    public class HttpPrinterServer {
        private HttpListener _listener;
        private Thread _serverThread;
        private bool _isRunning = false;

        public bool Start() {
            try {
                _listener = new HttpListener();
                _listener.Prefixes.Add("http://localhost:3001/");
                _listener.Prefixes.Add("http://127.0.0.1:3001/");
                _listener.Start();
                _isRunning = true;

                _serverThread = new Thread(ListenLoop);
                _serverThread.IsBackground = true;
                _serverThread.Start();
                return true;
            } catch {
                _isRunning = false;
                return false;
            }
        }

        public void Stop() {
            _isRunning = false;
            try {
                if (_listener != null && _listener.IsListening) {
                    _listener.Stop();
                    _listener.Close();
                }
            } catch {}
        }

        private void ListenLoop() {
            while (_isRunning && _listener != null && _listener.IsListening) {
                try {
                    HttpListenerContext context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem(delegate {
                        ProcessRequest(context);
                    });
                } catch {
                    if (!_isRunning) break;
                }
            }
        }

        private void ProcessRequest(HttpListenerContext context) {
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            try {
                // Headers CORS para Web e HTTPS (Vercel)
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, *");
                response.Headers.Add("Access-Control-Allow-Private-Network", "true");

                if (request.HttpMethod == "OPTIONS") {
                    response.StatusCode = 204;
                    response.Close();
                    return;
                }

                string path = request.Url.AbsolutePath.ToLowerInvariant();
                if (path.StartsWith("/api/printer")) {
                    path = path.Substring(12);
                    if (!path.StartsWith("/")) path = "/" + path;
                }

                // Rota: Status
                if (path == "/" || path == "/status") {
                    SendJsonResponse(response, 200, "{\"success\":true,\"online\":true,\"port\":3001,\"message\":\"Servidor SDG Printer Ativo\"}");
                    return;
                }

                // Rota: Listar Impressoras Instaladas
                if (path == "/list" || path == "/printers") {
                    List<string> printers = new List<string>();
                    foreach (string p in PrinterSettings.InstalledPrinters) {
                        printers.Add(p);
                    }
                    string defPrinter = "";
                    try {
                        defPrinter = new PrinterSettings().PrinterName ?? "";
                    } catch {}

                    StringBuilder sb = new StringBuilder();
                    sb.Append("{\"success\":true,\"printers\":[");
                    for (int i = 0; i < printers.Count; i++) {
                        sb.Append("\"").Append(EscapeJson(printers[i])).Append("\"");
                        if (i < printers.Count - 1) sb.Append(",");
                    }
                    sb.Append("],\"defaultPrinter\":\"").Append(EscapeJson(defPrinter)).Append("\"}");

                    SendJsonResponse(response, 200, sb.ToString());
                    return;
                }

                // Rota: Imprimir Cupom
                if (path == "/print" && request.HttpMethod == "POST") {
                    string body = "";
                    using (StreamReader sr = new StreamReader(request.InputStream, request.ContentEncoding)) {
                        body = sr.ReadToEnd();
                    }

                    string printerName = ExtractJsonString(body, "printerName");
                    if (string.IsNullOrEmpty(printerName)) {
                        try { printerName = new PrinterSettings().PrinterName ?? ""; } catch {}
                    }

                    string rawBase64 = ExtractJsonString(body, "rawBase64");
                    string rawText = ExtractJsonString(body, "rawText");

                    byte[] bytes = null;
                    if (!string.IsNullOrEmpty(rawBase64)) {
                        try { bytes = Convert.FromBase64String(rawBase64); } catch {}
                    } else if (!string.IsNullOrEmpty(rawText)) {
                        bytes = Encoding.GetEncoding(860).GetBytes(rawText);
                    }

                    if (bytes != null && bytes.Length > 0) {
                        bool printed = RawPrinterHelper.SendBytes(printerName, bytes);
                        SendJsonResponse(response, 200, "{\"success\":" + (printed ? "true" : "false") + ",\"printer\":\"" + EscapeJson(printerName) + "\"}");
                    } else {
                        SendJsonResponse(response, 400, "{\"success\":false,\"error\":\"Dados de impressao invalidos\"}");
                    }
                    return;
                }

                // Rota de Teste
                if (path == "/test") {
                    string printerName = request.QueryString["printer"] ?? "";
                    if (string.IsNullOrEmpty(printerName)) {
                        try { printerName = new PrinterSettings().PrinterName ?? ""; } catch {}
                    }

                    byte[] init = new byte[] { 0x1B, 0x40 }; // ESC @
                    byte[] center = new byte[] { 0x1B, 0x61, 0x01 }; // ESC a 1
                    byte[] doubleH = new byte[] { 0x1D, 0x21, 0x11 }; // GS ! 17
                    byte[] normal = new byte[] { 0x1D, 0x21, 0x00 }; // GS ! 0
                    byte[] feedCut = new byte[] { 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x03 }; // Cut

                    string msg = "SDG ROMA PDV\nTESTE DE IMPRESSAO\n------------------------\nSTATUS: ONLINE\nDATA: " + DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss") + "\n------------------------\n";
                    byte[] msgBytes = Encoding.GetEncoding(860).GetBytes(msg);

                    List<byte> allBytes = new List<byte>();
                    allBytes.AddRange(init);
                    allBytes.AddRange(center);
                    allBytes.AddRange(doubleH);
                    allBytes.AddRange(Encoding.GetEncoding(860).GetBytes("SDG ROMA\n"));
                    allBytes.AddRange(normal);
                    allBytes.AddRange(msgBytes);
                    allBytes.AddRange(feedCut);

                    bool printed = RawPrinterHelper.SendBytes(printerName, allBytes.ToArray());
                    SendJsonResponse(response, 200, "{\"success\":" + (printed ? "true" : "false") + ",\"printer\":\"" + EscapeJson(printerName) + "\"}");
                    return;
                }

                SendJsonResponse(response, 404, "{\"error\":\"Rota nao encontrada\"}");
            } catch (Exception ex) {
                SendJsonResponse(response, 500, "{\"error\":\"" + EscapeJson(ex.Message) + "\"}");
            }
        }

        private void SendJsonResponse(HttpListenerResponse res, int statusCode, string json) {
            try {
                res.StatusCode = statusCode;
                res.ContentType = "application/json; charset=utf-8";
                byte[] buffer = Encoding.UTF8.GetBytes(json);
                res.ContentLength64 = buffer.Length;
                res.OutputStream.Write(buffer, 0, buffer.Length);
                res.OutputStream.Close();
            } catch {}
        }

        private string EscapeJson(string s) {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "\\r");
        }

        private string ExtractJsonString(string json, string key) {
            if (string.IsNullOrEmpty(json)) return "";
            string pattern = "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"([^\"]*)\"";
            Match m = Regex.Match(json, pattern);
            if (m.Success) return m.Groups[1].Value;
            return "";
        }
    }

    // =========================================================================
    // 🚀 Ponto de Entrada Principal
    // =========================================================================
    static class Program {
        [STAThread]
        static void Main(string[] args) {
            try {
                // 1. Inicia o Servidor Local de Impressão na porta 3001
                HttpPrinterServer printerServer = new HttpPrinterServer();
                printerServer.Start();

                string targetUrl = "https://romacell.sdgtec.com.br";
                if (args != null && args.Length > 0) {
                    foreach (string arg in args) {
                        if (arg.Equals("--local", StringComparison.OrdinalIgnoreCase)) {
                            targetUrl = "http://127.0.0.1:5173/";
                            break;
                        }
                    }
                }

                // 2. Localiza o Google Chrome ou Edge
                string browserPath = FindBrowserExecutable();
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string profileDir = Path.Combine(localApp, @"SDG Roma\ChromeProfile");

                if (!Directory.Exists(profileDir)) {
                    Directory.CreateDirectory(profileDir);
                }

                Process browserProc = null;
                if (!string.IsNullOrEmpty(browserPath)) {
                    string chromeArgs = string.Format(
                        "--app=\"{0}\" --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check",
                        targetUrl,
                        profileDir
                    );

                    ProcessStartInfo psiBrowser = new ProcessStartInfo {
                        FileName = browserPath,
                        Arguments = chromeArgs,
                        UseShellExecute = true
                    };

                    browserProc = Process.Start(psiBrowser);
                } else {
                    browserProc = Process.Start(targetUrl);
                }

                // Mantem o servidor de impressao rodando enquanto o app estiver aberto
                if (browserProc != null) {
                    try {
                        browserProc.WaitForExit();
                    } catch {}
                } else {
                    using (ManualResetEvent mre = new ManualResetEvent(false)) {
                        mre.WaitOne(60000);
                    }
                }

                printerServer.Stop();

            } catch (Exception ex) {
                MessageBox.Show(
                    "Ocorreu um erro ao iniciar o SDG Roma:\n\n" + ex.Message,
                    "SDG Roma - Erro de Inicialização",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static string FindBrowserExecutable() {
            try {
                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")) {
                    if (key != null) {
                        string val = key.GetValue("") as string;
                        if (!string.IsNullOrEmpty(val) && File.Exists(val)) return val;
                    }
                }
            } catch { }

            string chromeProg = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (File.Exists(chromeProg)) return chromeProg;

            string chromeX86 = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            if (File.Exists(chromeX86)) return chromeX86;

            string chromeUser = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(chromeUser)) return chromeUser;

            string edgeProg = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (File.Exists(edgeProg)) return edgeProg;

            return null;
        }
    }
}
