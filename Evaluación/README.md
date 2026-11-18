# Sistema de citas médicas

- **Autor:** TU NOMBRE Y APELLIDO
- **Usuario de GitHub:** TU_USUARIO

## Servicios

- **Agenda (3001):** guarda los médicos y sus cupos; reserva un cupo por HTTP.
- **Citas (3000):** recibe solicitudes de pacientes, reserva en Agenda y avisa a Notificaciones; calcula un reporte en un hilo trabajador.
- **Notificaciones (4000):** servidor TCP (`node:net`) que registra en su log los avisos de citas.

## Cómo levantarlo

```bash
docker compose up -d --build
docker compose ps
```

Sin Docker (tres terminales, en cada carpeta): `npm install && npm run build && npm start`
