import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CV Builder", template: "%s · Los Andes Labs" },
  description: "Arma tu CV con plantillas profesionales y descárgalo en Word o PDF.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE">
      {/* suppressHydrationWarning: extensiones del navegador agregan atributos al body. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
