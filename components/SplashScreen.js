// components/SplashScreen.jsx
import { useEffect, useState } from "react";

export default function SplashScreen({ minShow = 1500, maxShow = 8000, onFinish }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let loaded = false;
    let minPassed = false;
    let maxTimer;

    const hideIfReady = () => {
      if (loaded && minPassed) {
        setVisible(false);
        if (typeof onFinish === "function") onFinish();
      }
    };

    const handleLoad = () => {
      loaded = true;
      hideIfReady();
    };

    window.addEventListener("load", handleLoad);
    const minTimer = setTimeout(() => {
      minPassed = true;
      hideIfReady();
    }, minShow);

    // safety fallback: force hide after maxShow
    maxTimer = setTimeout(() => {
      setVisible(false);
      if (typeof onFinish === "function") onFinish();
    }, maxShow);

    return () => {
      window.removeEventListener("load", handleLoad);
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [minShow, maxShow, onFinish]);

  if (!visible) return null;

  return (
    <div
      id="app-splash"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#ffffff", // match manifest background_color
        zIndex: 99999
      }}
      aria-hidden="true"
    >
      <img
        src="/largeLogoImage.jpg"
        alt="Loading Attendance Portal"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block"
        }}
      />
    </div>
  );
}
