"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PunchAttendance() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(true);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const router = useRouter();

  // Fetch all students
  useEffect(() => {
    async function fetchStudents() {
      const r = await fetch("/api/getStudents");
      const d = await r.json();
      setStudents(d.students || []);
    }
    fetchStudents();
  }, []);

  const filtered = students.filter((s) =>
    (s.userId || "").toLowerCase().includes(search.toLowerCase())
  );

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      showAlert("Camera blocked! Please allow permission.", "error");
    }
  };

  // Stop camera
  const stopCamera = () => {
    try {
      const stream = videoRef.current?.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    } catch {}
  };

  // Capture photo
  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg");
  };

  const showAlert = (msg, type = "success") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 2500);
  };

  const handlePunch = async () => {
    if (!selected) return;

    setLoading(true);

    const img = captureImage();
    if (!img) {
      showAlert("Camera not ready!", "error");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/punchAttendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selected.userId,
          name: selected.name,
          image: img,
        }),
      });

      const data = await res.json();

      if (data?.punchType) {
        showAlert(`Punch ${data.punchType.toUpperCase()} recorded`, "success");
      } else {
        showAlert(data.message || "Punch recorded", "success");
      }
    } catch (err) {
      console.error(err);
      showAlert("Network or server error", "error");
    } finally {
      setLoading(false);
      stopCamera();
      setSelected(null);
      setSearch("");
      setShowList(true);

      setTimeout(() => router.push("/"), 1500);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-blue-50 to-gray-100 flex flex-col">

      {/* ALERT */}
      {alert && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-white z-50 ${
            alert.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {alert.msg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">

        {/* LOGO */}
        <div className="flex justify-center mb-4">
          <img
            src="/DesinerzAcademyDark.png"
            alt="Designerz Logo"
            className="w-48 h-auto"
          />
        </div>

        <Link href="/" className="inline-block mb-4 text-blue-600 font-semibold">
          ⬅ Home
        </Link>

        <div className="max-w-md mx-auto bg-white rounded-2xl p-5 shadow-xl">
          <h1 className="text-2xl font-bold text-center mb-4">Faculty Punch Attendance</h1>

          {/* SEARCH BOX */}
          <input
            type="text"
            placeholder="Search by User ID"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowList(true);
            }}
            className="w-full p-3 border rounded-xl bg-gray-50 mb-3"
          />

          {/* STUDENT LIST */}
          {search && showList && (
            <div className="max-h-56 overflow-y-auto rounded-xl border mb-3 bg-white">
              {filtered.map((stu) => (
                <div
                  key={stu._id}
                  onClick={() => {
                    setSelected(stu);
                    setShowList(false);
                    startCamera();
                  }}
                  className="p-3 border-b cursor-pointer hover:bg-blue-50"
                >
                  <b>{stu.userId}</b> — {stu.name}
                </div>
              ))}
            </div>
          )}

          {/* SELECTED STUDENT & CAMERA */}
          {selected && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-center mb-3">
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <p className="text-gray-500 text-sm">ID: {selected.userId}</p>
              </div>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-xl border mb-3"
              />

              <canvas ref={canvasRef} className="hidden" />

              <button
                onClick={handlePunch}
                disabled={loading}
                className="w-full bg-blue-600 text-white p-3 rounded-xl"
              >
                {loading ? "Processing..." : "Punch Now (IN / OUT)"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
