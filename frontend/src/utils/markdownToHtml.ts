/**
 * Converts markdown text to HTML suitable for print-to-PDF rendering.
 * Handles headers, lists, tables, bold, italic, and horizontal rules.
 */
export function convertMarkdownToHTML(md: string): string {
  const lines = md.split('\n')
  let html = ''
  let inTable = false
  let tableRows: string[] = []

  const inlineFormat = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect table rows
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true
        tableRows = []
      }
      // Skip separator line (e.g. |---|---|)
      if (line.match(/^\|[\s\-:]+\|/)) continue
      tableRows.push(line)
      continue
    } else if (inTable) {
      // Flush accumulated table
      html += '<table><tbody>'
      tableRows.forEach((row, idx) => {
        const cells = row
          .split('|')
          .filter(c => c.trim())
          .map(c => c.trim())
        const tag = idx === 0 ? 'th' : 'td'
        html +=
          '<tr>' +
          cells.map(c => `<${tag}>${inlineFormat(c)}</${tag}>`).join('') +
          '</tr>'
      })
      html += '</tbody></table>'
      inTable = false
      tableRows = []
    }

    // Headers
    if (line.startsWith('# ')) {
      html += `<h1>${line.substring(2)}</h1>`
    } else if (line.startsWith('## ')) {
      html += `<h2>${line.substring(3)}</h2>`
    } else if (line.startsWith('### ')) {
      html += `<h3>${line.substring(4)}</h3>`
    } else if (line.trim() === '---') {
      html += '<hr>'
    } else if (line.startsWith('- ')) {
      html += `<li>${inlineFormat(line.substring(2))}</li>`
    } else if (line.trim() === '') {
      html += '<div class="spacer"></div>'
    } else if (!inTable) {
      html += `<p>${inlineFormat(line)}</p>`
    }
  }

  // Flush any remaining table
  if (inTable && tableRows.length > 0) {
    html += '<table><tbody>'
    tableRows.forEach((row, idx) => {
      const cells = row
        .split('|')
        .filter(c => c.trim())
        .map(c => c.trim())
      const tag = idx === 0 ? 'th' : 'td'
      html +=
        '<tr>' +
        cells.map(c => `<${tag}>${inlineFormat(c)}</${tag}>`).join('') +
        '</tr>'
    })
    html += '</tbody></table>'
  }

  return html
}

/**
 * Wraps converted HTML in a full document with print-optimized CSS.
 */
export function wrapInPrintableHTML(bodyHtml: string, title = 'Resume'): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { margin: 0.75in; }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      line-height: 1.4;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0;
      font-size: 11pt;
      color: #000;
    }
    h1 {
      font-size: 18pt;
      margin: 0 0 8pt 0;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 2px solid #000;
      padding-bottom: 4pt;
    }
    h2 {
      font-size: 14pt;
      margin: 14pt 0 8pt 0;
      font-weight: bold;
      text-transform: uppercase;
    }
    h3 {
      font-size: 12pt;
      margin: 10pt 0 6pt 0;
      font-weight: bold;
    }
    p {
      margin: 4pt 0;
      text-align: justify;
    }
    ul {
      margin: 4pt 0;
      padding-left: 20pt;
      list-style-type: disc;
    }
    li {
      margin: 3pt 0;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8pt 0;
    }
    th, td {
      border: 1px solid #000;
      padding: 6pt;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    strong { font-weight: bold; }
    em { font-style: italic; }
    hr {
      border: none;
      border-top: 1px solid #ccc;
      margin: 10pt 0;
    }
    .spacer { height: 8pt; }
    @media print {
      body { margin: 0; padding: 0; }
      h1, h2, h3 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}

/**
 * Opens a print dialog for the given markdown content.
 */
export function printMarkdownAsPDF(markdown: string, title = 'Resume'): void {
  const bodyHtml = convertMarkdownToHTML(markdown)
  const fullHtml = wrapInPrintableHTML(bodyHtml, title)
  const blob = new Blob([fullHtml], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank')
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print()
    }
  }
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
