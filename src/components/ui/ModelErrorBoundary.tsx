"use client";

import { Component, type ReactNode } from "react";

/** Keep a failed renderer/asset inside its viewport; parent navigation survives. */
export default class ModelErrorBoundary extends Component<{
  children: ReactNode;
  fallback: ReactNode;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
