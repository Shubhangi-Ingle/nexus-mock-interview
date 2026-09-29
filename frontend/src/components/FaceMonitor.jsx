import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const IconAlert = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
  </svg>
);

// Fills its parent tile completely — sizing/chrome (border, label, corners)
// is the parent's job. Purely informational: never affects the interview.
export default function FaceMonitor({ active }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const missCountRef = useRef(0);

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceMissing, setFaceMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    faceapi.nets.tinyFaceDetector
      .loadFromUri("/models")
      .then(() => {
        if (!cancelled) setModelsReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !modelsReady || !cameraReady) return;

    intervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      try {
        const result = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
        );
        if (result) {
          missCountRef.current = 0;
          setFaceMissing(false);
        } else {
          missCountRef.current += 1;
          if (missCountRef.current >= 2) setFaceMissing(true);
        }
      } catch (err) {}
    }, 1500);

    return () => clearInterval(intervalRef.current);
  }, [active, modelsReady, cameraReady]);

  if (!active) return null;

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover scale-x-[-1]"
      />
      {faceMissing && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 animate-fade-in-up z-10">
          <div className="flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            <IconAlert className="w-3.5 h-3.5 shrink-0" />
            Face not detected
          </div>
        </div>
      )}
    </>
  );
}