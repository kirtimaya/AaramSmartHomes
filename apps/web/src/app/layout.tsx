import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Aara AI is temporarily dormant — not deleted, just unmounted. Uncomment
// both this import and the <AaraWidget /> render below to bring it back.
// import { AaraWidget } from "@/components/aara/AaraWidget";

export const metadata: Metadata = {
  title: "Aaram Smart Homes | Premium Villa PMS",
  description: "Executive Property Management System for high-end villa rentals.",
};

const themeScript = `
(function(){
  try {
    var s = localStorage.getItem('theme');
    var p = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if ((s || p) === 'dark') document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <AuthProvider>
            {children}
            {/* <AaraWidget /> */}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

