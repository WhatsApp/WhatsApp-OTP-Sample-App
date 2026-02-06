import { currentUser } from '@clerk/nextjs/server';

export default async function DashboardPage() {
  const user = await currentUser();

  const metadata = user?.publicMetadata as {
    whatsapp_2fa_phone?: string;
    whatsapp_2fa_enabled?: boolean;
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '40px auto',
        padding: 24,
        background: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <h1 style={{ marginBottom: 24 }}>Dashboard</h1>

      <div
        style={{
          padding: 16,
          background: '#e8f5e9',
          borderRadius: 6,
          marginBottom: 24,
        }}
      >
        <p style={{ color: '#2e7d32', fontWeight: 500 }}>
          WhatsApp 2FA Verified
        </p>
        <p style={{ fontSize: 14, color: '#666' }}>
          Verified phone: {metadata?.whatsapp_2fa_phone || 'Unknown'}
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>User Details</h2>
        <p>
          <strong>Name:</strong> {user?.firstName} {user?.lastName}
        </p>
        <p>
          <strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}
        </p>
        <p>
          <strong>User ID:</strong> {user?.id}
        </p>
      </div>

      <p style={{ color: '#666', fontSize: 14 }}>
        This page is protected by both Clerk authentication and WhatsApp 2FA.
        You can only see this content after completing both verification steps.
      </p>
    </div>
  );
}
