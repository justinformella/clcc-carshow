import type { Registration } from "@/types/database";

export function buildPlacardHtml(reg: Registration): string {
  const detail = (label: string, value: string | null) =>
    value
      ? `<div class="placard-detail"><span class="placard-detail-label">${label}</span><span>${value}</span></div>`
      : "";

  return `<div class="placard">
    <div class="placard-top-rule"></div>
    <div class="placard-number">#${reg.car_number}</div>
    <div class="placard-vehicle">${reg.vehicle_year} ${reg.vehicle_make} ${reg.vehicle_model}</div>
    <div class="placard-owner">${reg.first_name} ${reg.last_name}${reg.hometown ? `<span class="placard-hometown"> &mdash; ${reg.hometown}</span>` : ""}</div>
    <div class="placard-divider"></div>
    <div class="placard-category">${reg.preferred_category}</div>
    ${
      reg.vehicle_color || reg.engine_specs || reg.modifications
        ? `<div class="placard-details">${detail("Color", reg.vehicle_color)}${detail("Engine", reg.engine_specs)}${detail("Modifications", reg.modifications)}</div>`
        : ""
    }
    ${reg.story ? `<div class="placard-story"><p>${reg.story}</p></div>` : ""}
  </div>`;
}

export const placardPrintStyles = `
  @page {
    size: letter landscape;
    margin: 0;
  }

  .placard {
    width: 11in;
    height: 8.5in;
    padding: 0.6in 0.75in;
    page-break-after: always;
    page-break-inside: avoid;
    font-family: 'Inter', sans-serif;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    color: #000;
  }

  .placard-top-rule {
    height: 4px;
    background: #000;
    margin-bottom: 0.35in;
  }

  .placard-number {
    font-family: 'Playfair Display', serif;
    font-size: 72pt;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.15in;
  }

  .placard-vehicle {
    font-family: 'Playfair Display', serif;
    font-size: 32pt;
    line-height: 1.2;
    margin-bottom: 0.1in;
  }

  .placard-owner {
    font-size: 18pt;
    margin-bottom: 0.05in;
  }

  .placard-hometown {
    color: #555;
  }

  .placard-divider {
    height: 1px;
    background: #000;
    margin: 0.25in 0;
  }

  .placard-category {
    display: inline-block;
    padding: 4pt 14pt;
    border: 2px solid #000;
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.25in;
  }

  .placard-details {
    margin-bottom: 0.2in;
  }

  .placard-detail {
    display: flex;
    gap: 0.2in;
    margin-bottom: 0.06in;
    font-size: 12pt;
    line-height: 1.5;
  }

  .placard-detail-label {
    font-size: 10pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    min-width: 1.2in;
    flex-shrink: 0;
    padding-top: 1pt;
  }

  .placard-story {
    flex: 1;
    margin-bottom: 0.15in;
  }

  .placard-story p {
    font-size: 12pt;
    line-height: 1.7;
    margin: 0;
  }

  @media print {
    body {
      margin: 0;
      padding: 0;
    }
  }

  @media screen {
    .placard {
      border: 1px solid #ddd;
    }
  }
`;

export function openPlacardPrintWindow(registrations: Registration[]) {
  const html = `<!DOCTYPE html>
<html>
<head>
<title>Placards</title>
<style>${placardPrintStyles}</style>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>${registrations.map((r) => buildPlacardHtml(r)).join("")}</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  }
}
