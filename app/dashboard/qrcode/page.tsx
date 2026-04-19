'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { useAppContext } from '@/context/AppContext';

const QR_SIZE = 400;
const LOGO_RATIO = 0.22;

export default function QRCodePage() {
  const { t } = useAppContext();

  const [url, setUrl] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [showLogo, setShowLogo] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/logo.png';
    img.onload = () => { logoRef.current = img; };
  }, []);

  const drawQR = useCallback(async (canvas: HTMLCanvasElement, size: number, targetUrl: string) => {
    if (!targetUrl) {
      const ctx = canvas.getContext('2d');
      if (ctx) { ctx.clearRect(0, 0, size, size); }
      return;
    }
    canvas.width = size;
    canvas.height = size;

    await QRCode.toCanvas(canvas, targetUrl, {
      width: size,
      margin: 2,
      color: { dark: fgColor, light: bgColor },
      errorCorrectionLevel: 'H',
    });

    if (showLogo && logoRef.current) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const logoSize = size * LOGO_RATIO;
      const logoX = (size - logoSize) / 2;
      const logoY = (size - logoSize) / 2;
      const padding = logoSize * 0.12;

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(logoX - padding, logoY - padding, logoSize + padding * 2, logoSize + padding * 2, 8);
      ctx.fill();

      ctx.drawImage(logoRef.current, logoX, logoY, logoSize, logoSize);
    }
  }, [fgColor, bgColor, showLogo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawQR(canvas, QR_SIZE, url);
  }, [url, fgColor, bgColor, showLogo, drawQR]);

  const handleDownload = async () => {
    if (!url) return;
    const offscreen = document.createElement('canvas');
    await drawQR(offscreen, 1024, url);
    const link = document.createElement('a');
    link.download = 'sushi-banana-qrcode.png';
    link.href = offscreen.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="pt-8 px-4 md:px-12 max-w-5xl mx-auto lg:pl-32 min-h-screen pb-32">
      <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
        {t.dashboard.qrCode}<span className="text-yellow-500">.</span>
      </h2>
      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-2 mb-10">
        {t.dashboard.qrCodeSubtitle}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left — controls */}
        <div className="space-y-8">

          {/* URL input */}
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
              {t.dashboard.qrLink}
            </p>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border-2 border-gray-200 focus:border-black rounded-2xl px-4 py-3 text-sm font-bold outline-none transition-all"
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                {t.dashboard.qrFgColor}
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <span
                  className="w-10 h-10 rounded-xl border-2 border-gray-200 block flex-shrink-0"
                  style={{ background: fgColor }}
                />
                <input
                  type="color"
                  value={fgColor}
                  onChange={e => setFgColor(e.target.value)}
                  className="sr-only"
                />
                <span className="font-black text-sm uppercase">{fgColor}</span>
              </label>
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                {t.dashboard.qrBgColor}
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <span
                  className="w-10 h-10 rounded-xl border-2 border-gray-200 block flex-shrink-0"
                  style={{ background: bgColor }}
                />
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  className="sr-only"
                />
                <span className="font-black text-sm uppercase">{bgColor}</span>
              </label>
            </div>
          </div>

          {/* Logo toggle */}
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
              {t.dashboard.qrLogo}
            </p>
            <button
              onClick={() => setShowLogo(v => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors ${showLogo ? 'bg-black' : 'bg-gray-200'}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showLogo ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={!url}
            className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t.dashboard.qrDownloadPng}
          </button>
        </div>

        {/* Right — preview */}
        <div className="flex flex-col items-center justify-center">
          <div
            className="rounded-3xl p-6 shadow-2xl border border-gray-100 flex items-center justify-center"
            style={{ background: bgColor }}
          >
            {url ? (
              <canvas
                ref={canvasRef}
                width={QR_SIZE}
                height={QR_SIZE}
                className="rounded-xl"
                style={{ width: 280, height: 280 }}
              />
            ) : (
              <div
                className="w-[280px] h-[280px] rounded-xl flex items-center justify-center"
                style={{ background: bgColor }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                  Enter a link
                </p>
              </div>
            )}
          </div>
          {url && (
            <p className="mt-4 text-[9px] font-black text-gray-300 uppercase tracking-widest text-center max-w-[280px] truncate">
              {url}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
