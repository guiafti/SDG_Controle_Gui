const { execSync } = require('child_process');
const fs = require('fs');

const vsDevCmd = 'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\Common7\\Tools\\VsDevCmd.bat';

if (fs.existsSync(vsDevCmd)) {
  console.log('[Rebuild] Ativando ambiente do Visual Studio 2022 Enterprise...');
  execSync(`cmd.exe /c "call \\"${vsDevCmd}\\" -arch=x64 && npx electron-rebuild -f"`, { stdio: 'inherit' });
} else {
  console.log('[Rebuild] Executando electron-rebuild padrao...');
  execSync('npx electron-rebuild -f', { stdio: 'inherit' });
}
