'use client';
import dynamic from 'next/dynamic';

// SSR: false — browser-only library, không load lúc build
const BarcodeScannerInner = dynamic(() => import('./BarcodeScannerInner'), {
  ssr: false,
});

export default BarcodeScannerInner;
