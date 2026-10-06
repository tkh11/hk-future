import { BlockSkeleton } from "@/components/ui/DeferredBlock";

export default function Loading() {
  return <main aria-busy="true"><BlockSkeleton kind="hero" /><BlockSkeleton kind="solutions" /></main>;
}
