import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const CHECK_EVERY_MS = 1000; // how often we look for a face
const MISSES_BEFORE_ALERT = 2; // consecutive misses before we warn (about 2 seconds)

// Shows the candidate's camera and reports whether their face is in the frame.
//   onStatusChange("loading" | "ok" | "missing" | "camera-blocked")
// The parent decides how to display the warning. Purely informational:
// it never affects the interview itself.
export default function FaceMonitor({ active, onStatusChange }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const missCountRef = useRef(0);
  const onStatusRef = useRef(onStatusChange);

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    onStatusRef.current = onStatusChange;
  }, [onStatusChange]);

  // Tell the parent whenever the status changes
  useEffect(() => {
    onStatusRef.current?.(status);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    faceapi.nets.tinyFaceDetector
      .loadFromUri("/models")
      .then(() => {
        if (!cancelled) setModelsReady(true);
      })
      .catch((err) => {
        console.warn("Face detection model failed to load. Is public/models/tiny_face_detector_model-shard1 present?", err);
      });
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
        setCameraBlocked(false);
      })
      .catch(() => {
        if (!cancelled) {
          setCameraBlocked(true);
          setStatus("camera-blocked");
        }
      });

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
          setStatus("ok");
        } else {
          missCountRef.current += 1;
          if (missCountRef.current >= MISSES_BEFORE_ALERT) setStatus("missing");
        }
      } catch (err) {
        /* ignore a single failed frame */
      }
    }, CHECK_EVERY_MS);

    return () => clearInterval(intervalRef.current);
  }, [active, modelsReady, cameraReady]);

  if (!active) return null;

  return (
    <>
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
      {cameraBlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 text-center">
          <p className="text-sm text-white/80 leading-relaxed">
            Camera access is blocked. Click the camera icon in the address bar, allow access and reload the page.
          </p>
        </div>
      )}
    </>
  );
}