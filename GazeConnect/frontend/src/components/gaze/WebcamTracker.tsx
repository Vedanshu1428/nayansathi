"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { getFaceLandmarker, extractEyeFeatures } from "@/lib/gaze/featureExtractor";
import { EyeFeatures, TrackingStatus, HeadAlignment } from "@/lib/gaze/types";
import { AlertCircle, RefreshCw, RotateCw } from "lucide-react";

interface WebcamTrackerProps {
  onFeaturesUpdate?: (features: EyeFeatures) => void;
  onStatusChange?: (status: TrackingStatus) => void;
  showPreview?: boolean;
  showDebugMesh?: boolean;
}

export default function WebcamTracker({
  onFeaturesUpdate,
  onStatusChange,
  showPreview = true,
  showDebugMesh = true,
}: WebcamTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Stable refs for callbacks — updated every render, never stale, never cause effect re-runs ──
  const onFeaturesUpdateRef = useRef(onFeaturesUpdate);
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onFeaturesUpdateRef.current = onFeaturesUpdate; });
  useEffect(() => { onStatusChangeRef.current = onStatusChange; });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStage, setLoadingStage] = useState<string>("Requesting camera access...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<TrackingStatus>("off");
  const [retryCount, setRetryCount] = useState<number>(0);
  const [alignment, setAlignment] = useState<HeadAlignment | null>(null);

  // updateStatus is stable — it never reads from props, only sets local state and calls ref
  const updateStatus = useCallback((newStatus: TrackingStatus) => {
    setCurrentStatus(newStatus);
    onStatusChangeRef.current?.(newStatus);
  }, []); // empty deps: never changes reference

  useEffect(() => {
    let isMounted = true;
    let localStream: MediaStream | null = null;

    async function initTracker() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // ── Step 1: Request webcam stream with progressive constraint fallbacks ──
        setLoadingStage("Requesting camera access...");

        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Webcam access is not supported by this browser. Please use Chrome, Edge, or Firefox.");
        }

        // Try ideal explicit constraints first, with graceful fallbacks
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
            },
            audio: false,
          });
        } catch (firstErr) {
          console.warn("Explicit camera constraints failed, attempting fallback resolution:", firstErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user" },
              audio: false,
            });
          } catch (secondErr) {
            console.warn("User facing mode failed, attempting basic video fallback:", secondErr);
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream = stream;
        streamRef.current = stream;

        // Attach stream to video element immediately
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn("Video play error (handled):", playErr);
          }
        }

        // Camera stream is live!
        setIsLoading(false);
        updateStatus("ready");

        // ── Step 2: Initialize MediaPipe in background ──
        setLoadingStage("Loading AI eye-tracking model...");

        let landmarker: Awaited<ReturnType<typeof getFaceLandmarker>> | null = null;
        try {
          landmarker = await getFaceLandmarker();
        } catch (mpErr) {
          console.warn("MediaPipe model loading deferred/failed:", mpErr);
          return;
        }

        if (!isMounted) return;

        // ── Step 3: Run real-time detection loop (30 FPS capped) ──
        let lastProcessTime = 0;
        let isProcessing = false;
        const MIN_FRAME_INTERVAL_MS = 33; // 30 FPS cap keeps main thread and compositor responsive

        const processFrame = () => {
          if (!isMounted) return;

          // Request next animation frame immediately
          animationFrameId.current = requestAnimationFrame(processFrame);

          const now = performance.now();
          if (now - lastProcessTime < MIN_FRAME_INTERVAL_MS) {
            return;
          }

          const video = videoRef.current;
          const canvas = canvasRef.current;

          // Strict readiness checks: readyState >= 2 (HAVE_CURRENT_DATA) AND videoWidth > 0
          // Prevents 0x0 tensor / NaN division crashes!
          if (
            !video ||
            video.readyState < 2 ||
            video.paused ||
            video.ended ||
            video.videoWidth === 0 ||
            video.videoHeight === 0 ||
            isProcessing ||
            !landmarker
          ) {
            return;
          }

          isProcessing = true;
          lastProcessTime = now;

          try {
            const results = landmarker.detectForVideo(video, now);

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
              const landmarks = results.faceLandmarks[0];
              // Pass faceBlendshapes categories if enabled and returned
              const blendshapeCategories =
                results.faceBlendshapes && results.faceBlendshapes.length > 0
                  ? results.faceBlendshapes[0].categories
                  : undefined;
              const features = extractEyeFeatures(landmarks, now, blendshapeCategories);

              updateStatus(features.status);
              if (features.headAlignment) {
                setAlignment(features.headAlignment);
              }
              onFeaturesUpdateRef.current?.(features);

              // Optional debug mesh overlay
              if (showDebugMesh && canvas) {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  // Synchronize internal canvas resolution to actual video dimensions
                  if (
                    video.videoWidth > 0 &&
                    (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)
                  ) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                  }

                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  const w = canvas.width;
                  const h = canvas.height;

                  // 1. Draw Eye Contours (Teal)
                  ctx.strokeStyle = "#0D9488";
                  ctx.lineWidth = 2;

                  // Left eye contour: 33 -> 159 -> 133 -> 145 -> 33
                  ctx.beginPath();
                  ctx.moveTo(landmarks[33].x * w, landmarks[33].y * h);
                  ctx.lineTo(landmarks[159].x * w, landmarks[159].y * h);
                  ctx.lineTo(landmarks[133].x * w, landmarks[133].y * h);
                  ctx.lineTo(landmarks[145].x * w, landmarks[145].y * h);
                  ctx.closePath();
                  ctx.stroke();

                  // Right eye contour: 362 -> 386 -> 263 -> 374 -> 362
                  ctx.beginPath();
                  ctx.moveTo(landmarks[362].x * w, landmarks[362].y * h);
                  ctx.lineTo(landmarks[386].x * w, landmarks[386].y * h);
                  ctx.lineTo(landmarks[263].x * w, landmarks[263].y * h);
                  ctx.lineTo(landmarks[374].x * w, landmarks[374].y * h);
                  ctx.closePath();
                  ctx.stroke();

                  // 2. Draw Eye Landmark dots
                  ctx.fillStyle = "#14B8A6";
                  for (const idx of [33, 133, 159, 145, 263, 362, 386, 374]) {
                    const pt = landmarks[idx];
                    ctx.beginPath();
                    ctx.arc(pt.x * w, pt.y * h, 2, 0, 2 * Math.PI);
                    ctx.fill();
                  }

                  // 3. Draw Iris Centers (Glowing Red with crosshairs)
                  for (const idx of [468, 473]) {
                    const pt = landmarks[idx];
                    ctx.strokeStyle = "#EF4444";
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(pt.x * w, pt.y * h, 6, 0, 2 * Math.PI);
                    ctx.stroke();

                    ctx.fillStyle = "#F87171";
                    ctx.beginPath();
                    ctx.arc(pt.x * w, pt.y * h, 3, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(pt.x * w - 8, pt.y * h);
                    ctx.lineTo(pt.x * w + 8, pt.y * h);
                    ctx.moveTo(pt.x * w, pt.y * h - 8);
                    ctx.lineTo(pt.x * w + 8, pt.y * h);
                    ctx.stroke();
                  }

                  // 4. Live Eye Position Data Strip inside canvas
                  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
                  ctx.fillRect(8, 8, 170, 26);
                  ctx.fillStyle = "#FACC15";
                  ctx.font = "bold 11px monospace";
                  const lIris = Math.round(features.leftIrisRatioX * 100);
                  const rIris = Math.round(features.rightIrisRatioX * 100);
                  ctx.fillText(
                    `Iris L:${isNaN(lIris) ? "--" : lIris}% R:${isNaN(rIris) ? "--" : rIris}%`,
                    14,
                    25
                  );
                }
              } else if (canvas) {
                const ctx = canvas.getContext("2d");
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
              }
            } else {
              const emptyFeatures = extractEyeFeatures(null, now);
              updateStatus("no_face");
              if (emptyFeatures.headAlignment) {
                setAlignment(emptyFeatures.headAlignment);
              }
              onFeaturesUpdateRef.current?.(emptyFeatures);
            }
          } catch (detectErr) {
            console.error("Frame processing error:", detectErr);
          } finally {
            isProcessing = false;
          }
        };

        animationFrameId.current = requestAnimationFrame(processFrame);
      } catch (err: unknown) {
        if (!isMounted) return;
        setIsLoading(false);

        let userMsg = "Failed to access webcam. Please check browser camera permissions.";
        if (err instanceof Error) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            userMsg = "Camera permission denied. Please allow camera access in your browser address bar to enable gaze tracking.";
          } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
            userMsg = "Webcam is currently in use by another application. Please close other camera apps and retry.";
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            userMsg = "No webcam detected. Please connect a webcam and retry.";
          } else {
            userMsg = err.message;
          }
        }

        setErrorMessage(userMsg);
        updateStatus("error");
      }
    }

    initTracker();

    // StrictMode-safe component unmount cleanup
    const currentVideoEl = videoRef.current;
    return () => {
      isMounted = false;
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (currentVideoEl) {
        currentVideoEl.srcObject = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDebugMesh, retryCount]);

  return (
    <div
      className={
        showPreview
          ? "relative rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-900 overflow-hidden shadow-xl transition-all flex flex-col"
          : "fixed -top-96 -left-96 w-1 h-1 opacity-0 pointer-events-none"
      }
      style={showPreview ? { width: 240 } : undefined}
    >
      <div className="relative w-full" style={showPreview ? { height: 180 } : undefined}>
        {/* Video element — mirrored with scaleX(-1) to match coordinate system */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          controls={false}
          onLoadedMetadata={() => {
            videoRef.current?.play().catch(() => {});
          }}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Debug Canvas overlay — also mirrored with scaleX(-1) */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Live Face Guide Oval */}
        {!isLoading && !errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div
              className={`w-[124px] h-[148px] rounded-[50%] border-2 transition-all duration-200 flex flex-col items-center justify-start pt-1.5 ${
                alignment?.isOptimal
                  ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.5)]"
                  : alignment?.distanceStatus.includes("Too Close") || alignment?.distanceStatus.includes("Too Far")
                  ? "border-amber-400 bg-amber-500/10 shadow-[0_0_14px_rgba(245,158,11,0.4)]"
                  : alignment?.centerStatus !== "Centered"
                  ? "border-rose-500 bg-rose-500/10 shadow-[0_0_14px_rgba(239,68,68,0.4)]"
                  : "border-slate-400/40 bg-slate-900/10"
              }`}
            >
              <span
                className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-tight uppercase shadow ${
                  alignment?.isOptimal
                    ? "bg-emerald-600 text-white"
                    : alignment?.distanceStatus.includes("Too Close") || alignment?.distanceStatus.includes("Too Far")
                    ? "bg-amber-600 text-white"
                    : "bg-rose-600 text-white"
                }`}
              >
                {alignment?.guidanceMessage || "Align Face"}
              </span>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/85 flex flex-col items-center justify-center p-3 text-center z-20">
            <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mb-2" />
            <span className="text-[11px] font-bold text-slate-200 leading-tight">{loadingStage}</span>
            <span className="text-[9px] text-slate-400 mt-1">100% In-Browser · Privacy Protected</span>
          </div>
        )}

        {/* Error state with retry button */}
        {errorMessage && (
          <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center p-3 text-center z-20">
            <AlertCircle className="w-5 h-5 text-red-400 mb-1" />
            <span className="text-[11px] font-bold text-red-200">Camera Access Error</span>
            <p className="text-[9px] text-red-300 mt-1 leading-tight">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="mt-2 px-2.5 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry Camera</span>
            </button>
          </div>
        )}

        {/* Status indicator pill */}
        {!isLoading && !errorMessage && (
          <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 backdrop-blur text-white flex items-center gap-1.5 z-10">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                currentStatus === "ready"
                  ? "bg-emerald-400 animate-pulse"
                  : currentStatus === "blink_ignored"
                  ? "bg-amber-400"
                  : currentStatus === "no_face"
                  ? "bg-orange-400"
                  : "bg-red-400"
              }`}
            />
            <span>
              {currentStatus === "ready"
                ? "Face Detected"
                : currentStatus === "blink_ignored"
                ? "Blink Ignored"
                : currentStatus === "no_face"
                ? "No Face"
                : currentStatus === "error"
                ? "Error"
                : "Starting..."}
            </span>
          </div>
        )}

        {/* LIVE indicator */}
        {!isLoading && !errorMessage && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white z-10 tracking-wider">
            LIVE
          </div>
        )}
      </div>

      {/* Compact Distance / Center Indicator Bar below video */}
      {showPreview && !isLoading && !errorMessage && (
        <div className="w-full bg-slate-950 border-t border-slate-800 px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-slate-300">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                alignment?.distanceStatus.includes("Good")
                  ? "bg-emerald-400"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            <span>
              {alignment?.distanceStatus.includes("Good")
                ? "Dist: Optimal (~50cm)"
                : alignment?.distanceStatus.split("—")[0].trim() || "Distance Checking"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                alignment?.centerStatus === "Centered" ? "bg-emerald-400" : "bg-rose-400 animate-pulse"
              }`}
            />
            <span>{alignment?.centerStatus || "Centering"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
