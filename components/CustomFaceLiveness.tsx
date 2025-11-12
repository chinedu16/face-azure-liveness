"use client";

import React, { useEffect, useRef, useState } from "react";
// keep the web component import so the custom element is defined
import "@azure/ai-vision-face-ui";
import { FaceLivenessDetector, LivenessDetectionError } from "@azure/ai-vision-face-ui";

import { SessionAuthorizationData, fetchTokenFromAPI, fetchSessionResultFromAPI } from "../face/utils";

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

const checkmarkCircleIcon = "CheckmarkCircle.png";
const dismissCircleIcon = "DismissCircle.png";

export default function CustomFaceLiveness({
  livenessOperationMode,
  file,
  setIsDetectLivenessWithVerify,
  fetchFailureCallback,
  setLivenessIcon,
  setRecognitionIcon,
  setLivenessText,
  setRecognitionText,
}: Props) {
  const [sessionData, setSessionData] = useState<SessionAuthorizationData | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const visibleRef = useRef<HTMLDivElement | null>(null);
  const webCompRef = useRef<FaceLivenessDetector | null>(null);


  // Only run liveness when user clicks
  const startLiveness = async () => {
    setIsCapturing(true);
    setHasRun(false);
    setLoadingToken(true);
    setErrorMessage("");
    // Fetch session token on demand
  let localSessionData: SessionAuthorizationData | null = null;
    try {
      await fetchTokenFromAPI(
        livenessOperationMode,
        file,
        (data: SessionAuthorizationData) => { localSessionData = data; },
        setLoadingToken,
        setErrorMessage
      );
    } catch (err) {
      setIsCapturing(false);
      setLoadingToken(false);
      setErrorMessage("Failed to fetch session token");
      return;
    }
    setLoadingToken(false);
    if (!localSessionData) {
      setIsCapturing(false);
      setErrorMessage("No session data");
      return;
    }
    setSessionData(localSessionData);
    let faceLivenessDetector = webCompRef.current as FaceLivenessDetector | null;
    if (!faceLivenessDetector) {
      faceLivenessDetector = document.createElement("azure-ai-vision-face-ui") as FaceLivenessDetector;
      webCompRef.current = faceLivenessDetector;
      // Attach to visible container so user sees the video
      if (visibleRef.current) {
        visibleRef.current.appendChild(faceLivenessDetector);
      } else {
        document.body.appendChild(faceLivenessDetector);
      }
    }
    const action = (file !== undefined) ? "detectLivenessWithVerify" : "detectLiveness";
    if (localSessionData && (localSessionData as SessionAuthorizationData).authToken && (localSessionData as SessionAuthorizationData).sessionId) {
      const sessionInfo = localSessionData as SessionAuthorizationData;
      faceLivenessDetector.start(sessionInfo.authToken)
        .then(async () => {
          try {
            setIsDetectLivenessWithVerify(action === "detectLivenessWithVerify");
            const sessionResult = await fetchSessionResultFromAPI(action, sessionInfo.sessionId);
            // parse liveness
            const livenessStatus = sessionResult.results.attempts[0].result.livenessDecision;
            const livenessStatusCondition = livenessStatus === "realface";
            const livenessIcon = livenessStatusCondition ? checkmarkCircleIcon : dismissCircleIcon;
            const livenessText = livenessStatusCondition ? "Real Person" : "Spoof";
            setLivenessIcon && setLivenessIcon(livenessIcon);
            setLivenessText && setLivenessText(livenessText);
            // parse recognition if present
            if (action === "detectLivenessWithVerify") {
              const recognitionStatusCondition = sessionResult.results.attempts[0].result.verifyResult.isIdentical;
              const recognitionIcon = recognitionStatusCondition ? checkmarkCircleIcon : dismissCircleIcon;
              const recognitionText = recognitionStatusCondition ? "Same Person" : "Not the same person";
              setRecognitionIcon && setRecognitionIcon(recognitionIcon);
              setRecognitionText && setRecognitionText(recognitionText);
            }
            // Try to log video/images if possible
            if (faceLivenessDetector.shadowRoot) {
              const video = faceLivenessDetector.shadowRoot.querySelector('video');
              if (video && video.srcObject) {
                console.log('Video stream:', video.srcObject);
              }
            }
            console.log('Session result:', sessionResult);
          } catch (err) {
            const e = String(err);
            fetchFailureCallback && fetchFailureCallback(e);
          }
          setIsCapturing(false);
          setHasRun(true);
        })
        .catch((error) => {
          const errorData = error as LivenessDetectionError;
          const livenessIcon = dismissCircleIcon;
          const livenessText = (errorData && (errorData.livenessError as string)) || "Liveness error";
          setLivenessIcon && setLivenessIcon(livenessIcon);
          setLivenessText && setLivenessText(livenessText);
          if (action === "detectLivenessWithVerify") {
            const recognitionText = errorData.recognitionError || "Recognition error";
            const recognitionIcon = dismissCircleIcon;
            setRecognitionIcon && setRecognitionIcon(recognitionIcon);
            setRecognitionText && setRecognitionText(recognitionText);
          }
          setIsCapturing(false);
          setHasRun(true);
        });
    }
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (webCompRef.current && visibleRef.current && visibleRef.current.contains(webCompRef.current)) {
          visibleRef.current.removeChild(webCompRef.current);
        } else if (webCompRef.current && document.body.contains(webCompRef.current)) {
          document.body.removeChild(webCompRef.current);
        }
        webCompRef.current = null;
      } catch (err) {
        // ignore cleanup errors
      }
    };
  }, []);

  return (
    <div>
      <div style={{ padding: 12 }}>
        {!isCapturing && !hasRun && (
          <button onClick={startLiveness} style={{ padding: 12, fontSize: 18, background: '#036ac4', color: 'white', border: 'none', borderRadius: 6 }}>
            Start Liveness
          </button>
        )}
        {isCapturing && (
          <>
            <div>Capturing... Please follow the instructions.</div>
            <div ref={visibleRef} style={{ marginTop: 16 }} />
          </>
        )}
        {hasRun && !isCapturing && <div>Liveness session complete. Check console for video/images and result.</div>}
      </div>
    </div>
  );
}