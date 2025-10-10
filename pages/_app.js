// pages/_app.js
import Head from "next/head";
<<<<<<< HEAD
import { useState, useEffect } from "react";
=======
import { useState } from "react";
import "../styles/globals.css";
>>>>>>> 750be60f6e04f56d1cf5e7e391f45e6ff1e09586
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import SplashScreen from "../components/SplashScreen";

export default function MyApp({ Component, pageProps }) {
  const [appReady, setAppReady] = useState(false);

<<<<<<< HEAD
  useEffect(() => {
    // Detect WebView (Capacitor, Android WebView)
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const inWebView = /\bwv\b/i.test(ua) || /Capacitor/i.test(ua) || /Android.*Version/i.test(ua);

    if (inWebView && typeof window !== "undefined" && "serviceWorker" in navigator) {
      (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            await r.unregister();
          }
          console.log("ServiceWorkers unregistered (WebView)");
        } catch (err) {
          console.warn("Failed to unregister SW in WebView", err);
        }

        // Try clearing caches
        if (caches && caches.keys) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
            console.log("Client caches cleared (WebView)");
          } catch (err) {
            console.warn("Failed to clear caches (WebView)", err);
          }
        }
      })();
    }
  }, []);

  return (
    <>
      <Head>
        {/* ✅ PWA & App Meta */}
=======
  return (
    <>
      <Head>
        {/* PWA manifest */}
>>>>>>> 750be60f6e04f56d1cf5e7e391f45e6ff1e09586
        <link rel="manifest" href="/manifest.json" />

        {/* Theme color (match manifest.theme_color) */}
        <meta name="theme-color" content="#000000" />

        {/* Mobile / app-capable settings */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Attendance Portal" />

<<<<<<< HEAD
        {/* ✅ Icons */}
=======
        {/* Icons — make sure these exact files exist in /public */}
>>>>>>> 750be60f6e04f56d1cf5e7e391f45e6ff1e09586
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

<<<<<<< HEAD
        {/* ✅ Preload images */}
=======
        {/* Preload the large splash image for a smoother first paint.
            Ensure SplashScreen uses /largeLogoImage.jpg (update component if needed) */}
>>>>>>> 750be60f6e04f56d1cf5e7e391f45e6ff1e09586
        <link
          rel="preload"
          as="image"
          href="/largeLogoImage.jpg"
          type="image/jpeg"
        />
<<<<<<< HEAD
      </Head>

      {/* ✅ Splash screen until app is ready */}
=======

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
>>>>>>> 750be60f6e04f56d1cf5e7e391f45e6ff1e09586
      {!appReady && <SplashScreen onFinish={() => setAppReady(true)} />}

      {/* Main app content */}
      <div style={{ visibility: appReady ? "visible" : "visible" }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
