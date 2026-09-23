import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, X, Search, Camera, AlertTriangle } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (osNumber: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onSelectOrder }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [manualInput, setManualInput] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'loading' | 'active' | 'denied' | 'unsupported'>('loading');
  const [scanFeedback, setScanFeedback] = useState('');

  // ─── Encerra câmera e loop de scan ─────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // ─── Loop contínuo de detecção via BarcodeDetector ─────────────────────────
  const startScanLoop = useCallback((detector: any) => {
    const scan = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(scan);
        return;
      }
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes && barcodes.length > 0) {
          const raw = barcodes[0].rawValue as string;
          stopCamera();
          onSelectOrder(raw.trim());
          onClose();
          return;
        }
      } catch {
        // ignora frame com erro (câmera carregando)
      }
      animFrameRef.current = requestAnimationFrame(scan);
    };
    animFrameRef.current = requestAnimationFrame(scan);
  }, [stopCamera, onSelectOrder, onClose]);

  // ─── Inicia câmera quando modal abre ───────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setCameraStatus('loading');
    setScanFeedback('');

    const startCamera = async () => {
      // Verifica suporte a câmera
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('unsupported');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setCameraStatus('active');

        // BarcodeDetector (Chrome/Edge/Android) — fallback gracioso se indisponível
        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            startScanLoop(detector);
          } catch {
            setScanFeedback('Câmera ativa. Aponte para o QR Code ou use a entrada manual abaixo.');
          }
        } else {
          setScanFeedback('Câmera ativa. Seu navegador não suporta leitura automática — use a entrada manual abaixo.');
        }
      } catch (err: any) {
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setCameraStatus('denied');
        } else {
          setCameraStatus('unsupported');
        }
      }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, startScanLoop, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      stopCamera();
      onSelectOrder(manualInput.trim());
      setManualInput('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 text-white px-5 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-sm text-white">Leitor de QR Code</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-black w-full" style={{ aspectRatio: '4/3' }}>
          {/* Video element — sempre renderizado para o useEffect conseguir acessar o ref */}
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className={`w-full h-full object-cover ${cameraStatus === 'active' ? 'block' : 'hidden'}`}
          />

          {/* Loading */}
          {cameraStatus === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
              <Camera className="w-10 h-10 text-sky-400 animate-pulse" />
              <p className="text-xs text-slate-400">Solicitando permissão da câmera…</p>
            </div>
          )}

          {/* Denied */}
          {cameraStatus === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-semibold text-white">Acesso à câmera negado</p>
              <p className="text-xs text-slate-400">
                Permita o acesso à câmera nas configurações do navegador ou use a digitação manual abaixo.
              </p>
            </div>
          )}

          {/* Unsupported */}
          {cameraStatus === 'unsupported' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-rose-400" />
              <p className="text-sm font-semibold text-white">Câmera indisponível</p>
              <p className="text-xs text-slate-400">
                Este dispositivo não suporta acesso à câmera. Use a entrada manual abaixo.
              </p>
            </div>
          )}

          {/* Overlay: viewfinder quando câmera ativa */}
          {cameraStatus === 'active' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 relative">
                {/* Corner borders */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />
                {/* Scan line animation */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-sky-400 shadow-[0_0_10px_#38bdf8] animate-[scan_2s_linear_infinite]" />
              </div>
              <p className="absolute bottom-4 text-xs text-sky-300 font-medium drop-shadow-md">
                {scanFeedback || 'Aponte para o QR Code da OS'}
              </p>
            </div>
          )}
        </div>

        {/* Manual Entry */}
        <div className="p-4 space-y-3 bg-slate-900">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Ou digite o número da OS manualmente
          </label>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: OS-9287"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              autoFocus={cameraStatus === 'denied' || cameraStatus === 'unsupported'}
              className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              OK
            </button>
          </form>
        </div>
      </div>

      {/* CSS para animação da linha de scan */}
      <style>{`
        @keyframes scan {
          0%   { top: 0%; }
          50%  { top: calc(100% - 2px); }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
};
