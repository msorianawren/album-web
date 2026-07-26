"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";

type Point = { x: number; y: number; time: number };
type Transform = { scale: number; translate: { x: number; y: number } };
type GestureSession = {
  pointerId: number;
  pointerType: string;
  start: Point;
  last: Point;
  startScale: number;
  startTranslate: { x: number; y: number };
  pinchDistance: number;
  pinchAnchor: { x: number; y: number } | null;
  pinching: boolean;
};

const minimumScale = 1;
const maximumScale = 5;
const swipeDistance = 72;
const swipeVelocity = 0.45;
const closeDistance = 96;
const infoDistance = 72;
const tapDistance = 10;

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);
const distance = (first: Point, second: Point) => Math.hypot(second.x - first.x, second.y - first.y);

function midpoint(first: Point, second: Point) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function resist(value: number, limit: number) {
  if (Math.abs(value) <= limit) return value;
  return Math.sign(value) * (limit + (Math.abs(value) - limit) * 0.32);
}

export function resolveViewerSwipe({
  deltaX,
  deltaY,
  velocityX,
  pointerType,
}: {
  deltaX: number;
  deltaY: number;
  velocityX: number;
  pointerType: string;
}) {
  const horizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
  if (horizontal && (Math.abs(deltaX) >= swipeDistance || (Math.abs(deltaX) >= 32 && Math.abs(velocityX) >= swipeVelocity))) {
    return deltaX < 0 ? "next" : "previous";
  }
  if (pointerType === "touch" && deltaY >= closeDistance && Math.abs(deltaY) > Math.abs(deltaX) * 1.25) return "close";
  if (pointerType === "touch" && deltaY <= -infoDistance && Math.abs(deltaY) > Math.abs(deltaX) * 1.25) return "info";
  return "none";
}

export function useViewerGestures({
  stageRef,
  scale,
  translate,
  onTransform,
  onNext,
  onPrevious,
  onClose,
  onOpenInfo,
  onToggleFullscreen,
  onInteraction,
  onZoom,
}: {
  stageRef: MutableRefObject<HTMLDivElement | null>;
  scale: number;
  translate: { x: number; y: number };
  onTransform: (transform: Transform) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  onOpenInfo: () => void;
  onToggleFullscreen: () => void;
  onInteraction: () => void;
  onZoom: () => void;
}) {
  const pointers = useRef(new Map<number, Point>());
  const session = useRef<GestureSession | null>(null);
  const transform = useRef<Transform>({ scale, translate });
  const pendingTransform = useRef<Transform | null>(null);
  const transformFrame = useRef<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    transform.current = { scale, translate };
  }, [scale, translate]);

  useEffect(() => () => {
    if (transformFrame.current) window.cancelAnimationFrame(transformFrame.current);
  }, []);

  const flushTransform = useCallback(() => {
    if (transformFrame.current) {
      window.cancelAnimationFrame(transformFrame.current);
      transformFrame.current = null;
    }
    const pending = pendingTransform.current;
    pendingTransform.current = null;
    if (pending) onTransform(pending);
  }, [onTransform]);

  const scheduleTransform = useCallback((next: Transform) => {
    transform.current = next;
    pendingTransform.current = next;
    if (transformFrame.current) return;
    transformFrame.current = window.requestAnimationFrame(() => {
      transformFrame.current = null;
      const pending = pendingTransform.current;
      pendingTransform.current = null;
      if (pending) onTransform(pending);
    });
  }, [onTransform]);

  const constrain = useCallback((value: { x: number; y: number }, targetScale: number, resistance = false) => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds || targetScale <= minimumScale) return { x: 0, y: 0 };
    const maxX = Math.min((bounds.width * (targetScale - 1)) / 2, Math.max(0, bounds.width / 2 - 24));
    const maxY = Math.min((bounds.height * (targetScale - 1)) / 2, Math.max(0, bounds.height / 2 - 24));
    return resistance
      ? { x: resist(value.x, maxX), y: resist(value.y, maxY) }
      : { x: clamp(value.x, -maxX, maxX), y: clamp(value.y, -maxY, maxY) };
  }, [stageRef]);

  const applyTransform = useCallback((nextScale: number, nextTranslate: { x: number; y: number }) => {
    const next = { scale: clamp(nextScale, minimumScale, maximumScale), translate: nextTranslate };
    scheduleTransform(next);
  }, [scheduleTransform]);

  const zoomAt = useCallback((nextScale: number, anchor?: { x: number; y: number }, base = transform.current) => {
    const bounds = stageRef.current?.getBoundingClientRect();
    const safeScale = clamp(nextScale, minimumScale, maximumScale);
    if (!bounds || safeScale === minimumScale) {
      applyTransform(safeScale, { x: 0, y: 0 });
      return;
    }
    const resolvedAnchor = anchor ?? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    const fromCenter = { x: resolvedAnchor.x - bounds.left - bounds.width / 2, y: resolvedAnchor.y - bounds.top - bounds.height / 2 };
    const ratio = safeScale / base.scale;
    applyTransform(safeScale, constrain({
      x: fromCenter.x - (fromCenter.x - base.translate.x) * ratio,
      y: fromCenter.y - (fromCenter.y - base.translate.y) * ratio,
    }, safeScale));
  }, [applyTransform, constrain, stageRef]);

  const startSinglePointerSession = useCallback((pointerId: number, point: Point, pointerType: string) => {
    session.current = {
      pointerId,
      pointerType,
      start: point,
      last: point,
      startScale: transform.current.scale,
      startTranslate: transform.current.translate,
      pinchDistance: 0,
      pinchAnchor: null,
      pinching: false,
    };
  }, []);

  const beginPinch = useCallback(() => {
    const points = [...pointers.current.values()];
    if (points.length < 2) return;
    const midpointPoint = midpoint(points[0], points[1]);
    const anchor = { ...midpointPoint, time: performance.now() };
    session.current = {
      pointerId: -1,
      pointerType: "touch",
      start: anchor,
      last: anchor,
      startScale: transform.current.scale,
      startTranslate: transform.current.translate,
      pinchDistance: distance(points[0], points[1]),
      pinchAnchor: anchor,
      pinching: true,
    };
    setIsPanning(true);
    onZoom();
  }, [onZoom]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLVideoElement) return;
    const point = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
    onInteraction();
    if (pointers.current.size === 1) startSinglePointerSession(event.pointerId, point, event.pointerType);
    else beginPinch();
  }, [beginPinch, onInteraction, startSinglePointerSession]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const current = pointers.current.get(event.pointerId);
    if (!current) return;
    const point = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    pointers.current.set(event.pointerId, point);
    const active = session.current;
    if (!active) return;

    if (pointers.current.size >= 2 && active.pinching && active.pinchAnchor) {
      const points = [...pointers.current.values()];
      const nextDistance = distance(points[0], points[1]);
      if (active.pinchDistance > 0) {
        event.preventDefault();
        const nextScale = active.startScale * (nextDistance / active.pinchDistance);
        zoomAt(nextScale, active.pinchAnchor, { scale: active.startScale, translate: active.startTranslate });
      }
      return;
    }

    if (active.pointerId !== event.pointerId || active.pinching) return;
    const deltaX = point.x - active.start.x;
    const deltaY = point.y - active.start.y;
    active.last = point;
    if (active.startScale > minimumScale) {
      setIsPanning(true);
      applyTransform(active.startScale, constrain({
        x: active.startTranslate.x + deltaX,
        y: active.startTranslate.y + deltaY,
      }, active.startScale, true));
      return;
    }

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) > tapDistance) {
      const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
      applyTransform(minimumScale, horizontal ? { x: deltaX * 0.28, y: 0 } : { x: 0, y: deltaY * 0.18 });
    }
  }, [applyTransform, constrain, zoomAt]);

  const resolveTap = useCallback(() => {
    onToggleFullscreen();
  }, [onToggleFullscreen]);

  const finishPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    flushTransform();
    const point = pointers.current.get(event.pointerId);
    const active = session.current;
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    if (!point || !active) {
      setIsPanning(false);
      return;
    }

    if (active.pinching) {
      const remaining = [...pointers.current.entries()];
      if (remaining.length === 1) startSinglePointerSession(remaining[0][0], remaining[0][1], active.pointerType);
      else {
        session.current = null;
        setIsPanning(false);
      }
      applyTransform(transform.current.scale, constrain(transform.current.translate, transform.current.scale));
      return;
    }

    const deltaX = point.x - active.start.x;
    const deltaY = point.y - active.start.y;
    const duration = Math.max(1, point.time - active.last.time);
    const velocityX = (point.x - active.last.x) / duration;
    const moved = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    session.current = null;
    setIsPanning(false);

    if (active.startScale > minimumScale) {
      applyTransform(transform.current.scale, constrain(transform.current.translate, transform.current.scale));
      return;
    }

    if (transform.current.scale !== minimumScale || transform.current.translate.x !== 0 || transform.current.translate.y !== 0) {
      applyTransform(minimumScale, { x: 0, y: 0 });
    }
    if (cancelled) return;
    if (moved <= tapDistance && point.time - active.start.time < 500) {
      resolveTap();
      return;
    }

    const intent = resolveViewerSwipe({ deltaX, deltaY, velocityX, pointerType: active.pointerType });
    if (intent === "next") onNext();
    if (intent === "previous") onPrevious();
    if (intent === "close") onClose();
    if (intent === "info") onOpenInfo();
  }, [applyTransform, constrain, flushTransform, onClose, onNext, onOpenInfo, onPrevious, resolveTap, startSinglePointerSession]);

  return {
    isPanning,
    zoomAt,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => finishPointer(event),
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => finishPointer(event, true),
  };
}
