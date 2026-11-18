import net from 'node:net';

const PORT = Number(process.env.PORT ?? 4000);

const server = net.createServer((socket) => {
    let buffer = '';
    socket.setEncoding('utf8');

    socket.on('data', (chunk: string) => {
        buffer += chunk;                      
        let i: number;
        while ((i = buffer.indexOf('\n')) !== -1) {   
            const linea = buffer.slice(0, i).trim();
            buffer = buffer.slice(i + 1);
            if (linea === '') continue;
            procesarLinea(socket, linea);
        }
    });

    socket.on('error', (e) => console.log(`Error de socket: ${e.message}`));
});

function procesarLinea(socket: net.Socket, linea: string): void {
    try {
        const m = JSON.parse(linea);
        console.log(`[NOTIFICACION] tipo=${m.tipo} cita=${m.citaId} paciente=${m.paciente} medico=${m.medicoId}`);
        socket.write(JSON.stringify({ ok: true, recibido: m.citaId }) + '\n');
    } catch {
        socket.write(JSON.stringify({ ok: false, error: 'JSON inválido' }) + '\n');
    }
}

server.listen(PORT, () => console.log(`Notificaciones (TCP) escuchando en el puerto ${PORT}`));
