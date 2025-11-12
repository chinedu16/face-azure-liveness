"use client";

import React, { useRef, useState, useEffect } from "react";
import { SessionAuthorizationData, fetchTokenFromAPI, fetchSessionResultFromAPI } from "../face/utils";

const checkmarkCircleIcon = "CheckmarkCircle.png";
const dismissCircleIcon = "DismissCircle.png";

type Props = {
  livenessOperationMode: "Passive" | "PassiveActive";
  file?: File;
  setIsDetectLivenessWithVerify: (res: Boolean) => void;
  fetchFailureCallback?: (error: string) => void;
  setLivenessIcon?: (img: string) => void;
  setRecognitionIcon?: (img: string) => void;
  setLivenessText?: (text: string) => void;
  setRecognitionText?: (text: string) => void;
};

export default function FullCustomLiveness({
  livenessOperationMode,
  file,
  setIsDetectLivenessWithVerify,
  fetchFailureCallback,
  setLivenessIcon,
  setRecognitionIcon,
  setLivenessText,
  setRecognitionText,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [livenessResult, setLivenessResult] = useState<string>("");
  const [recognitionResult, setRecognitionResult] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState("");

  // Start camera on mount
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError("Could not access camera: " + String(err));
      }
    }
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Capture image from video
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      setCapturedImage(dataUrl);
    }
  };

  // Start liveness session with captured image
  const handleStartLiveness = async () => {
    if (!capturedImage) {
      setError("Please capture an image first.");
      return;
    }
    setIsCapturing(true);
    setError("");
    setLivenessResult("");
    setRecognitionResult("");
    // Convert dataURL to File
    const blob = await (await fetch(capturedImage)).blob();
    const file = new File([blob], "capture.png", { type: "image/png" });
    try {
      let sessionData: SessionAuthorizationData | null = null;
      await fetchTokenFromAPI(
        livenessOperationMode,
        file,
        (data: SessionAuthorizationData) => { sessionData = data; },
        undefined,
        (msg) => {
          setError(msg);
          fetchFailureCallback?.(msg);
        }
      );
      if (!sessionData) {
        const error = "Failed to get session data";
        setError(error);
        fetchFailureCallback?.(error);
        setIsCapturing(false);
        return;
      }
      const action = file ? "detectLivenessWithVerify" : "detectLiveness";
      const result = await fetchSessionResultFromAPI(action, (sessionData as SessionAuthorizationData).sessionId);
      
      // Check if we have valid results
      if (!result.results || !result.results.attempts || result.results.attempts.length === 0) {
        const error = "Liveness session incomplete: No attempts found in results";
        setError(error);
        fetchFailureCallback?.(error);
        return;
      }

      const attempt = result.results.attempts[0];
      if (!attempt.result) {
        const error = "Liveness session incomplete: No result in attempt";
        setError(error);
        fetchFailureCallback?.(error);
        return;
      }

      // Parse liveness results
      const livenessStatus = attempt.result.livenessDecision;
      const livenessStatusCondition = livenessStatus === "realface";
      const livenessIcon = livenessStatusCondition ? checkmarkCircleIcon : dismissCircleIcon;
      const livenessText = livenessStatusCondition ? "Real Person" : "Spoof";
      
      setLivenessResult(livenessText);
      setLivenessIcon?.(livenessIcon);
      setLivenessText?.(livenessText);
      
      // Parse verification results if available
      if (attempt.result.verifyResult) {
        const recognitionStatusCondition = attempt.result.verifyResult.isIdentical;
        const recognitionIcon = recognitionStatusCondition ? checkmarkCircleIcon : dismissCircleIcon;
        const recognitionText = recognitionStatusCondition ? "Same Person" : "Not the same person";
        
        setRecognitionResult(recognitionText);
        setRecognitionIcon?.(recognitionIcon);
        setRecognitionText?.(recognitionText);
      }
      
      setIsDetectLivenessWithVerify(!!file);
    } catch (err) {
      setError("Liveness session failed: " + String(err));
    }
    setIsCapturing(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Full Custom Liveness Demo</h2>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div>
        <video ref={videoRef} autoPlay playsInline style={{ width: 320, height: 240, border: "1px solid #ccc" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={handleCapture} disabled={isCapturing} style={{ marginRight: 8 }}>
          Capture Image
        </button>
        <button onClick={handleStartLiveness} disabled={isCapturing || !capturedImage}>
          Start Liveness
        </button>
      </div>
      {capturedImage && (
        <div style={{ marginTop: 12 }}>
          <div>Captured Image:</div>
          <img src={capturedImage} alt="Captured" style={{ width: 160, border: "1px solid #ccc" }} />
        </div>
      )}
      {isCapturing && <div>Processing liveness session...</div>}
      {livenessResult && (
        <div style={{ marginTop: 12 }}>
          <img src={livenessResult === "Real Person" ? checkmarkCircleIcon : dismissCircleIcon} alt="Liveness" style={{ width: 32, verticalAlign: "middle" }} />
          <span style={{ marginLeft: 8 }}>{livenessResult}</span>
        </div>
      )}
      {recognitionResult && (
        <div style={{ marginTop: 12 }}>
          <span>Verification: {recognitionResult}</span>
        </div>
      )}
    </div>
  );
}
