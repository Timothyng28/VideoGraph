/**
 * VideoControllerContext.tsx
 *
 * Context provider for VideoController that persists across route changes.
 * This ensures SSE connections remain alive when navigating between pages.
 */

import React, { createContext, useContext } from "react";
import { VideoControllerState } from "../controllers/VideoController";

interface VideoControllerContextValue extends VideoControllerState {
  // All VideoControllerState properties are available
}

const VideoControllerContext =
  createContext<VideoControllerContextValue | null>(null);

export const useVideoControllerContext = () => {
  const context = useContext(VideoControllerContext);
  if (!context) {
    throw new Error(
      "useVideoControllerContext must be used within VideoControllerProvider"
    );
  }
  return context;
};

interface VideoControllerProviderProps {
  children: (state: VideoControllerState) => React.ReactNode;
  initialTopic: string;
  initialSession?: import("../types/VideoConfig").VideoSession;
  onError?: (error: string) => void;
}

/**
 * Provider that wraps VideoController and provides its state via context
 */
export const VideoControllerProvider: React.FC<
  VideoControllerProviderProps
> = ({ children, initialTopic, initialSession, onError }) => {
  const { VideoController } = require("../controllers/VideoController");

  return (
    <VideoController
      initialTopic={initialTopic}
      initialSession={initialSession}
      onError={onError}
    >
      {(state) => {
        return (
          <VideoControllerContext.Provider value={state}>
            {children(state)}
          </VideoControllerContext.Provider>
        );
      }}
    </VideoController>
  );
};
