import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clé Minutes",
  description: "Clé Minutes — Plateforme service client (dashboard + vitrine)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
