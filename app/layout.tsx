import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cuaderno · Tu espacio personal",
  description: "Un espacio oscuro y ordenado para registrar tus días, finanzas, archivos y notas.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
