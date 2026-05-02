'use client';

export default function BackgroundFX() {
  // Light, performant background — không hiệu ứng nặng, không listener
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(at 0% 0%, rgba(79,70,229,0.06) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(236,72,153,0.05) 0px, transparent 45%)',
        }}
      />
    </div>
  );
}
