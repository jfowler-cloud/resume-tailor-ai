import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { convertMarkdownToHTML, wrapInPrintableHTML, printMarkdownAsPDF } from '../markdownToHtml'

describe('convertMarkdownToHTML', () => {
  it('converts h1 headers', () => {
    const result = convertMarkdownToHTML('# Main Title')
    expect(result).toBe('<h1>Main Title</h1>')
  })

  it('converts h2 headers', () => {
    const result = convertMarkdownToHTML('## Section Title')
    expect(result).toBe('<h2>Section Title</h2>')
  })

  it('converts h3 headers', () => {
    const result = convertMarkdownToHTML('### Subsection')
    expect(result).toBe('<h3>Subsection</h3>')
  })

  it('converts horizontal rules', () => {
    const result = convertMarkdownToHTML('---')
    expect(result).toBe('<hr>')
  })

  it('converts list items', () => {
    const result = convertMarkdownToHTML('- First item\n- Second item')
    expect(result).toBe('<li>First item</li><li>Second item</li>')
  })

  it('converts bold text', () => {
    const result = convertMarkdownToHTML('This is **bold** text')
    expect(result).toBe('<p>This is <strong>bold</strong> text</p>')
  })

  it('converts italic text', () => {
    const result = convertMarkdownToHTML('This is *italic* text')
    expect(result).toBe('<p>This is <em>italic</em> text</p>')
  })

  it('converts mixed bold and italic', () => {
    const result = convertMarkdownToHTML('**Bold** and *italic*')
    expect(result).toBe('<p><strong>Bold</strong> and <em>italic</em></p>')
  })

  it('handles empty lines as spacers', () => {
    const result = convertMarkdownToHTML('Line 1\n\nLine 2')
    expect(result).toContain('<div class="spacer"></div>')
  })

  it('converts regular paragraphs', () => {
    const result = convertMarkdownToHTML('Just a paragraph')
    expect(result).toBe('<p>Just a paragraph</p>')
  })

  it('converts tables', () => {
    const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`
    const result = convertMarkdownToHTML(markdown)
    expect(result).toContain('<table>')
    expect(result).toContain('<th>Header 1</th>')
    expect(result).toContain('<td>Cell 1</td>')
    expect(result).toContain('</table>')
  })

  it('handles tables with bold text in cells', () => {
    const markdown = `| **Bold Header** |
|-----------------|
| Normal cell     |`
    const result = convertMarkdownToHTML(markdown)
    expect(result).toContain('<strong>Bold Header</strong>')
  })

  it('flushes table at end of input', () => {
    const markdown = `| Col 1 |
|-------|
| Data  |`
    const result = convertMarkdownToHTML(markdown)
    expect(result).toContain('</tbody></table>')
  })

  it('handles multiple sections', () => {
    const markdown = `# Title
## Section 1
- Item 1
- Item 2

## Section 2
Regular paragraph`
    const result = convertMarkdownToHTML(markdown)
    expect(result).toContain('<h1>Title</h1>')
    expect(result).toContain('<h2>Section 1</h2>')
    expect(result).toContain('<li>Item 1</li>')
    expect(result).toContain('<h2>Section 2</h2>')
    expect(result).toContain('<p>Regular paragraph</p>')
  })

  it('handles bold in list items', () => {
    const result = convertMarkdownToHTML('- **Important** item')
    expect(result).toBe('<li><strong>Important</strong> item</li>')
  })

  it('handles complex resume-like content', () => {
    const markdown = `# John Doe
## Experience
- **Software Engineer** at Tech Corp
- Led team of 5 developers

## Skills
| Skill | Level |
|-------|-------|
| Python | Expert |`
    const result = convertMarkdownToHTML(markdown)
    expect(result).toContain('<h1>John Doe</h1>')
    expect(result).toContain('<strong>Software Engineer</strong>')
    expect(result).toContain('<th>Skill</th>')
    expect(result).toContain('<td>Python</td>')
  })

  it('handles table followed by other content', () => {
    const markdown = `| A | B |
|---|---|
| 1 | 2 |
# Next Section`
    const result = convertMarkdownToHTML(markdown)
    expect(result).toContain('</table>')
    expect(result).toContain('<h1>Next Section</h1>')
  })
})

describe('wrapInPrintableHTML', () => {
  it('wraps content in full HTML document', () => {
    const result = wrapInPrintableHTML('<p>Test</p>')
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('<html>')
    expect(result).toContain('</html>')
  })

  it('includes default title', () => {
    const result = wrapInPrintableHTML('<p>Test</p>')
    expect(result).toContain('<title>Resume</title>')
  })

  it('uses custom title', () => {
    const result = wrapInPrintableHTML('<p>Test</p>', 'My Custom Title')
    expect(result).toContain('<title>My Custom Title</title>')
  })

  it('includes print-optimized CSS', () => {
    const result = wrapInPrintableHTML('<p>Test</p>')
    expect(result).toContain('@page')
    expect(result).toContain('@media print')
  })

  it('includes body content', () => {
    const result = wrapInPrintableHTML('<h1>Resume</h1><p>Content</p>')
    expect(result).toContain('<h1>Resume</h1><p>Content</p>')
  })

  it('includes font-family styles', () => {
    const result = wrapInPrintableHTML('<p>Test</p>')
    expect(result).toContain('font-family')
    expect(result).toContain('Calibri')
  })

  it('includes table styles', () => {
    const result = wrapInPrintableHTML('<table></table>')
    expect(result).toContain('border-collapse')
  })
})

describe('printMarkdownAsPDF', () => {
  let mockWindow: any
  let mockOpen: any
  let mockCreateObjectURL: any
  let mockRevokeObjectURL: any

  beforeEach(() => {
    vi.useFakeTimers()

    mockWindow = {
      print: vi.fn(),
      onload: null as any
    }

    mockOpen = vi.fn().mockReturnValue(mockWindow)
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url')
    mockRevokeObjectURL = vi.fn()

    vi.stubGlobal('window', { open: mockOpen })
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('opens a new window with blob URL', () => {
    printMarkdownAsPDF('# Test')
    expect(mockOpen).toHaveBeenCalledWith('blob:test-url', '_blank')
  })

  it('creates blob from HTML content', () => {
    printMarkdownAsPDF('# Test')
    expect(mockCreateObjectURL).toHaveBeenCalled()
  })

  it('calls print on window load', () => {
    printMarkdownAsPDF('# Test')

    // Simulate window load
    if (mockWindow.onload) {
      mockWindow.onload()
    }

    expect(mockWindow.print).toHaveBeenCalled()
  })

  it('revokes object URL after timeout', () => {
    printMarkdownAsPDF('# Test')

    vi.advanceTimersByTime(5000)

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url')
  })

  it('uses custom title', () => {
    printMarkdownAsPDF('# Test', 'Custom Title')
    expect(mockCreateObjectURL).toHaveBeenCalled()
  })

  it('handles null window gracefully', () => {
    mockOpen.mockReturnValue(null)

    // Should not throw
    expect(() => printMarkdownAsPDF('# Test')).not.toThrow()
  })
})
