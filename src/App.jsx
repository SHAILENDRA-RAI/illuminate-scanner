import { useEffect, useRef, useState } from 'react';

import {
  Camera,
  CheckCircle2,
  ShieldCheck,
  TicketCheck,
  XCircle,
} from 'lucide-react';

import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';

const RESULT_RESET_MS = 2600;

function App() {
  const scannerRef = useRef(null);
  const processingRef = useRef(false);

  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('reader', {
      verbose: false,
    });

    scannerRef.current = scanner;

    async function startScanner() {
      try {
        await scanner.start(
          {
            facingMode: {
              ideal: 'environment',
            },
          },
          {
            fps: 15,

            qrbox: function (viewfinderWidth, viewfinderHeight) {
              const size = Math.min(
                viewfinderWidth,
                viewfinderHeight
              ) * 0.72;

              return {
                width: Math.floor(size),
                height: Math.floor(size),
              };
            },

            aspectRatio: 1.0,

            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
            ],

            rememberLastUsedCamera: true,

            disableFlip: false,
          },
          handleScan,
          () => {}
        );

        console.log('ILLUMINATE scanner started');
      } catch (error) {
        console.error('Camera error:', error);

        setStatus('camera-error');

        setResult({
          message: 'CAMERA ERROR',
          detail:
            error?.message ||
            'Allow camera permission and reload.',
        });
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current
              ?.clear()
              .catch(() => {});
          });
      }
    };
  }, []);

  async function handleScan(decodedText) {
    if (processingRef.current) {
      return;
    }

    if (!decodedText) {
      return;
    }

    console.log('QR DETECTED:', decodedText);

    processingRef.current = true;

    setStatus('checking');

    setResult({
      message: 'QR DETECTED',
      detail: 'Ticket QR successfully scanned.',
    });

    const response = await verifyTicket(decodedText);

    setResult(response);
    setStatus(response.status);

    window.setTimeout(() => {
      setResult(null);
      setStatus('idle');
      processingRef.current = false;
    }, RESULT_RESET_MS);
  }

  return (
    <main className="app-shell">

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="scanner-card">

        <header className="topbar">

          <div>
            <div className="eyebrow">
              <span className="live-dot" />
              EVENT OPERATIONS
            </div>

            <h1>ILLUMINATE</h1>

            <p>2026 · STAFF SCANNER</p>
          </div>

          <div className="online-badge">
            <ShieldCheck size={15} />
            SCANNER ONLINE
          </div>

        </header>

        <div className="headline">
          <span>Fast entry.</span>
          <strong>Zero friction.</strong>
        </div>

        <div className="reader-frame">

          <div id="reader" />

          <div className="scan-overlay">

            <div className="corner tl" />
            <div className="corner tr" />
            <div className="corner bl" />
            <div className="corner br" />

            {status === 'idle' && (
              <div className="scan-hint">
                <Camera size={16} />
                Align ticket QR inside the frame
              </div>
            )}

          </div>

        </div>

        <div className={`status-panel ${status}`}>

          {status === 'idle' && (
            <>
              <TicketCheck size={22} />

              <div>
                <b>READY TO SCAN</b>

                <span>
                  Point the camera at an attendee QR
                </span>
              </div>
            </>
          )}

          {status === 'checking' && (
            <>
              <ShieldCheck
                size={22}
                className="spin"
              />

              <div>
                <b>QR DETECTED</b>

                <span>
                  Processing ticket…
                </span>
              </div>
            </>
          )}

          {result &&
            status !== 'idle' &&
            status !== 'checking' && (
              <>
                {status === 'approved' ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <XCircle size={24} />
                )}

                <div>
                  <b>{result.message}</b>

                  <span>
                    {result.detail}
                  </span>
                </div>
              </>
            )}

        </div>

        <footer>
          <span>SECURE VERIFICATION</span>
          <span>ILLUMINATE 2026</span>
        </footer>

      </section>

    </main>
  );
}


/*
  TEMPORARY QR VERIFICATION

  This currently tests whether the QR is
  actually being detected.

  Backend/check-in connection comes next.
*/

async function verifyTicket(decodedText) {

  try {

    const url = new URL(decodedText);

    const token =
      url.searchParams.get('t');

    if (!token) {

      return {
        status: 'invalid',
        message: 'INVALID QR',
        detail: 'No ticket token found.',
      };

    }

    return {
      status: 'approved',
      message: 'QR DETECTED',
      detail:
        'Ticket token successfully detected.',
    };

  } catch {

    return {
      status: 'approved',
      message: 'QR DETECTED',
      detail:
        'QR code successfully detected.',
    };

  }
}

export default App;
