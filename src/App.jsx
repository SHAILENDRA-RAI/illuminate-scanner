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

  const scannerRef =
    useRef(null);

  const processingRef =
    useRef(false);

  const [status, setStatus] =
    useState('starting');

  const [result, setResult] =
    useState(null);


  /* ==================================================
     CAMERA
     ================================================== */

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


        const cameras =
          await Html5Qrcode.getCameras();


        if (
          !cameras ||
          cameras.length === 0
        ) {

          throw new Error(
            'No camera was found on this device.'
          );
        }


        console.log(
          'Available cameras:',
          cameras
        );


        /*
         * Prefer rear camera.
         */

        let selectedCamera =
          cameras.find(
            (camera) => {

              const label =
                (
                  camera.label || ''
                ).toLowerCase();


              return (
                label.includes('back') ||
                label.includes('rear') ||
                label.includes('environment') ||
                label.includes('main')
              );
            }
          );


        /*
         * Fallback.
         */

        if (!selectedCamera) {

          selectedCamera =
            cameras[
              cameras.length - 1
            ];
        }


        console.log(
          'Selected camera:',
          selectedCamera
        );


        if (!mounted) {
          return;
        }


        scanner =
          new Html5Qrcode(
            'reader'
          );


        scannerRef.current =
          scanner;


        await scanner.start(

          selectedCamera.id,

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


        setStatus(
          'camera-error'
        );


        setResult({

          message:
            'CAMERA ERROR',

          detail:
            error?.message ||
            'Unable to start the camera.',
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


    if (!decodedText) {
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


    const response =
      await verifyTicket(
        decodedText
      );


    setResult(
      response
    );


    setStatus(
      response.status
    );


    window.setTimeout(
      () => {

        setResult(null);

        setStatus('idle');

        processingRef.current =
          false;

      },
      RESULT_RESET_MS
    );
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

            <ShieldCheck
              size={15}
            />

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
    status === 'starting'
  ) {

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
            Accessing device camera...
          </span>

        </div>

      </div>
    );
  }


  if (
    status === 'camera-error'
  ) {

    return (

      <div className="status-panel camera-error">

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
    status === 'idle'
  ) {

    return (

      <div className="status-panel idle">

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
    status === 'checking'
  ) {

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


  /*
   * Result with attendee information.
   */

  if (
    result?.attendee
  ) {

    return (

      <div
        className={`attendee-result ${status}`}
      >

        <div className="result-title">

          {status === 'approved' ? (

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


  /*
   * Invalid / server error / event closed.
   */

  return (

    <div
      className={`status-panel ${status}`}
    >

      <XCircle
        size={24}
      />

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

function verifyTicket(
  decodedText
) {

  return new Promise(
    (resolve) => {

      let token = '';


      /*
       * Extract token from QR URL.
       */

      try {

        const url =
          new URL(
            decodedText
          );


        token =
          url.searchParams.get(
            't'
          ) || '';

      } catch {

        resolve({

          status: 'invalid',

          message:
            'INVALID QR',

          detail:
            'QR format is not valid.',
        });

        return;
      }


      if (!token) {

        resolve({

          status: 'invalid',

          message:
            'INVALID QR',

          detail:
            'No ticket token found.',
        });

        return;
      }


      /*
       * JSONP callback.
       */

      const callbackName =
        'illuminateCheckIn_' +
        Date.now() +
        '_' +
        Math.floor(
          Math.random() *
          100000
        );


      const script =
        document.createElement(
          'script'
        );


      let finished =
        false;


      const cleanup =
        () => {

          if (
            script.parentNode
          ) {

            script.parentNode
              .removeChild(
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
        window.setTimeout(
          () => {

            if (finished) {
              return;
            }


            finished = true;


            cleanup();


            resolve({

              status:
                'error',

              message:
                'SERVER TIMEOUT',

              detail:
                'Could not reach the check-in server.',
            });

          },
          10000
        );


      window[
        callbackName
      ] = (data) => {

        if (finished) {
          return;
        }


        finished = true;


        window.clearTimeout(
          timeout
        );


        cleanup();


        /*
         * SUCCESS
         */

        if (
          data &&
          data.status ===
            'CHECKED_IN'
        ) {

          resolve({

            status:
              'approved',

            message:
              'ENTRY APPROVED',

            detail:
              data.message ||
              'Check-in successful.',

            attendee:
              data,

          });

          return;
        }


        /*
         * DUPLICATE
         */

        if (
          data &&
          data.status ===
            'ALREADY_USED'
        ) {

          resolve({

            status:
              'already-used',

            message:
              'ALREADY CHECKED IN',

            detail:
              data.message ||
              'This ticket has already been used.',

            attendee:
              data,

          });

          return;
        }


        /*
         * PAYMENT NOT APPROVED
         */

        if (
          data &&
          data.status ===
            'NOT_APPROVED'
        ) {

          resolve({

            status:
              'not-approved',

            message:
              'ENTRY NOT APPROVED',

            detail:
              data.message ||
              'This ticket is not approved.',

            attendee:
              data,

          });

          return;
        }


        /*
         * EVENT NOT OPEN
         */

        if (
          data &&
          data.status ===
            'NOT_OPEN'
        ) {

          resolve({

            status:
              'not-open',

            message:
              'CHECK-IN NOT OPEN',

            detail:
              data.message ||
              'Entry has not opened yet.',
          });

          return;
        }


        /*
         * EVENT CLOSED
         */

        if (
          data &&
          data.status ===
            'CLOSED'
        ) {

          resolve({

            status:
              'closed',

            message:
              'CHECK-IN CLOSED',

            detail:
              data.message ||
              'Check-in is closed.',
          });

          return;
        }


        /*
         * INVALID
         */

        resolve({

          status:
            'invalid',

          message:
            'INVALID TICKET',

          detail:
            data?.message ||
            'This ticket could not be verified.',

          attendee:
            data,

        });

      };


      /*
       * Build API URL.
       */

      const apiUrl =
        APPS_SCRIPT_URL +
        '?action=checkin' +
        '&t=' +
        encodeURIComponent(
          token
        ) +
        '&callback=' +
        encodeURIComponent(
          callbackName
        );


      script.src =
        apiUrl;


      script.async =
        true;


      script.onerror =
        () => {

          if (finished) {
            return;
          }


          finished = true;


          window.clearTimeout(
            timeout
          );


          cleanup();


          resolve({

            status:
              'error',

            message:
              'CONNECTION ERROR',

            detail:
              'Could not connect to the check-in server.',
          });

        };


      document.body.appendChild(
        script
      );

    }
  );
}


export default App;
