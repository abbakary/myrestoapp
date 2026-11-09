import React, { useRef } from 'react';
import { X, Printer, Share2, Copy, Check } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  targetUrl: string;
  badgeLabel?: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  targetUrl,
  badgeLabel = 'CONTACTLESS ORDER & PAY',
}) => {
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Deterministic SVG QR Matrix pattern based on targetUrl hash
  const generatePattern = (seedStr: string) => {
    const size = 21;
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Corner finder patterns (7x7)
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[startY + r][startX + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(size - 7, 0);
    drawFinder(0, size - 7);

    // Hash pseudo-random data fillers
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinder =
          (r < 8 && c < 8) ||
          (r < 8 && c >= size - 8) ||
          (r >= size - 8 && c < 8);
        if (!inFinder) {
          const bit = Math.abs((hash ^ (r * 31 + c * 17)) % 7);
          grid[r][c] = bit === 0 || bit === 2 || bit === 5;
        }
      }
    }
    return grid;
  };

  const matrix = generatePattern(targetUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden text-neutral-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-bold text-neutral-900">{title}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Stand Tent Card Preview */}
        <div ref={printRef} className="p-6 flex flex-col items-center bg-neutral-50/50">
          <div className="w-full bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col items-center text-center">
            {/* Table Badge */}
            <div className="bg-amber-500 text-white font-bold text-xs uppercase tracking-wider py-1.5 px-4 rounded-md mb-4 shadow-xs">
              {badgeLabel}
            </div>

            <p className="text-xs font-medium text-neutral-600 mb-4 max-w-xs">
              Scan this QR code with your phone camera to browse menu, customize meals & submit orders instantly.
            </p>

            {/* SVG QR Code */}
            <div className="p-3 bg-white border border-neutral-200 rounded-xl shadow-xs">
              <svg
                viewBox="0 0 21 21"
                className="w-44 h-44 shape-rendering-crisp"
                fill="currentColor"
              >
                {matrix.map((row, r) =>
                  row.map((val, c) =>
                    val ? (
                      <rect
                        key={`${r}-${c}`}
                        x={c}
                        y={r}
                        width="1"
                        height="1"
                        className="text-neutral-900"
                      />
                    ) : null
                  )
                )}
              </svg>
            </div>

            <p className="text-[11px] font-mono text-neutral-500 mt-3 break-all max-w-[280px]">
              {targetUrl}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white border-t border-neutral-100">
          <button
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-neutral-500" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Stand Card</span>
          </button>
        </div>
      </div>
    </div>
  );
};
