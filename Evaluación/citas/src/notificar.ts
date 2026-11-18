import net from 'node:net';

export interface ResultadoAviso { ok: boolean; motivo?: string; }

export function avisarNotificaciones(
    host: string, port: number, timeoutMs: number, mensaje: object, citaId: string
): Promise<ResultadoAviso> {
    return new Promise((resolve) => {
        let terminado = false;
        let buffer = '';
        const socket = net.connect({ host, port });

        const fin = (r: ResultadoAviso) => {
            if (terminado) return;
            terminado = true;
            clearTimeout(timer);
            socket.destroy();
            resolve(r);
        };

        const timer = setTimeout(() => fin({ ok: false, motivo: `Notificaciones no confirmó en ${timeoutMs}ms` }), timeoutMs);

        socket.setEncoding('utf8');
        socket.on('connect', () => socket.write(JSON.stringify(mensaje) + '\n'));
        socket.on('data', (chunk: string) => {
            buffer += chunk;
            const i = buffer.indexOf('\n');
            if (i === -1) return;
            const linea = buffer.slice(0, i);
            try {
                const r = JSON.parse(linea);
                if (r.ok === true && r.recibido === citaId) fin({ ok: true });
                else fin({ ok: false, motivo: `Respuesta inesperada: ${linea}` });
            } catch {
                fin({ ok: false, motivo: 'Respuesta no es JSON válido' });
            }
        });
        socket.on('error', (e: NodeJS.ErrnoException) => fin({ ok: false, motivo: `Error de conexión: ${e.code ?? e.message}` }));
        socket.on('close', () => fin({ ok: false, motivo: 'Conexión cerrada sin confirmación' }));
    });
}
