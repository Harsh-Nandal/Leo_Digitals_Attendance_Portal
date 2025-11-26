// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA & App meta */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#000000" />

        {/* ✅ TailwindCSS via CDN (kept but made non-blocking) */}
        <script src="https://cdn.tailwindcss.com" defer></script>

        {/* ✅ Optional: Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <body className="bg-gray-50 text-gray-900 font-[Poppins]">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
