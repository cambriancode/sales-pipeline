import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pipeline Comercial Cervecero",
  description: "CRM interno y pipeline de oportunidades para cerveza artesanal y experiencias cerveceras.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
