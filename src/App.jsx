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
   APPS SCRIPT API
   ================================================== */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzymqTuKzj1J6yPV5xX_uqJScBL1MtOPjDUtm9iFNfe8P-43skdx48OteGdZ80Ss_zm7Q/exec';


const RESULT_RESET_MS = 3500;


/* ==================================================
   APP
   ================================================== */

function App() {

  const scannerRef =
    useRef(null);

  const processingRef =
    useRef(false);

  const startingRef =
    useRef(false);

  const mountedRef =
    useRef(true);


  const [status, setStatus] =
    useState('camera-off');

  const [result, setResult] =
    useState(null);


  /* ==================================================
     START CAMERA
     ================================================== */

  async function startCamera() {

    if (
      startingRef.current
    ) {
      return;
    }


    if (
      scannerRef.current
    ) {
      return;
    }


    startingRef.current =
      true;


    try {

      setStatus(
        'starting'
      );

      setResult(
        null
      );


      if (
        !window.isSecureContext
      ) {

        throw new Error(
          'Camera requires a secure HTTPS connection.'
        );
      }


      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {

        throw new Error(
          'Camera access is not supported by this browser.'
        );
      }


      /* ----------------------------------------------
         REQUEST CAMERA PERMISSION
         ---------------------------------------------- */

      const permissionStream =
        await navigator.mediaDevices.getUserMedia({

          video: {
            facingMode: {
              ideal: 'environment',
            },
          },

          audio: false,

        });


      permissionStream
        .getTracks()
        .forEach(
          (track) => {
            track.stop();
          }
        );


      /* ----------------------------------------------
         CREATE QR SCANNER
         ---------------------------------------------- */

      const scanner =
        new Html5Qrcode(
          'reader',
          {
            verbose: false,
          }
        );


      scannerRef.current =
        scanner;


      /* ----------------------------------------------
         START CAMERA
         ---------------------------------------------- */

      await scanner.start(

        {
          facingMode:
            'environment',
        },

        {

          fps: 15,

          qrbox:
            function (
              width,
              height
            ) {

              const size =
                Math.floor(
                  Math.min(
                    width,
                    height
                  ) * 0.72
                );


              return {

                width:
                  Math.max(
                    size,
                    180
                  ),

                height:
                  Math.max(
                    size,
                    180
                  ),

              };
            },


          aspectRatio:
            1.0,


          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
          ],


          disableFlip:
            false,

        },

        handleScan,

        () => {}

      );


      if (
        mountedRef.current
      ) {

        setStatus(
          'idle'
        );

        setResult(
          null
        );
      }


    } catch (
      error
    ) {

      console.error(
        'ILLUMINATE CAMERA ERROR:',
        error
      );


      if (
        !mountedRef.current
      ) {
        return;
      }


      let message =
        error?.message ||
        'Unable to start the camera.';


      if (
        error?.name ===
        'NotAllowedError'
      ) {

        message =
          'Camera permission is blocked. Allow camera access for this site in Chrome settings.';
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
          'The camera is already being used by another app.';
      }


      if (
        error?.name ===
        'OverconstrainedError'
      ) {

        message =
          'The rear camera could not be selected. Try again.';
      }


      setStatus(
        'camera-error'
      );


      setResult({

        message:
          'CAMERA ERROR',

        detail:
          message,

      });


      if (
        scannerRef.current
      ) {

        try {

          await scannerRef.current.clear();

        } catch {}

        scannerRef.current =
          null;
      }


    } finally {

      startingRef.current =
        false;

    }
  }


  /* ==================================================
     STOP CAMERA
     ================================================== */

  async function stopCamera() {

    const scanner =
      scannerRef.current;


    if (!scanner) {
      return;
    }


    try {

      await scanner.stop();

    } catch {}


    try {

      await scanner.clear();

    } catch {}


    scannerRef.current =
      null;


    setStatus(
      'camera-off'
    );


    setResult(
      null
    );
  }


  /* ==================================================
     CLEANUP
     ================================================== */

  useEffect(
    () => {

      mountedRef.current =
        true;


      return () => {

        mountedRef.current =
          false;


        const scanner =
          scannerRef.current;


        if (scanner) {

          scanner
            .stop()
            .catch(
              () => {}
            )
            .finally(
              () => {

                scanner
                  .clear()
                  .catch(
                    () => {}
                  );

              }
            );
        }


        scannerRef.current =
          null;

      };

    },
    []
  );


  /* ==================================================
     QR DETECTED
     ================================================== */

  async function handleScan(
    decodedText
  ) {

    if (
      processingRef.current
    ) {
      return;
    }


    if (
      !decodedText
    ) {
      return;
    }


    console.log(
      'ILLUMINATE QR:',
      decodedText
    );


    processingRef.current =
      true;


    setStatus(
      'checking'
    );


    setResult({

      message:
        'VERIFYING TICKET',

      detail:
        'Checking registration...',

    });


    try {

      const response =
        await verifyTicket(
          decodedText
        );


      if (
        !mountedRef.current
      ) {
        return;
      }


      setResult(
        response
      );


      setStatus(
        response.status
      );


      window.setTimeout(
        () => {

          if (
            !mountedRef.current
          ) {
            return;
          }


          setResult(
            null
          );


          setStatus(
            'idle'
          );


          processingRef.current =
            false;

        },
        RESULT_RESET_MS
      );


    } catch (
      error
    ) {

      console.error(
        'CHECK-IN ERROR:',
        error
      );


      setResult({

        status:
          'error',

        message:
          'CONNECTION ERROR',

        detail:
          'Could not connect to the check-in server.',

      });


      setStatus(
        'error'
      );


      window.setTimeout(
        () => {

          if (
            !mountedRef.current
          ) {
            return;
          }


          setResult(
            null
          );


          setStatus(
            'idle'
          );


          processingRef.current =
            false;

        },
        RESULT_RESET_MS
      );
    }
  }


  /* ==================================================
     UI
     ================================================== */

  return (

    <main
      className="app-shell"
    >

      <div
        className="ambient ambient-one"
      />

      <div
        className="ambient ambient-two"
      />


      <section
        className="scanner-card"
      >


        {/* HEADER */}

        <header
          className="topbar"
        >

          <div>

            <div
              className="eyebrow"
            >

              <span
                className="live-dot"
              />

              EVENT OPERATIONS

            </div>


            <h1>
              ILLUMINATE
            </h1>


            <p>
              2026 · STAFF SCANNER
            </p>

          </div>


          <div
            className="online-badge"
          >

            <ShieldCheck
              size={15}
            />

            SCANNER ONLINE

          </div>

        </header>


        {/* HEADLINE */}

        <div
          className="headline"
        >

          <span>
            Fast entry.
          </span>

          <strong>
            Zero friction.
          </strong>

        </div>


        {/* CAMERA */}

        <div
          className="reader-frame"
        >

          <div
            id="reader"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '100%',
              background: '#000',
            }}
          />


          <div
            className="scan-overlay"
          >

            <div
              className="corner tl"
            />

            <div
              className="corner tr"
            />

            <div
              className="corner bl"
            />

            <div
              className="corner br"
            />


            {status ===
              'camera-off' && (

              <button
                className="camera-start-button"
                onClick={
                  startCamera
                }
                type="button"
              >

                <Camera
                  size={18}
                />

                START CAMERA

              </button>

            )}


            {status ===
              'camera-error' && (

              <button
                className="camera-start-button"
                onClick={
                  startCamera
                }
                type="button"
              >

                <Camera
                  size={18}
                />

                TRY CAMERA AGAIN

              </button>

            )}


            {status ===
              'idle' && (

              <div
                className="scan-hint"
              >

                <Camera
                  size={16}
                />

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

  if (
    status ===
    'camera-off'
  ) {

    return (

      <div
        className="status-panel starting"
      >

        <Camera
          size={22}
        />

        <div>

          <b>
            CAMERA READY
          </b>

          <span>
            Tap START CAMERA to begin scanning
          </span>

        </div>

      </div>

    );
  }


  if (
    status ===
    'starting'
  ) {

    return (

      <div
        className="status-panel starting"
      >

        <ShieldCheck
          size={22}
          className="spin"
        />

        <div>

          <b>
            STARTING CAMERA
          </b>

          <span>
            Accessing rear camera...
          </span>

        </div>

      </div>

    );
  }


  if (
    status ===
    'camera-error'
  ) {

    return (

      <div
        className="status-panel camera-error"
      >

        <XCircle
          size={24}
        />

        <div>

          <b>
            CAMERA ERROR
          </b>

          <span>
            {result?.detail}
          </span>

        </div>

      </div>

    );
  }


  if (
    status ===
    'idle'
  ) {

    return (

      <div
        className="status-panel idle"
      >

        <TicketCheck
          size={22}
        />

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


  if (
    status ===
    'checking'
  ) {

    return (

      <div
        className="status-panel checking"
      >

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


  if (
    result?.attendee
  ) {

    return (

      <div
        className={`attendee-result ${status}`}
      >

        <div
          className="result-title"
        >

          {status ===
            'approved' ? (

            <CheckCircle2
              size={27}
            />

          ) : (

            <XCircle
              size={27}
            />

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


        <div
          className="attendee-details"
        >

          <Detail
            label="NAME"
            value={
              result
                .attendee
                .name
            }
          />

          <Detail
            label="COLLEGE"
            value={
              result
                .attendee
                .college
            }
          />

          <Detail
            label="TICKET ID"
            value={
              result
                .attendee
                .ticketId
            }
          />

          <Detail
            label="CHECK-IN TIME"
            value={
              result
                .attendee
                .checkinTime
            }
          />

        </div>

      </div>

    );
  }


  return (

    <div
      className={`status-panel ${status}`}
    >

      <XCircle
        size={24}
      />

      <div>

        <b>
          {
            result?.message ||
            'VERIFICATION FAILED'
          }
        </b>

        <span>
          {
            result?.detail ||
            'Unable to verify ticket.'
          }
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

    <div
      className="detail-item"
    >

      <small>
        {label}
      </small>

      <strong>
        {
          value ||
          'Not available'
        }
      </strong>

    </div>

  );
}


/* ==================================================
   CHECK-IN REQUEST
   ================================================== */

const verifyTicket = async (decodedText) => {

  // ============================================
  // EXTRACT TOKEN FROM QR
  // ============================================

  let token = '';

  try {

    const url =
      new URL(decodedText);

    token =
      url.searchParams.get('t') ||
      '';

  } catch {

    token =
      String(decodedText || '').trim();
  }


  if (!token) {

    return {
      status: 'error',

      message: 'INVALID QR',

      detail:
        'This QR code does not contain a valid ticket token.'
    };
  }


  // ============================================
  // CALL CLOUDFLARE WORKER
  // ============================================

  const response =
    await fetch(
      'https://illuminate-checkin.shailendrarai5588.workers.dev',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },

        body:
          new URLSearchParams({
            t: token
          }).toString()
      }
    );


  if (!response.ok) {

    throw new Error(
      `Server returned HTTP ${response.status}`
    );
  }


  const result =
    await response.json();


  console.log(
    'ILLUMINATE CHECK-IN RESPONSE:',
    result
  );


  // ============================================
  // MAP SERVER RESPONSE TO UI
  // ============================================

  const attendee =
    result.name ||
    result.college ||
    result.ticketId ||
    result.checkinTime
      ? {
          name:
            result.name || '',

          college:
            result.college || '',

          ticketId:
            result.ticketId || '',

          checkinTime:
            result.checkinTime || ''
        }
      : null;


  switch (
    result.status
  ) {

    case 'CHECKED_IN':

      return {

        status:
          'approved',

        message:
          'ENTRY APPROVED',

        detail:
          result.message ||
          'Ticket verified successfully.',

        attendee:
          attendee

      };


    case 'ALREADY_USED':

      return {

        status:
          'already-used',

        message:
          'ALREADY CHECKED IN',

        detail:
          result.message ||
          'This ticket has already been used.',

        attendee:
          attendee

      };


    case 'NOT_APPROVED':

      return {

        status:
          'error',

        message:
          'PAYMENT NOT APPROVED',

        detail:
          result.message ||
          'This ticket is not approved for entry.'

      };


    case 'NOT_OPEN':

      return {

        status:
          'warning',

        message:
          'ENTRY NOT OPEN',

        detail:
          result.message ||
          'Entry is not open yet.'

      };


    case 'CLOSED':

      return {

        status:
          'warning',

        message:
          'ENTRY CLOSED',

        detail:
          result.message ||
          'Entry is currently closed.'

      };


    case 'SERVER_ERROR':

      return {

        status:
          'error',

        message:
          'SERVER ERROR',

        detail:
          result.message ||
          'Unable to verify the ticket.'

      };


    case 'INVALID':

    default:

      return {

        status:
          'error',

        message:
          'INVALID TICKET',

        detail:
          result.message ||
          'This QR code is invalid or does not exist.'

      };
  }
};

export default App;
