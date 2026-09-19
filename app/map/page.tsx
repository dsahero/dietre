"use client";

import dynamic from "next/dynamic";

const MapExplorer = dynamic(
  () => import("@/frontend/components/map-view/MapExplorer").then((mod) => mod.MapExplorer),
  { ssr: false }
);

export default function MapPage() {
  return <MapExplorer />;
}
