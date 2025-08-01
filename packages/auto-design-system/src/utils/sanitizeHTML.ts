import DOMPurify from 'dompurify';

export const sanitizeHTML = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'b',
      'i',
      'em',
      'strong',
      'a',
      'ul',
      'ol',
      'li',
      'br',
      'img',
      'pre',
      'code',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|data:image\/)/,
  });
};
