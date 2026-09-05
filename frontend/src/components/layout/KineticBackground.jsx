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
      /* ==========================================
         AMBER BLOB
      =========================================== */

      gsap.to('.rr-orb-a', {
        x: '14vw',
        y: '-7vh',
        scale: 1.12,
        duration: 15,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      /* ==========================================
         COPPER BLOB
      =========================================== */

      gsap.to('.rr-orb-b', {
        x: '-13vw',
        y: '9vh',
        scale: 1.15,
        duration: 19,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1.5,
      });

      /* ==========================================
         GOLD BLOB
      =========================================== */

      gsap.to('.rr-orb-c', {
        x: '9vw',
        y: '12vh',
        scale: 1.18,
        duration: 22,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 3,
      });

      /* ==========================================
         DEEP BLUE SHADOW
      =========================================== */

      gsap.to('.rr-orb-d', {
        x: '-7vw',
        y: '-8vh',
        scale: 1.1,
        duration: 25,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 4,
      });

      /* ==========================================
         MOVING LIGHT SHEEN
      =========================================== */

      gsap.to('.rr-sheen', {
        x: '22vw',
        y: '-4vh',
        scale: 1.15,
        duration: 17,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      /* ==========================================
         SECONDARY SHEEN
      =========================================== */

      gsap.to('.rr-sheen-two', {
        x: '-18vw',
        y: '7vh',
        scale: 1.12,
        duration: 21,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 3,
      });
    }, root);

    /* ==========================================
       OPTIONAL AUDIO REACTIVE MODE
    =========================================== */

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
        analyser.smoothingTimeConstant = 0.8;

        data = new Uint8Array(
          analyser.frequencyBinCount
        );

        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        const tick = () => {
          analyser.getByteFrequencyData(data);

          const average =
            data.reduce(
              (sum, value) => sum + value,
              0
            ) /
            data.length /
            255;

          const pulse =
            0.95 +
            average *
              0.4 *
              intensity;

          root.style.setProperty(
            '--rr-audio-pulse',
            pulse
          );

          root.style.setProperty(
            '--rr-audio-opacity',
            String(
              0.88 +
                average * 0.12
            )
          );

          raf =
            requestAnimationFrame(
              tick
            );
        };

        tick();
      } catch {
        // Audio-reactive mode is optional.
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
      className="
        pointer-events-none
        absolute
        inset-0
        z-0
        overflow-hidden
        bg-rr-bg
      "
      style={{
        '--rr-audio-pulse': 1,
        '--rr-audio-opacity': 1,
      }}
    >
      {/* =========================================
          BACKGROUND GRID
      ========================================== */}

      <div
        className="
          absolute
          inset-0
          rr-grid
          opacity-[0.07]
        "
      />

      {/* =========================================
          LARGE AMBER FIELD
      ========================================== */}

      <div
        className="
          rr-orb-a
          absolute
          -left-[22vw]
          top-[-5vh]

          h-[52vw]
          w-[52vw]

          rounded-full

          bg-[#D9A353]/[0.15]

          blur-[130px]

          will-change-transform
        "
        style={{
          transform:
            'scale(var(--rr-audio-pulse))',
          opacity:
            'var(--rr-audio-opacity)',
        }}
      />

      {/* =========================================
          COPPER FIELD
      ========================================== */}

      <div
        className="
          rr-orb-b
          absolute
          -right-[20vw]
          top-[8vh]

          h-[48vw]
          w-[48vw]

          rounded-full

          bg-[#B87436]/[0.13]

          blur-[140px]

          will-change-transform
        "
      />

      {/* =========================================
          SOFT GOLD FIELD
      ========================================== */}

      <div
        className="
          rr-orb-c
          absolute
          left-[25vw]
          -bottom-[25vw]

          h-[52vw]
          w-[52vw]

          rounded-full

          bg-[#E7B96A]/[0.08]

          blur-[150px]

          will-change-transform
        "
      />

      {/* =========================================
          DEEP BLUE-BLACK FIELD
      ========================================== */}

      <div
        className="
          rr-orb-d
          absolute
          right-[15vw]
          bottom-[-12vh]

          h-[40vw]
          w-[40vw]

          rounded-full

          bg-[#191D2B]/[0.48]

          blur-[160px]

          will-change-transform
        "
      />

      {/* =========================================
          LIGHT SHEEN
      ========================================== */}

      <div
        className="
          rr-sheen
          absolute
          left-[12%]
          top-[20%]

          h-[30vh]
          w-[34vw]

          rounded-full

          bg-[#E7B96A]/[0.045]

          blur-[110px]

          will-change-transform
        "
      />

      {/* =========================================
          SECOND SHEEN
      ========================================== */}

      <div
        className="
          rr-sheen-two
          absolute
          right-[18%]
          bottom-[18%]

          h-[25vh]
          w-[28vw]

          rounded-full

          bg-[#B87436]/[0.035]

          blur-[120px]

          will-change-transform
        "
      />

      {/* =========================================
          CINEMATIC VIGNETTE
      ========================================== */}

      <div
        className="
          absolute
          inset-0

          bg-[radial-gradient(
            circle_at_center,
            transparent_0%,
            rgba(14,11,8,0.18)_34%,
            rgba(14,11,8,0.62)_72%,
            #0E0B08_100%
          )]
        "
      />

      {/* =========================================
          TOP DARK FADE
      ========================================== */}

      <div
        className="
          absolute
          inset-x-0
          top-0
          h-[32vh]

          bg-gradient-to-b
          from-[#0E0B08]/55
          to-transparent
        "
      />

      {/* =========================================
          BOTTOM DARK FADE
      ========================================== */}

      <div
        className="
          absolute
          inset-x-0
          bottom-0
          h-[32vh]

          bg-gradient-to-t
          from-[#0E0B08]
          to-transparent
        "
      />

      {/* =========================================
          SUBTLE HORIZONTAL LIGHT
      ========================================== */}

      <div
        className="
          absolute
          left-1/2
          top-1/2

          h-[1px]
          w-[65vw]

          -translate-x-1/2

          bg-gradient-to-r
          from-transparent
          via-[#D9A353]/[0.08]
          to-transparent

          blur-[2px]
        "
      />
    </div>
  );
}