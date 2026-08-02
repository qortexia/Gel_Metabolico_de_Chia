import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gel Metabólico de Chía — Tu plan personalizado',
  description: 'Descubre tu plan personalizado para bajar de peso con Gel Metabólico de Chía.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
