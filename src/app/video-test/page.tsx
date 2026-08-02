"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_URL = "https://media.orianawren.com/landing/stories/a92eff46-ebe1-4e45-b593-769c0f3272b6/video.mp4";

// Test 1: bare <video> — no dialog, no crossorigin
function BareVideo() {
  return (
    <section style={{ padding: "1rem", border: "2px solid green" }}>
      <h2>Test 1: Bare &lt;video&gt; (no dialog)</h2>
      <video src={VIDEO_URL} controls playsInline preload="auto" style={{ width: "100%", maxWidth: 360 }} />
      <p>Expected: should play fine on all browsers</p>
    </section>
  );
}

// Test 2: <video> inside dialog via showModal — same as StoryPlayer
function DialogVideo() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);

  const openDialog = () => {
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const video = videoRef.current;
    if (video) {
      video.load();
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => {});
      });
    }
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);

  return (
    <section style={{ padding: "1rem", border: "2px solid blue" }}>
      <h2>Test 2: Video inside &lt;dialog showModal()&gt;</h2>
      <button onClick={openDialog} style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}>Open dialog</button>
      {open && (
        <dialog ref={dialogRef} style={{ width: "90vw", maxWidth: 400, padding: "1rem" }}>
          <button onClick={() => { dialogRef.current?.close(); setOpen(false); }}>Close</button>
          <video ref={videoRef} src={VIDEO_URL} controls playsInline preload="auto"
            style={{ width: "100%", marginTop: "0.5rem" }} />
          <p>Did video load and play?</p>
        </dialog>
      )}
    </section>
  );
}

// Test 3: dialog + crossOrigin="anonymous"
function DialogVideoCORS() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);

  const openDialog = () => setOpen(true);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const video = videoRef.current;
    if (video) {
      video.load();
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => {});
      });
    }
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);

  return (
    <section style={{ padding: "1rem", border: "2px solid orange" }}>
      <h2>Test 3: dialog + crossOrigin=&quot;anonymous&quot;</h2>
      <button onClick={openDialog} style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}>Open dialog</button>
      {open && (
        <dialog ref={dialogRef} style={{ width: "90vw", maxWidth: 400, padding: "1rem" }}>
          <button onClick={() => { dialogRef.current?.close(); setOpen(false); }}>Close</button>
          <video ref={videoRef} src={VIDEO_URL} controls playsInline preload="auto"
            crossOrigin="anonymous" style={{ width: "100%", marginTop: "0.5rem" }} />
          <p>Did video load and play?</p>
        </dialog>
      )}
    </section>
  );
}

// Test 4: dialog — set src imperatively AFTER showModal
function DialogVideoImperative() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);

  const openDialog = () => setOpen(true);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Set src AFTER showModal — Safari iOS may need this
    setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      video.src = VIDEO_URL;
      video.load();
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => {});
      });
    }, 50);
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);

  return (
    <section style={{ padding: "1rem", border: "2px solid red" }}>
      <h2>Test 4: dialog + src set imperatively after showModal()</h2>
      <button onClick={openDialog} style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}>Open dialog</button>
      {open && (
        <dialog ref={dialogRef} style={{ width: "90vw", maxWidth: 400, padding: "1rem" }}>
          <button onClick={() => { dialogRef.current?.close(); setOpen(false); }}>Close</button>
          {/* No src here - set imperatively above */}
          <video ref={videoRef} controls playsInline preload="auto"
            style={{ width: "100%", marginTop: "0.5rem" }} />
          <p>Did video load and play?</p>
        </dialog>
      )}
    </section>
  );
}

export default function VideoTestPage() {
  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 600, margin: "0 auto", padding: "1rem" }}>
      <h1>Safari iOS Video Debug</h1>
      <p>Tap each button and report which tests work ✅ or fail ❌</p>
      <BareVideo />
      <br />
      <DialogVideo />
      <br />
      <DialogVideoCORS />
      <br />
      <DialogVideoImperative />
    </main>
  );
}
