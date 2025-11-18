export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Login OK</h1>
      <p>Your session token is:</p>
      <pre
        style={{
          background: '#f4f4f4',
          padding: '1rem',
          borderRadius: '4px',
          overflowX: 'auto',
          maxWidth: '100%',
          color: '#333',
        }}
      >
        {token}
      </pre>
    </div>
  );
}

