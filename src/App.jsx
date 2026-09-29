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

    async function startCamera() {
      try {
        if (!window.isSecureContext) {
          throw new Error(
            'Camera requires a secure HTTPS connection.'
          );
        }

        setStatus('starting');

        /*
         * Ask the browser for camera access.
         * This also allows us to discover the actual
         * camera devices available on the phone.
         */
        const cameras =
          await Html5Qrcode.getCameras();

        if (!cameras || cameras.length === 0) {
          throw new Error(
            'No camera was found on this device.'
          );
        }

        console.log(
          'Available cameras:',
          cameras
        );

        /*
         * Prefer the rear/environment camera.
         */
        let selectedCamera = cameras.find(
          (camera) => {
            const label =
              camera.label.toLowerCase();

            return (
              label.includes('back') ||
              label.includes('rear') ||
              label.includes('environment') ||
              label.includes('main')
            );
          }
        );

        /*
         * If the browser does not expose camera
         * names, use the last camera as fallback.
         */
        if (!selectedCamera) {
          selectedCamera =
            cameras[cameras.length - 1];
        }

        console.log(
          'Selected camera:',
          selectedCamera
        );

        if (!mounted) {
          return;
        }

        scanner =
          new Html5Qrcode('reader');

        scannerRef.current = scanner;

        await scanner.start(
          selectedCamera.id,
          {
            fps: 15,

            qrbox: function (
              width,
              height
            ) {
              const size =
                Math.floor(
                  Math.min(width, height) *
                    0.72
                );

              return {
                width: size,
                height: size,
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

        if (!mounted) {
          return;
        }

        setStatus('camera-error');

        let message =
          'Unable to start the camera.';

        if (
          error?.name ===
          'NotAllowedError'
        ) {
          message =
            'Camera permission was denied. Allow camera access in browser settings.';
        } else if (
          error?.name ===
          'NotFoundError'
        ) {
          message =
            'No camera was found.';
        } else if (
          error?.name ===
          'NotReadableError'
        ) {
          message =
            'Camera is already being used by another application.';
        } else if (
          error?.message
        ) {
          message = error.message;
        }

        setResult({
          message: 'CAMERA ERROR',
          detail: message,
        });
      }
    }

    startCamera();

    return () => {
      mounted = false;

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
                  Accessing device camera...
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
                  Reading ticket...
                </span>
              </div>
            </>
          )}

          {status === 'camera-error' &&
            result && (
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
 * TEMPORARY QR TEST
 *
 * We will replace this with the real
 * Apps Script check-in API next.
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
