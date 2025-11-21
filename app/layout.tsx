import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Claymation Lake - 9:16',
  description: 'A handcrafted claymation-inspired animation rendered on canvas, 9:16 format.',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}
