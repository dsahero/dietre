import type { Metadata } from "next";
import { Geist_Mono, Fraunces, Inter } from "next/font/google";
import { TooltipProvider } from "@/frontend/components/ui/tooltip";
import { InviteNotifications } from "@/frontend/components/invite-notifications";
import "@/frontend/styles/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displaySerif = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "dietre — When2meet for catering",
  description:
    "Anonymous, ingredient-level dietary matching for hosts running events of 30–300+ people. Demo city: Blacksburg / Virginia Tech.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${displaySerif.variable} antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <TooltipProvider>{children}</TooltipProvider>
        <InviteNotifications />
      </body>
    </html>
  );
}
