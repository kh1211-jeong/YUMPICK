import type { Metadata } from "next";
import Script from "next/script";
import { GA_ID } from "@/lib/analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "yumpick",
  description: "오늘 식사, 냠 하고 정해요",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg font-sans text-text antialiased">
        {GA_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
                window.gtag = gtag;
              `}
            </Script>
          </>
        ) : null}
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
