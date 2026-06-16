/** Download the CV preview element as a PDF via the browser print dialog. */
export function downloadCvAsPdf(elementId: string, fileName: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  if (!printWindow) {
    document.body.removeChild(iframe);
    return;
  }

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${fileName}</title>
        ${styles}
        <style>
          @page { margin: 0; }
          body { margin: 0; padding: 12mm; background: white; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            /* Force ApronHanger watermark visible in printed PDF */
            [data-watermark] {
              display: flex !important;
              visibility: visible !important;
              opacity: 0.08 !important;
              position: fixed !important;
              inset: 0 !important;
              align-items: center !important;
              justify-content: center !important;
              pointer-events: none !important;
              z-index: 9999 !important;
            }
          }
        </style>
      </head>
      <body>${el.outerHTML}</body>
    </html>
  `);
  printWindow.document.close();

  // Wait for styles to apply before printing
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}
