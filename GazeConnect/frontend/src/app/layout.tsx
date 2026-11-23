import type { Metadata } from "next";
import "./globals.css";
import GazeProvider from "@/components/gaze/GazeProvider";

export const metadata: Metadata = {
  title: "GazeConnect — Your Eyes. Your Voice. Your Freedom.",
  description:
    "Accessible browser-based AAC eye-tracking communication platform for individuals with ALS, cerebral palsy, and motor impairments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body className="h-full flex flex-col bg-ice-50 text-navy-900 antialiased" suppressHydrationWarning>
        <GazeProvider>
          {children}
        </GazeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration note:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
