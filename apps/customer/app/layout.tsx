import './styles.css';

export const metadata = {
  title: 'SARJ BLENDED IT — Customer',
  description: 'Book mobile barber services',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
