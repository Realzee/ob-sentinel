// app/control-room/layout.tsx
export const metadata = {
  title: 'Control Room - RAPID REPORT',
  description: 'Live incident management and monitoring dashboard',
};

export default function ControlRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900">
        {children}
      </body>
    </html>
  );
}