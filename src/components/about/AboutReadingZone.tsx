"use client";

import React, { type ElementType, type ComponentPropsWithoutRef } from "react";
import { AboutVeil } from "./AboutVeil";
import { type VeilVariant } from "@/lib/about/create-about-veil-tokens";

export type AboutReadingZoneOwnProps<T extends ElementType> = {
  variant?: VeilVariant;
  as?: T;
  enabled?: boolean;
  tokens?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
};

export type AboutReadingZoneProps<T extends ElementType> = AboutReadingZoneOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof AboutReadingZoneOwnProps<T>>;

export function AboutReadingZone<T extends ElementType = "div">({
  as,
  enabled = true,
  tokens = {},
  variant,
  className = "",
  children,
  ...props
}: AboutReadingZoneProps<T>) {
  const Component = as || "div";

  if (!enabled) {
    return React.createElement(Component, { className, ...(props as ComponentPropsWithoutRef<T>) }, children);
  }

  return React.createElement(
    Component,
    {
      className: `relative z-10 isolate ${className}`,
      style: {
        ...tokens,
        color: "var(--about-text-primary)"
      },
      ...(props as ComponentPropsWithoutRef<T>)
    },
    <AboutVeil tokens={tokens} />,
    <div className="relative z-10">{children}</div>
  );
}
