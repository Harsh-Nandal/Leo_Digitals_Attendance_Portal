"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as faceapi from "face-api.js";

//

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState(""); // New state for dynamic popup message
  const [loading, setLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const runningDetection = useRef(false);
  const router = useRouter();

  const handleClose = () => {
    setShowPopup(false);
    setPopupMessage(""); // Reset message on close
  };

  // Ask camera permission
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (stream) stream.getTracks().forEach((t) => t.stop());
        console.log("✅ Camera permission granted");
      } catch (err) {
        alert("Please allow camera access to mark attendance.");
      }
    })();
  }, []);

  // Start camera
  useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setVideoReady(true);
            videoRef.current.play();
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("Could not access camera.");
      }
    })();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Capture single frame
  const captureImage = () => {
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  // Capture multiple frames and pick best one (middle) - improved for accuracy
  const captureBestFrame = async (count = 10, delay = 100) => {
    const frames = [];
    for (let i = 0; i < count; i++) {
      frames.push(captureImage());
      await new Promise((r) => setTimeout(r, delay));
    }
    // pick middle frame for stability
    return frames[Math.floor(frames.length / 2)];
  };

  // Load face detection model
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models"); // Adjust path to your models folder (e.g., public/models)
        console.log("✅ Face detection model loaded");
      } catch (err) {
        console.error("❌ Failed to load face detection model:", err);
      }
    };
    loadModels();
  }, []);

  // Attendance handler
  const handleAttendance = async () => {
    if (runningDetection.current) return;
    runningDetection.current = true;
    setLoading(true);

    try {
      if (!videoReady) {
        alert("Camera not ready yet. Please wait a second.");
        return;
      }

      console.log("📸 Capturing best frame...");
      let imageData = await captureBestFrame();
      let faceDetected = false;
      let retryCount = 0;
      const maxRetries = 3;

      // Quick client-side face detection to ensure accuracy
      while (!faceDetected && retryCount < maxRetries) {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions(),
        );
        if (detections.length > 0) {
          faceDetected = true;
        } else {
          console.warn(
            `No face detected, retrying... (${retryCount + 1}/${maxRetries})`,
          );
          await new Promise((r) => setTimeout(r, 500)); // Short delay before retry
          imageData = await captureBestFrame(); // Recapture
          retryCount++;
        }
      }

      if (!faceDetected) {
        // Show popup with message for no face detected
        setPopupMessage(
          "No face detected. Please position yourself better and try again.",
        );
        setShowPopup(true);
        return;
      }

      console.log("📤 Sending image for verification...");
      const res = await fetch("/api/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData }),
        signal: AbortSignal.timeout(10000), // 10s timeout for speed
      });

      const result = await res.json();
      console.log("💻 Result:", result);

      const distance =
        typeof result?.distance === "number"
          ? result.distance
          : typeof result?.matchDistance === "number"
            ? result.matchDistance
            : null;

      const distanceOk = distance === null ? true : distance < 0.55; // Stricter check for accuracy

      if (result.success && result.user && distanceOk) {
        const { name, role, userId, imageUrl } = result.user;
        localStorage.setItem("uid", userId);

        // Optional Telegram alert
        fetch("/api/send-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role, userId, imageData }),
        }).catch(() => {});

        router.push(
          `/success?name=${encodeURIComponent(name)}&role=${encodeURIComponent(
            role,
          )}&userId=${encodeURIComponent(userId)}&image=${encodeURIComponent(
            imageUrl || "",
          )}&imageData=${encodeURIComponent(imageData)}`,
        );
      } else {
        console.warn("Not recognized:", result);
        setPopupMessage(
          "Not recognized with high confidence. Please choose an option:",
        );
        setShowPopup(true);
      }
    } catch (err) {
      console.error("❌ Error:", err);
      alert("Something went wrong during attendance.");
    } finally {
      setLoading(false);
      runningDetection.current = false;
    }
  };

  // PWA install
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => setIsInstalled(true);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choice) => {
        if (choice.outcome === "accepted") {
          setInstallPrompt(null);
          setIsInstalled(true);
        }
      });
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-200 px-4 py-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute w-[500px] h-[500px] bg-blue-200 rounded-full blur-3xl opacity-30 top-[-100px] left-[-100px]" />
      <div className="absolute w-[400px] h-[400px] bg-indigo-200 rounded-full blur-3xl opacity-30 bottom-[-100px] right-[-100px]" />

      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md z-50">
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-[90%] max-w-sm relative border border-gray-200 animate-[fadeIn_0.3s_ease]">
            <button
              onClick={handleClose}
              className="absolute top-3 right-4 text-gray-500 hover:text-red-500 text-xl"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              Welcome 👋
            </h2>

            <p className="text-gray-600 text-center mb-6">{popupMessage}</p>

            <div className="flex gap-3">
              <Link href="/newStudent" className="flex-1">
                <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-xl font-medium hover:scale-105 transition">
                  New User
                </button>
              </Link>

              <Link href="/punchPage" className="flex-1">
                <button className="w-full bg-gray-200 text-gray-800 py-2.5 rounded-xl font-medium hover:bg-gray-300 transition">
                  Registered
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-6xl bg-white/60 backdrop-blur-xl shadow-xl rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-10 border border-gray-200">
        {/* LEFT - Camera */}
        <div className="flex flex-col items-center flex-1">
          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-[6px] border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.4)] flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-full"
            />

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <span className="text-white font-semibold animate-pulse">
                  Detecting...
                </span>
              </div>
            )}
          </div>

          {/* Logo */}
          <img
            src="/main_logo.png"
            alt="Logo"
            className="w-40 md:w-48 mt-6 drop-shadow-xl"
          />
        </div>

        {/* RIGHT - Content */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight mb-3">
            Welcome to <br />
            <span className="text-blue-600">Leo Digitalz</span>
          </h1>

          <p className="hidden lg:block text-gray-600 mb-6 max-w-md text-base leading-relaxed">
            Smart face recognition attendance system. Just look into the camera
            and mark your attendance instantly.
          </p>

          <button
            onClick={handleAttendance}
            disabled={loading || !videoReady}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-xl text-lg shadow-lg hover:scale-105 transition disabled:opacity-50 mb-4"
          >
            {loading ? "Detecting..." : "Mark Attendance"}
          </button>
          <Link
            href="/newStudent"
            className="text-sm text-gray-500 hover:text-gray-700 transition mb-6"
          >
            New User? Register here
          </Link>

          {!isInstalled && installPrompt && (
            <button
              onClick={handleInstall}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2 rounded-lg shadow hover:scale-105 transition"
            >
              Install App
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
