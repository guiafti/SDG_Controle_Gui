using System;
using System.IO;
using System.Net.Sockets;
using System.Diagnostics;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Runtime.InteropServices;

namespace SdgRomaLauncher {
    static class Program {
        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

        private const int SW_RESTORE = 9;

        [STAThread]
        static void Main(string[] args) {
            try {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
                // Se estiver dentro da pasta launcher, sobe um nivel
                if (Directory.Exists(Path.Combine(baseDir, "node_modules")) == false &&
                    Directory.Exists(Path.Combine(Directory.GetParent(baseDir).FullName, "node_modules"))) {
                    baseDir = Directory.GetParent(baseDir).FullName;
                }

                int port = 5173;
                string targetUrl = "https://romacell.sdgtec.com.br";

                bool forceLocal = false;
                if (args != null && args.Length > 0) {
                    foreach (string arg in args) {
                        if (arg.Equals("--local", StringComparison.OrdinalIgnoreCase)) {
                            forceLocal = true;
                            break;
                        }
                    }
                }

                if (forceLocal) {
                    targetUrl = "http://127.0.0.1:" + port + "/";
                    bool isServerRunning = CheckPortOpen("127.0.0.1", port);

                    if (!isServerRunning) {
                        string nodePath = FindNodeExecutable();
                        string viteBin = Path.Combine(baseDir, @"node_modules\vite\bin\vite.js");
                        if (!string.IsNullOrEmpty(nodePath) && File.Exists(viteBin)) {
                            ProcessStartInfo psiServer = new ProcessStartInfo {
                                FileName = nodePath,
                                Arguments = "\"" + viteBin + "\" --host 127.0.0.1 --port " + port,
                                WorkingDirectory = baseDir,
                                WindowStyle = ProcessWindowStyle.Hidden,
                                CreateNoWindow = true,
                                UseShellExecute = false
                            };
                            Process.Start(psiServer);
                            int attempts = 0;
                            while (attempts < 20) {
                                Thread.Sleep(400);
                                if (CheckPortOpen("127.0.0.1", port)) break;
                                attempts++;
                            }
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

                if (!string.IsNullOrEmpty(browserPath)) {
                    // Inicia em modo App (Janela independente sem barra de abas nem URL)
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

                    Process.Start(psiBrowser);
                } else {
                    // Fallback: abre no navegador padrao do Windows
                    Process.Start(targetUrl);
                }

            } catch (Exception ex) {
                MessageBox.Show(
                    "Ocorreu um erro ao iniciar o SDG Roma:\n\n" + ex.Message,
                    "SDG Roma - Erro de Inicialização",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static bool CheckPortOpen(string host, int port) {
            try {
                using (TcpClient client = new TcpClient()) {
                    IAsyncResult result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(400);
                    if (success && client.Connected) {
                        client.EndConnect(result);
                        return true;
                    }
                }
            } catch { }
            return false;
        }

        private static string FindNodeExecutable() {
            string defaultPath = @"C:\Program Files\nodejs\node.exe";
            if (File.Exists(defaultPath)) return defaultPath;

            string x86Path = @"C:\Program Files (x86)\nodejs\node.exe";
            if (File.Exists(x86Path)) return x86Path;

            string appDataNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"npm\node.exe");
            if (File.Exists(appDataNode)) return appDataNode;

            string localAppDataNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\nodejs\node.exe");
            if (File.Exists(localAppDataNode)) return localAppDataNode;

            string pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
            string[] dirs = pathEnv.Split(';');
            foreach (string dir in dirs) {
                try {
                    string full = Path.Combine(dir.Trim(), "node.exe");
                    if (File.Exists(full)) return full;
                } catch { }
            }

            return null;
        }

        private static string FindBrowserExecutable() {
            // 1. Google Chrome pelo Registro
            try {
                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")) {
                    if (key != null) {
                        string val = key.GetValue("") as string;
                        if (!string.IsNullOrEmpty(val) && File.Exists(val)) return val;
                    }
                }
            } catch { }

            // 2. Google Chrome caminhos padroes
            string chromeProg = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (File.Exists(chromeProg)) return chromeProg;

            string chromeX86 = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            if (File.Exists(chromeX86)) return chromeX86;

            string chromeUser = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(chromeUser)) return chromeUser;

            // 3. Microsoft Edge pelo Registro ou caminhos padroes
            try {
                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe")) {
                    if (key != null) {
                        string val = key.GetValue("") as string;
                        if (!string.IsNullOrEmpty(val) && File.Exists(val)) return val;
                    }
                }
            } catch { }

            string edgeProg = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (File.Exists(edgeProg)) return edgeProg;

            string edge64 = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            if (File.Exists(edge64)) return edge64;

            return null;
        }
    }
}
