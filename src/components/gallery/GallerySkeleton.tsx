"use client";

import React from "react";
import { LoadingGrid } from "@/components/ui";

export function GallerySkeleton({ count = 12 }: { count?: number }) {
  return <LoadingGrid count={count} />;
}
