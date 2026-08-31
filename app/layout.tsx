import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Registros clínicos — vista de tarjetas',
  description:
    'Rejilla de tarjetas con filtros combinables, búsqueda y métricas, derivada del esquema real de la tabla registros_clinicos en Neon.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
