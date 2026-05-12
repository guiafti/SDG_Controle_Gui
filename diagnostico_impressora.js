const usb = require('usb');

const VID = 0x28E9;
const PID = 0x0289;

console.log('=========================================');
console.log('   DIAGNOSTICO DE IMPRESSORA (NODE.JS)   ');
console.log('=========================================');

try {
    const device = usb.findByIds(VID, PID);

    if (!device) {
        console.error('❌ ERRO: Impressora nao encontrada!');
        console.log('Verifique se o cabo USB esta conectado.');
        process.exit(1);
    }

    console.log('✅ Impressora detectada com sucesso!');
    console.log('Tentando abrir o dispositivo...');

    try {
        device.open();
        console.log('✅ Dispositivo aberto!');

        const iface = device.interfaces[0];
        console.log('Tentando assumir o controle (Claim Interface)...');
        
        iface.claim();
        console.log('✅ Controle assumido!');

        const outEndpoint = iface.endpoints.find(e => e.direction === 'out');
        if (!outEndpoint) {
            console.error('❌ ERRO: Nao foi possivel achar o ponto de saida (Endpoint OUT).');
            iface.release(true, () => device.close());
            process.exit(1);
        }

        console.log('Enviando comando de inicializacao (ESC @)...');
        const init = Buffer.from([0x1b, 0x40]);
        
        outEndpoint.transfer(init, (err) => {
            if (err) {
                console.error('❌ ERRO na transferencia:', err.message);
            } else {
                console.log('🚀 SUCESSO! O comando foi enviado para a impressora.');
                console.log('Se ela nao imprimiu nada, ela apenas resetou (o que e normal).');
            }
            
            iface.release(true, () => {
                device.close();
                console.log('Dispositivo fechado com seguranca.');
            });
        });

    } catch (err) {
        console.error('❌ ERRO DE ACESSO:', err.message);
        if (err.message.includes('LIBUSB_ERROR_ACCESS')) {
            console.log('\n--- SOLUCAO ---');
            console.log('O Windows esta segurando a impressora.');
            console.log('1. Va em "Dispositivos e Impressoras".');
            console.log('2. Remova a "POS58 Printer".');
            console.log('3. Use o Zadig para colocar o driver WinUSB.');
            console.log('----------------\n');
        }
    }

} catch (e) {
    console.error('❌ ERRO CRITICO:', e.message);
}
