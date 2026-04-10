import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@jobfindeer/ui";
import { ThemeProvider, ThemeToggle } from "@jobfindeer/ui/theme";
import { Toaster } from "@jobfindeer/ui/toast";
import { auth } from "@jobfindeer/auth";

import { TRPCReactProvider } from "~/trpc/react";
import { SignOutButton } from "~/app/_components/SignOutButton";

import "~/app/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "JobFindeer",
  description: "Votre veille emploi intelligente",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default async function RootLayout(props: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <ThemeProvider>
          <nav className="border-b px-6 py-3">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
              <a href="/" className="text-lg font-bold">
                Job<span className="text-primary">Findeer</span>
              </a>
              <div className="flex items-center gap-4 text-sm">
                {session?.user ? (
                  <>
                    <a href="/onboarding" className="hover:text-primary">Onboarding</a>
                    <a href="/feed" className="hover:text-primary">Feed</a>
                    <a href="/offers" className="hover:text-primary">Offres</a>
                    <a href="/settings" className="hover:text-primary">Settings</a>
                    <span className="text-muted-foreground">{session.user.email}</span>
                    <SignOutButton />
                  </>
                ) : (
                  <>
                    <a href="/login" className="hover:text-primary">Connexion</a>
                    <a
                      href="/register"
                      className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium"
                    >
                      S&apos;inscrire
                    </a>
                  </>
                )}
                <ThemeToggle />
              </div>
            </div>
          </nav>
          <TRPCReactProvider>{props.children}</TRPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
