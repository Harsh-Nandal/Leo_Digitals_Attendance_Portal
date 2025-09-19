// pages/_app.js
import Head from "next/head";
import { useState } from "react";
import "../styles/globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import SplashScreen from "../components/SplashScreen";

export default function MyApp({ Component, pageProps }) {
  const [appReady, setAppReady] = useState(false);

  return (
    <>
      <Head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme color (match manifest.theme_color) */}
        <meta name="theme-color" content="#000000" />

        {/* Mobile / app-capable settings */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Attendance Portal" />

        {/* Icons — make sure these exact files exist in /public */}
        <link
          rel="icon"
          href="/icons/small-logo-Image.jpg"
          sizes="192x192"
          type="image/jpeg"
        />
        <link
          rel="apple-touch-icon"
          href="/icons/small-logo-Image.jpg"
          sizes="192x192"
          type="image/jpeg"
        />

        {/* Preload the large splash image for a smoother first paint.
            Ensure SplashScreen uses /largeLogoImage.jpg (update component if needed) */}
        <link
          rel="preload"
          as="image"
          href="/largeLogoImage.jpg"
          type="image/jpeg"
        />

        {/* Tailwind CSS via CDN (keeping your existing setup) */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      brand: '#1a73e8'
                    }
                  }
                }
              }
            `,
          }}
        />
      </Head>

      {/* Show the splash screen until SplashScreen calls onFinish */}
      {!appReady && <SplashScreen onFinish={() => setAppReady(true)} />}

      {/* Main app content */}
      <div style={{ visibility: appReady ? "visible" : "visible" }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
