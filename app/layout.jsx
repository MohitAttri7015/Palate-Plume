import "./globals.css";
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Cormorant_Garamond } from 'next/font/google';
import SmoothScroll from "@/components/SmoothScroll";

const uiFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--next-font-ui',
});

const headingFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--next-font-heading',
});



export const metadata = {
  metadataBase: new URL("https://palate-plume.vercel.app/"),
  title: {
    default: "Palate & Plume – Culinary Artistry & Digital Menu",
    template: "%s | Palate & Plume",
  },
  description:
    "Experience fine dining at your rhythm. Browse our seasonal tasting menu, order artisanal dishes, and track kitchen updates directly from your table.",
  keywords: [
    "Palate and Plume",
    "luxury digital menu",
    "fine dining QR order",
    "artisanal cuisine",
    "live order tracking",
    "contactless table ordering",
  ],
  openGraph: {
    title: "Palate & Plume – Culinary Artistry at Your Rhythm",
    description:
      "Browse our seasonal menu, customize orders, and enjoy seamless service directly from your phone.",
    url: "/",
    siteName: "Palate & Plume",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Palate & Plume – Fine Dining Experience",
    description:
      "Browse our seasonal tasting menu and order seamlessly from your table.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${uiFont.variable}`}>
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}