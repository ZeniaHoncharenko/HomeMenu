import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Семейное меню",
  description: "Семейное меню на завтрак, обед и ужин",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
