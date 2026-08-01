"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AdminStory } from "@/lib/types";

export function StoryPlayer({
  items,
  initialIndex,
  onClose,
}: {
  items: AdminStory[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentStory = items[currentIndex];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, onClose]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          setIsMuted(true);
          videoRef.current?.play().catch(console.error);
        });
      }
    }
  }, [currentIndex]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(console.error);
      else videoRef.current.pause();
    }
  }, [isPlaying]);

  function next() {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsPlaying(true);
    } else {
      onClose(); // Close if it's the last story
    }
  }

  function prev() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsPlaying(true);
    }
  }

  function togglePlay() {
    setIsPlaying((prev) => !prev);
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl"
    >
      <button
        onClick={onClose}
        className="absolute right-6 top-6 z-50 rounded-full bg-white/10 p-3 text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-110"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Main Player Container - 9:16 aspect ratio */}
      <div className="relative flex h-full max-h-[90vh] w-full max-w-[50.625vh] flex-col overflow-hidden rounded-[2rem] bg-zinc-900 shadow-2xl">
        <video
          ref={videoRef}
          src={currentStory.video_url}
          className="h-full w-full object-cover cursor-pointer"
          muted={isMuted}
          playsInline
          onClick={togglePlay}
          onEnded={next}
        />

        {/* Gradient Overlay for Text */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Controls Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            {/* Progress Bars (Simple Implementation) */}
            <div className="flex w-full gap-1">
              {items.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full ${
                    idx < currentIndex
                      ? "bg-white"
                      : idx === currentIndex
                      ? "bg-white/80"
                      : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Bottom Info */}
          <div className="flex w-full items-end justify-between pointer-events-auto">
            <div className="flex-1 pr-4">
              {currentStory.caption && (
                <p className="text-base text-white drop-shadow-md">
                  {currentStory.caption}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-4">
              <button
                onClick={toggleMute}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Play/Pause indicator animation (centered) */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-6 text-white backdrop-blur-md pointer-events-none"
            >
              <Play className="h-12 w-12 ml-2" fill="currentColor" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons (Desktop) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-8">
        <button
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          disabled={currentIndex === 0}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-0 hover:scale-110"
        >
          <ChevronLeft className="h-8 w-8 pr-1" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-110"
        >
          <ChevronRight className="h-8 w-8 pl-1" />
        </button>
      </div>
    </motion.div>
  );
}
