import sanitizeHtml from 'sanitize-html'

/** Email-safe HTML for the commissioner-editable recap block (and optional full-document mode). */
export function sanitizeRecapHtml(html: string): string {
  return sanitizeHtml(html.trim(), {
    transformTags: {
      // Normalise <p> margins so email clients don't double-space paragraphs.
      // 14px bottom gap only — no top margin — prevents the blank-line-between-paragraphs look.
      p: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          style: `margin:0 0 14px 0;padding:0;${attribs.style ? ' ' + attribs.style : ''}`,
        },
      }),
    },
    allowedTags: [
      'code',
      'pre',
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'del',
      'a',
      'ul',
      'ol',
      'li',
      'div',
      'span',
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'blockquote',
      'hr',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'style', 'target'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      td: ['colspan', 'rowspan', 'style'],
      th: ['colspan', 'rowspan', 'style'],
      '*': ['style', 'class'],
    },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb/, /^rgba/],
        'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb/, /^rgba/],
        'text-align': [/^left$/, /^right$/, /^center$/],
        'font-size': [/^\d+(?:px|em|%)$/],
        'font-weight': [/^bold$/, /^normal$/, /^\d+$/],
        margin: [/^\d+(?:px|em)?$/],
        'margin-top': [/^\d+(?:px|em)?$/],
        'margin-bottom': [/^\d+(?:px|em)?$/],
        padding: [/^\d+(?:px|em)?$/],
        width: [/^\d+(?:px|%)$/],
        'max-width': [/^\d+(?:px|%)$/],
        border: [/^.*$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    allowProtocolRelative: false,
  })
}
