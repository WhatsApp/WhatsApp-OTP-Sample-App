import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: 'white',
          borderBottom: '1px solid #eee',
        }}
      >
        <Link href="/" style={{ fontWeight: 600, fontSize: 18 }}>
          WhatsApp OTP App
        </Link>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
