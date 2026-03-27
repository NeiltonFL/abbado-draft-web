export const metadata = {
  title: "Abbado Draft - Word Add-In",
};

export default function AddinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-white overflow-hidden">
      {children}
    </div>
  );
}
