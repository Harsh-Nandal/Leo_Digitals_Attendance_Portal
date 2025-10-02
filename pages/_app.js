// pages/_app.js
import Head from "next/head";
import { useState, useEffect } from "react";
import "../styles/globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import SplashScreen from "../components/SplashScreen";

export default function MyApp({ Component, pageProps }) {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const inWebView =
      /Capacitor/i.test(ua) ||
      /\bwv\b/i.test(ua) ||
      /Android.*Version/i.test(ua) ||
      !!(window && window.Capacitor); // additional guard

    async function clearServiceWorkersAndCaches() {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          if (regs && regs.length) {
            console.log("Unregistering service workers:", regs.length);
            await Promise.all(regs.map((r) => r.unregister()));
            console.log("Service workers unregistered");
          } else {
            console.log("No service workers to unregister");
          }
        }
      } catch (swErr) {
        console.warn("Error while unregistering SW:", swErr);
      }

      // Clear Cache Storage
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          if (keys && keys.length) {
            console.log("Deleting caches:", keys);
            await Promise.all(keys.map((k) => caches.delete(k)));
            console.log("Caches cleared");
          } else {
            console.log("No caches to clear");
          }
        }
      } catch (cacheErr) {
        console.warn("Error clearing caches:", cacheErr);
      }

      // Clear local/session storage
      try {
        localStorage.clear();
        sessionStorage.clear();
        console.log("LocalStorage & SessionStorage cleared");
      } catch (lsErr) {
        console.warn("Error clearing local/session storage:", lsErr);
      }

      // Try to delete IndexedDB databases (best-effort; API may vary)
      try {
        if (indexedDB && indexedDB.databases) {
          const dbs = await indexedDB.databases();
          if (dbs && dbs.length) {
            await Promise.all(
              dbs.map((d) => {
                if (d && d.name) return new Promise((res) => {
                  const req = indexedDB.deleteDatabase(d.name);
                  req.onsuccess = () => res(true);
                  req.onerror = () => res(false);
                  req.onblocked = () => res(false);
                });
                return Promise.resolve(true);
              })
            );
            console.log("IndexedDB DBs removed (attempted)");
          }
        }
      } catch (idbErr) {
        console.warn("Error removing IndexedDB databases:", idbErr);
      }
    }

    if (inWebView) {
      // We are in the Android WebView / Capacitor - remove SW + caches aggressively
      console.log("Detected WebView/Capacitor environment — clearing SW + caches");
      clearServiceWorkersAndCaches().catch((e) =>
        console.warn("clearServiceWorkersAndCaches failed:", e)
      );
    } else {
      console.log("Not a WebView environment — leaving SW as-is");
    }
  }, []);

  return (
    <>
      <Head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme color */}
        <meta name="theme-color" content="#000000" />

        {/* Mobile / app-capable settings */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Attendance Portal" />

        {/* Icons */}
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

        {/* Preload splash image */}
        <link
          rel="preload"
          as="image"
          href="/largeLogoImage.jpg"
          type="image/jpeg"
        />

        {/* Tailwind via CDN */}
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

      {/* SplashScreen until ready */}
      {!appReady && <SplashScreen onFinish={() => setAppReady(true)} />}

      {/* Main app content */}
      <div style={{ visibility: appReady ? "visible" : "visible" }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
