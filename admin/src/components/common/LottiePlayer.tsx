import React, { Suspense, useEffect, useRef, useState } from "react";

const LottieReact = React.lazy(() => import("lottie-react"));

export type LottiePlayerProps = {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
  pauseWhenHidden?: boolean;
};

export function LottiePlayer({
  src,
  loop = true,
  autoplay = true,
  className,
  style,
  onComplete,
  pauseWhenHidden = false,
}: LottiePlayerProps) {
  const [mounted, setMounted] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<any>(null);

  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const actualAutoplay = prefersReduced ? false : autoplay;
  const actualLoop = prefersReduced ? false : loop;

  useEffect(() => {
    setMounted(true);
    fetch(src)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error("Failed to load Lottie animation", src, err));
  }, [src]);

  useEffect(() => {
    if (!pauseWhenHidden || !mounted || prefersReduced) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (lottieRef.current) {
          if (entry.isIntersecting && actualAutoplay) {
            lottieRef.current.play();
          } else {
            lottieRef.current.pause();
          }
        }
      },
      { threshold: 0.1 },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pauseWhenHidden, mounted, actualAutoplay, prefersReduced]);

  if (!mounted || !animationData) {
    return <div className={className} style={style} aria-hidden="true" role="presentation" />;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      aria-hidden="true"
      role="presentation"
    >
      <Suspense fallback={null}>
        <LottieReact
          lottieRef={lottieRef}
          animationData={animationData}
          loop={actualLoop}
          autoplay={actualAutoplay}
          onComplete={onComplete}
          renderer="svg"
          style={{ width: "100%", height: "100%" }}
        />
      </Suspense>
    </div>
  );
}
