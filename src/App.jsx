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


/* ==================================================
   ILLUMINATE APPS SCRIPT API
   ================================================== */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzymqTuKzj1J6yPV5xX_uqJScBL1MtOPjDUtm9iFNfe8P-43skdx48OteGdZ80Ss_zm7Q/exec';

const RESULT_RESET_MS = 3500;


/* ==================================================
   APP
   ================================================== */

function App() {
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState('starting');
  const [result, setResult] = useState(null);


  /* ==================================================
     CAMERA
     ================================================== */

  useEffect(() => {
    mountedRef.current = true;

    let scanner = null;

    async function startCamera() {
      if (startingRef.current) {
        return;
      }

      startingRef.current = true;

      try {
        setStatus('starting');
        setResult(null);

        /* ----------------------------------------------
           HTTPS CHECK
           ---------------------------------------------- */

        if (!window.isSecureContext) {
          throw new Error(
            'Camera requires HTTPS. Open the scanner using the GitHub Pages HTTPS URL.'
          );
        }


        /* ----------------------------------------------
           CHECK CAMERA API
           ---------------------------------------------- */

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          throw new Error(
            'Camera access is not supported by this browser.'
          );
        }


        /* ----------------------------------------------
           CREATE SCANNER
           ---------------------------------------------- */

        scanner = new Html5Qrcode('reader', {
          verbose: false,
        });

        scannerRef.current = scanner;


        /* ----------------------------------------------
           START REAR CAMERA
           ---------------------------------------------- */

        await scanner.start(

          {
            facingMode: 'environment',
          },

          {
            fps: 15,

            qrbox: function (width, height) {
              const size = Math.floor(
                Math.min(width, height) * 0.72
              );

              return {
                width: Math.max(size, 180),
                height: Math.max(size, 180),
              };
            },

            aspectRatio: 1.0,

            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
            ],

            disableFlip: false,
          },

          handleScan,

          () => {
            /* QR frame not detected - normal */
          }
        );


        /* ----------------------------------------------
           CAMERA SUCCESS
           ---------------------------------------------- */

        if (mountedRef.current) {
          setStatus('idle');
          setResult(null);
        }

      } catch (error) {

        console.error(
          'ILLUMINATE CAMERA ERROR:',
          error
        );

        if (!mountedRef.current) {
          return;
        }

        let message =
          error?.message ||
          'Unable to start the camera.';

        if (
          error?.name === 'NotAllowedError' ||
          message.toLowerCase().includes('permission')
        ) {
          message =
            'Camera permission was denied. Allow camera access in your browser settings and reload this page.';
        }

        if (
          error?.name === 'NotFoundError'
        ) {
          message =
            'No camera was found on this device.';
        }

        if (
          error?.name === 'NotReadableError'
        ) {
          message =
            'The camera is being used by another app. Close other camera apps and try again.';
        }

        setStatus('camera-error');

        setResult({
          message: 'CAMERA ERROR',
          detail: message,
        });

      } finally {
        startingRef.current = false;
      }
    }


    startCamera();


    /* ----------------------------------------------
       CLEANUP
       ---------------------------------------------- */

    return () => {
      mountedRef.current = false;

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

      scannerRef.current = null;
    };

  }, []);


  /* ==================================================
     QR DETECTED
     ================================================== */

  async function handleScan(decodedText) {

    if (processingRef.current) {
      return;
    }

    if (!decodedText) {
      return;
    }

    console.log(
      'ILLUMINATE QR:',
      decodedText
    );

    processingRef.current = true;

    setStatus('checking');

    setResult({
      message: 'VERIFYING TICKET',
      detail: 'Checking registration...',
    });


    try {

      const response =
        await verifyTicket(decodedText);

      if (!mountedRef.current) {
        return;
      }

      setResult(response);
      setStatus(response.status);

      window.setTimeout(() => {

        if (!mountedRef.current) {
          return;
        }

        setResult(null);
        setStatus('idle');
        processingRef.current = false;

      }, RESULT_RESET_MS);

    } catch (error) {

      console.error(
        'CHECK-IN ERROR:',
        error
      );

      setResult({
        status: 'error',
        message: 'CONNECTION ERROR',
        detail:
          'Could not connect to the check-in server.',
      });

      setStatus('error');

      window.setTimeout(() => {

        if (!mountedRef.current) {
          return;
        }

        setResult(null);
        setStatus('idle');
        processingRef.current = false;

      }, RESULT_RESET_MS);
    }
  }


  /* ==================================================
     UI
     ================================================== */

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

          <div
            id="reader"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '100%',
              background: '#000',
            }}
          />


          <div className="scan-overlay">

            <div className="corner tl" />
            <div className="corner tr" />
            <div className="corner bl" />
            <div className="corner br" />


            {status === 'idle' && (

              <div className="scan-hint">

                <Camera size={16} />

                Align ticket QR inside
                the frame

              </div>

            )}

          </div>

        </div>


        {/* RESULT */}

        <ResultPanel
          status={status}
          result={result}
        />


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


/* ==================================================
   RESULT PANEL
   ================================================== */

function ResultPanel({
  status,
  result,
}) {

  if (status === 'starting') {

    return (

      <div className="status-panel starting">

        <ShieldCheck
          size={22}
          className="spin"
        />

        <div>

          <b>
            STARTING CAMERA
          </b>

          <span>
            Allow camera access to scan tickets.
          </span>

        </div>

      </div>
    );
  }


  if (status === 'camera-error') {

    return (

      <div className="status-panel camera-error">

        <XCircle size={24} />

        <div>

          <b>
            CAMERA ACCESS REQUIRED
          </b>

          <span>
            {result?.detail}
          </span>

        </div>

      </div>
    );
  }


  if (status === 'idle') {

    return (

      <div className="status-panel idle">

        <TicketCheck size={22} />

        <div>

          <b>
            READY TO SCAN
          </b>

          <span>
            Point the camera at an attendee QR
          </span>

        </div>

      </div>
    );
  }


  if (status === 'checking') {

    return (

      <div className="status-panel checking">

        <ShieldCheck
          size={22}
          className="spin"
        />

        <div>

          <b>
            VERIFYING TICKET
          </b>

          <span>
            Checking registration...
          </span>

        </div>

      </div>
    );
  }


  /* ----------------------------------------------
     ATTENDEE RESULT
     ---------------------------------------------- */

  if (result?.attendee) {

    return (

      <div
        className={`attendee-result ${status}`}
      >

        <div className="result-title">

          {status === 'approved' ? (

            <CheckCircle2 size={27} />

          ) : (

            <XCircle size={27} />

          )}


          <div>

            <b>
              {result.message}
            </b>

            <span>
              {result.detail}
            </span>

          </div>

        </div>


        <div className="attendee-details">

          <Detail
            label="NAME"
            value={
              result.attendee.name
            }
          />


          <Detail
            label="COLLEGE"
            value={
              result.attendee.college
            }
          />


          <Detail
            label="TICKET ID"
            value={
              result.attendee.ticketId
            }
          />


          <Detail
            label="CHECK-IN TIME"
            value={
              result.attendee.checkinTime
            }
          />

        </div>

      </div>
    );
  }


  /* ----------------------------------------------
     OTHER RESULT
     ---------------------------------------------- */

  return (

    <div
      className={`status-panel ${status}`}
    >

      <XCircle size={24} />

      <div>

        <b>
          {result?.message ||
            'VERIFICATION FAILED'}
        </b>

        <span>
          {result?.detail ||
            'Unable to verify ticket.'}
        </span>

      </div>

    </div>
  );
}


/* ==================================================
   DETAIL
   ================================================== */

function Detail({
  label,
  value,
}) {

  return (

    <div className="detail-item">

      <small>
        {label}
      </small>

      <strong>
        {value || 'Not available'}
      </strong>

    </div>
  );
}


/* ==================================================
   APPS SCRIPT CHECK-IN
   ================================================== */

function verifyTicket(decodedText) {

  return new Promise((resolve) => {

    let token = '';


    /* ----------------------------------------------
       EXTRACT TOKEN
       ---------------------------------------------- */

    try {

      const url =
        new URL(decodedText);

      token =
        url.searchParams.get('t') || '';

    } catch {

      resolve({

        status: 'invalid',

        message: 'INVALID QR',

        detail:
          'QR format is not valid.',

      });

      return;
    }


    if (!token) {

      resolve({

        status: 'invalid',

        message: 'INVALID QR',

        detail:
          'No ticket token found.',

      });

      return;
    }


    /* ----------------------------------------------
       JSONP
       ---------------------------------------------- */

    const callbackName =
      'illuminateCheckIn_' +
      Date.now() +
      '_' +
      Math.floor(
        Math.random() * 100000
      );


    const script =
      document.createElement('script');


    let finished = false;


    const cleanup = () => {

      if (script.parentNode) {

        script.parentNode.removeChild(
          script
        );
      }

      try {

        delete window[
          callbackName
        ];

      } catch {}

    };


    const timeout =
      window.setTimeout(() => {

        if (finished) {
          return;
        }

        finished = true;

        cleanup();

        resolve({

          status: 'error',

          message:
            'SERVER TIMEOUT',

          detail:
            'Could not reach the check-in server.',

        });

      }, 10000);


    window[callbackName] = (data) => {

      if (finished) {
        return;
      }

      finished = true;

      window.clearTimeout(
        timeout
      );

      cleanup();


      /* ------------------------------------------
         APPROVED
         ------------------------------------------ */

      if (
        data &&
        data.status === 'CHECKED_IN'
      ) {

        resolve({

          status: 'approved',

          message:
            'ENTRY APPROVED',

          detail:
            data.message ||
            'Check-in successful.',

          attendee: data,

        });

        return;
      }


      /* ------------------------------------------
         ALREADY USED
         ------------------------------------------ */

      if (
        data &&
        data.status === 'ALREADY_USED'
      ) {

        resolve({

          status: 'already-used',

          message:
            'ALREADY CHECKED IN',

          detail:
            data.message ||
            'This ticket has already been used.',

          attendee: data,

        });

        return;
      }


      /* ------------------------------------------
         PAYMENT NOT APPROVED
         ------------------------------------------ */

      if (
        data &&
        data.status === 'NOT_APPROVED'
      ) {

        resolve({

          status: 'not-approved',

          message:
            'ENTRY NOT APPROVED',

          detail:
            data.message ||
            'This ticket is not approved.',

          attendee: data,

        });

        return;
      }


      /* ------------------------------------------
         EVENT NOT OPEN
         ------------------------------------------ */

      if (
        data &&
        data.status === 'NOT_OPEN'
      ) {

        resolve({

          status: 'not-open',

          message:
            'CHECK-IN NOT OPEN',

          detail:
            data.message ||
            'Entry has not opened yet.',

        });

        return;
      }


      /* ------------------------------------------
         EVENT CLOSED
         ------------------------------------------ */

      if (
        data &&
        data.status === 'CLOSED'
      ) {

        resolve({

          status: 'closed',

          message:
            'CHECK-IN CLOSED',

          detail:
            data.message ||
            'Check-in is closed.',

        });

        return;
      }


      /* ------------------------------------------
         INVALID
         ------------------------------------------ */

      resolve({

        status: 'invalid',

        message:
          'INVALID TICKET',

        detail:
          data?.message ||
          'This ticket could not be verified.',

        attendee: data,

      });

    };


    /* ----------------------------------------------
       API URL
       ---------------------------------------------- */

    const apiUrl =
      APPS_SCRIPT_URL +
      '?action=checkin' +
      '&t=' +
      encodeURIComponent(token) +
      '&callback=' +
      encodeURIComponent(
        callbackName
      );


    script.src = apiUrl;

    script.async = true;


    script.onerror = () => {

      if (finished) {
        return;
      }

      finished = true;

      window.clearTimeout(
        timeout
      );

      cleanup();

      resolve({

        status: 'error',

        message:
          'CONNECTION ERROR',

        detail:
          'Could not connect to the check-in server.',

      });

    };


    document.body.appendChild(
      script
    );

  });
}


export default App;
