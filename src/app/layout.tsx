import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gel Metabólico de Chía',
  description: 'Descubre tu plan personalizado.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
