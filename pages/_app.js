// pages/_app.js
import Head from "next/head";
import { useState, useEffect } from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import SplashScreen from "../components/SplashScreen";

export default function MyApp({ Component, pageProps }) {
  const [appReady, setAppReady] = useState(false);

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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Attendance Portal" />

        {/* ✅ Icons */}
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

        {/* ✅ Preload images */}
        <link
          rel="preload"
          as="image"
          href="/largeLogoImage.jpg"
          type="image/jpeg"
        />
      </Head>

      {/* ✅ Splash screen until app is ready */}
      {!appReady && <SplashScreen onFinish={() => setAppReady(true)} />}

      <div style={{ visibility: appReady ? "visible" : "visible" }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
