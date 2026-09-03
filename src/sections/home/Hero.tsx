export default function Hero() {
  return (
    <section data-header-theme="dark" className="hero">
      <video
        className="hero__media"
        src="/videos/hero-placeholder.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
    </section>
  );
}
