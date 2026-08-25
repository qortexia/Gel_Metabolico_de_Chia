import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { MetaPixelScript } from '@/components/tracking/MetaPixelScript';
import { TrackingProvider } from '@/components/tracking/TrackingProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gel Metabólico de Chía — Tu plan personalizado',
  description: 'Descubre tu plan personalizado para bajar de peso con Gel Metabólico de Chía.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return (
    <html lang="es-MX">
      <body className={inter.className}>
        {pixelId ? <MetaPixelScript pixelId={pixelId} /> : null}
        <TrackingProvider />
        {children}
      </body>
    </html>
  );
}
