// pages/_app.js
import Head from "next/head";
import "../styles/globals.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // ✅ Detect WebView (Capacitor, Android WebView)
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const inWebView =
      /\bwv\b/i.test(ua) || /Capacitor/i.test(ua) || /Android.*Version/i.test(ua);

    if (inWebView && typeof window !== "undefined" && "serviceWorker" in navigator) {
      (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) await r.unregister();
          console.log("ServiceWorkers unregistered (WebView)");
        } catch (err) {
          console.warn("Failed to unregister SW in WebView", err);
        }

        // ✅ Try clearing caches
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

        {/* ✅ Preload splash image (kept, but won't be shown since splash removed) */}
        <link rel="preload" as="image" href="/largeLogoImage.jpg" type="image/jpeg" />

        {/* ✅ Tailwind CDN */}
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

      {/* ✅ Main App Content (loads immediately) */}
      <Component {...pageProps} />
    </>
  );
}
