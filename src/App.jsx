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

  const [status, setStatus] = useState('starting');
  const [result, setResult] = useState(null);

  useEffect(() => {
    let mounted = true;
    let scanner = null;
    let permissionStream = null;

    async function startScanner() {
      try {
        if (!window.isSecureContext) {
          throw new Error(
            'Camera requires HTTPS.'
          );
        }

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          throw new Error(
            'This browser does not support camera access.'
          );
        }

        setStatus('starting');

        /*
         * Explicitly request camera permission first.
         */
        permissionStream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {
                ideal: 'environment',
              },
            },
            audio: false,
          });

        /*
         * We only needed this stream to trigger
         * permission and verify camera access.
         * html5-qrcode will create its own stream.
         */
        permissionStream
          .getTracks()
          .forEach((track) => track.stop());

        permissionStream = null;

        if (!mounted) {
          return;
        }

        scanner = new Html5Qrcode('reader');

        scannerRef.current = scanner;

        await scanner.start(
          {
            facingMode: {
              ideal: 'environment',
            },
          },
          {
            fps: 15,

            qrbox: function (
              viewfinderWidth,
              viewfinderHeight
            ) {
              const size =
                Math.min(
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

            disableFlip: false,
          },
          handleScan,
          () => {}
        );

        if (mounted) {
          setStatus('idle');
        }

      } catch (error) {
        console.error(
          'ILLUMINATE CAMERA ERROR:',
          error
        );

        if (permissionStream) {
          permissionStream
            .getTracks()
            .forEach((track) => track.stop());
        }

        if (!mounted) {
          return;
        }

        setStatus('camera-error');

        let message =
          'Unable to access the camera.';

        if (
          error?.name ===
          'NotAllowedError'
        ) {
          message =
            'Camera permission was denied. Allow camera access and reload.';
        }

        if (
          error?.name ===
          'NotFoundError'
        ) {
          message =
            'No camera was found on this device.';
        }

        if (
          error?.name ===
          'NotReadableError'
        ) {
          message =
            'Camera is being used by another application.';
        }

        setResult({
          message: 'CAMERA ERROR',
          detail: message,
        });
      }
    }

    startScanner();

    return () => {
      mounted = false;

      if (permissionStream) {
        permissionStream
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (scanner) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            scanner
              .clear()
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

    console.log(
      'ILLUMINATE QR DETECTED:',
      decodedText
    );

    processingRef.current = true;

    setStatus('checking');

    setResult({
      message: 'QR DETECTED',
      detail: 'Reading ticket...',
    });

    const response =
      await verifyTicket(decodedText);

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

            <p>
              2026 · STAFF SCANNER
            </p>

          </div>

          <div className="online-badge">

            <ShieldCheck size={15} />

            SCANNER ONLINE

          </div>

        </header>

        <div className="headline">

          <span>
            Fast entry.
          </span>

          <strong>
            Zero friction.
          </strong>

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

        <div
          className={`status-panel ${status}`}
        >

          {status === 'starting' && (
            <>
              <ShieldCheck
                size={22}
                className="spin"
              />

              <div>

                <b>
                  STARTING CAMERA
                </b>

                <span>
                  Requesting camera access...
                </span>

              </div>
            </>
          )}

          {status === 'idle' && (
            <>
              <TicketCheck size={22} />

              <div>

                <b>
                  READY TO SCAN
                </b>

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

                <b>
                  QR DETECTED
                </b>

                <span>
                  Processing ticket...
                </span>

              </div>
            </>
          )}

          {status === 'camera-error' && result && (
            <>
              <XCircle size={24} />

              <div>

                <b>
                  {result.message}
                </b>

                <span>
                  {result.detail}
                </span>

              </div>
            </>
          )}

          {result &&
            status !== 'idle' &&
            status !== 'starting' &&
            status !== 'checking' &&
            status !== 'camera-error' && (
              <>
                {status === 'approved' ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <XCircle size={24} />
                )}

                <div>

                  <b>
                    {result.message}
                  </b>

                  <span>
                    {result.detail}
                  </span>

                </div>
              </>
            )}

        </div>

        <footer>

          <span>
            SECURE VERIFICATION
          </span>

          <span>
            ILLUMINATE 2026
          </span>

        </footer>

      </section>

    </main>
  );
}


/*
 * TEMPORARY VERIFICATION
 *
 * This only tests QR detection.
 *
 * We will replace this function with the
 * existing ILLUMINATE Apps Script check-in
 * backend after camera scanning is confirmed.
 */

async function verifyTicket(decodedText) {

  try {

    const url =
      new URL(decodedText);

    const token =
      url.searchParams.get('t');

    if (!token) {

      return {
        status: 'invalid',
        message: 'INVALID QR',
        detail:
          'No ticket token found.',
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
