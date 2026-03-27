import Script from "next/script";

export const metadata = {
  title: "Abbado Draft - Word Add-In",
};

export default function AddinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
        strategy="afterInteractive"
      />
      <div className="h-screen bg-white overflow-hidden">
        {children}
      </div>
    </>
  );
}
