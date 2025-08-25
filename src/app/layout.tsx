import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Webcomponent Editor', description: 'No-code editor' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
        <body>{children}</body>
        </html>
    );
}