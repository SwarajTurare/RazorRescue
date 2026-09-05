import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function KineticBackground({
  audioRef = null,
  intensity = 1,
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.to('.rr-orb-a', {
        x: '12vw',
        y: '-5vh',
        scale: 1.08,
        duration: 16,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('.rr-orb-b', {
        x: '-10vw',
        y: '8vh',
        scale: 1.12,
        duration: 20,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2,
      });

      gsap.to('.rr-orb-c', {
        x: '7vw',
        y: '10vh',
        scale: 1.08,
        duration: 24,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 4,
      });
    }, root);

    let audioCtx;
    let analyser;
    let data;
    let raf;

    const bindAudio = () => {
      if (
        !audioRef?.current ||
        analyser ||
        !audioRef.current.src
      ) {
        return;
      }

      try {
        audioCtx = new AudioContext();

        const source =
          audioCtx.createMediaElementSource(
            audioRef.current
          );

        analyser = audioCtx.createAnalyser();

        analyser.fftSize = 64;

        data = new Uint8Array(
          analyser.frequencyBinCount
        );

        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        const tick = () => {
          analyser.getByteFrequencyData(data);

          const average =
            data.reduce((sum, value) => sum + value, 0) /
            data.length /
            255;

          const pulse =
            0.92 + average * 0.55 * intensity;

          root.style.setProperty(
            '--rr-audio-pulse',
            pulse
          );

          raf = requestAnimationFrame(tick);
        };

        tick();
      } catch {
        // Audio-reactive visuals are optional.
      }
    };

    bindAudio();

    return () => {
      cancelAnimationFrame(raf);
      audioCtx?.close();
      ctx.revert();
    };
  }, [audioRef, intensity]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="absolute inset-0 z-0 overflow-hidden bg-[#0E0B08]"
      style={{
        '--rr-audio-pulse': 1,
      }}
    >

      {/* Subtle grid */}
      <div className="absolute inset-0 rr-grid opacity-[0.16]" />

      {/* Soft amber light */}
      <div
        className="rr-orb-a absolute -left-[18vw] top-[5vh] h-[45vw] w-[45vw] rounded-full bg-[#D9A353]/[0.09] blur-[100px]"
        style={{
          transform:
            'scale(var(--rr-audio-pulse))',
        }}
      />

      {/* Warm secondary glow */}
      <div className="rr-orb-b absolute -right-[20vw] top-[12vh] h-[40vw] w-[40vw] rounded-full bg-[#B87436]/[0.07] blur-[110px]" />

      {/* Very subtle cool shadow */}
      <div className="rr-orb-c absolute bottom-[-22vw] left-[35vw] h-[42vw] w-[42vw] rounded-full bg-[#191D2B]/[0.32] blur-[120px]" />

      {/* Center darkness */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(14,11,8,.48)_65%,#0E0B08_100%)]" />

      {/* Top cinematic vignette */}
      <div className="absolute inset-x-0 top-0 h-[35vh] bg-gradient-to-b from-black/30 to-transparent" />

      {/* Bottom cinematic vignette */}
      <div className="absolute inset-x-0 bottom-0 h-[30vh] bg-gradient-to-t from-[#0E0B08] to-transparent" />

      {/* Very subtle golden horizon */}
      <div className="absolute left-[35%] top-[30%] h-[28vh] w-[28vw] rounded-full bg-[#D9A353]/[0.025] blur-[120px]" />
    </div>
  );
}