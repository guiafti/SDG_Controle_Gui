const { execSync } = require('child_process');
const fs = require('fs');

const env = { ...process.env };

// No runner do GitHub Actions (windows-latest), apontar diretamente para o VS 2022 evita o bug do VS 18 preview
const vs2022Path = 'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\';
if (fs.existsSync(vs2022Path)) {
  env.VCINSTALLDIR = vs2022Path;
  env.VSCMD_VER = '17.0';
  console.log('[Rebuild] Configurado para Visual Studio 2022 Enterprise.');
}

console.log('[Rebuild] Iniciando electron-rebuild...');
execSync('npx electron-rebuild -f', { stdio: 'inherit', env });
