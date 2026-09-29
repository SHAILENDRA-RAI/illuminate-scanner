import { useEffect, useRef, useState } from 'react';

import {
  Camera,
  CheckCircle2,
  ShieldCheck,
  TicketCheck,
  XCircle,
} from 'lucide-react';

import { Html5Qrcode } from 'html5-qrcode';

const RESULT_RESET_MS = 2600;

function App() {
  const scannerRef = useRef(null);
  const processingRef = useRef(false);

  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('reader');

    scannerRef.current = scanner;

    async function startScanner() {
      try {
        await scanner.start(
          {
            facingMode: 'environment',
          },
          {
            fps: 12,
            qrbox: {
              width: 260,
              height: 260,
            },
          },
          handleScan,
          () => {}
        );
      } catch (error) {
        console.error(error);

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
      scanner
        .stop()
        .catch(() => {});

      scanner
        .clear()
        .catch(() => {});
    };
  }, []);

  async function handleScan(decodedText) {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;

    setStatus('checking');

    setResult({
      message: 'VERIFYING TICKET',
      detail: 'Checking ticket status…',
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

        {/* HEADER */}

        <header className="topbar">

          <div>

            <div className="eyebrow">
              <span className="live-dot" />

              EVENT OPERATIONS
            </div>

            <h1>
              ILLUMINATE
            </h1>

            <p>
              2026 · STAFF SCANNER
            </p>

          </div>

          <div className="online-badge">

            <ShieldCheck size={15} />

            SCANNER ONLINE

          </div>

        </header>


        {/* HEADLINE */}

        <div className="headline">

          <span>
            Fast entry.
          </span>

          <strong>
            Zero friction.
          </strong>

        </div>


        {/* CAMERA */}

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


        {/* STATUS */}

        <div
          className={`status-panel ${status}`}
        >

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
                  VERIFYING TICKET
                </b>

                <span>
                  Please hold the QR steady
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


        {/* FOOTER */}

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
  TEMPORARY FUNCTION

  The camera works first.

  In the next step we will replace this
  with the real ILLUMINATE check-in API.
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
      status: 'invalid',
      message: 'QR DETECTED',
      detail:
        'Ticket token detected. Backend connection comes next.',
    };

  } catch {

    if (!decodedText?.trim()) {

      return {
        status: 'invalid',
        message: 'INVALID QR',
        detail: 'Unreadable ticket data.',
      };

    }

    return {
      status: 'invalid',
      message: 'QR DETECTED',
      detail:
        'QR detected successfully.',
    };

  }
}

export default App;
