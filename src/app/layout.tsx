import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Almyar',
  description: 'Labor timesheet management system for ALMYAR UNITED TRADING LLC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
