const GNB_IMAGE_TOKEN_PATTERN = /^\[\[image:(https?:\/\/[^\]]+)\]\]$/i;

export interface GnbContentBlock {
  type: 'text' | 'image';
  value: string;
}

const getImageTokenUrl = (line: string): string | null => {
  const match = line.trim().match(GNB_IMAGE_TOKEN_PATTERN);
  return match ? match[1].trim() : null;
};

export const buildGnbContentImageToken = (imageUrl: string): string => `[[image:${imageUrl}]]`;

export const extractGnbContentImageUrls = (content?: string): string[] => {
  if (!content) return [];

  return content
    .split(/\r?\n/)
    .map((line) => getImageTokenUrl(line))
    .filter((url): url is string => Boolean(url));
};

export const stripGnbContentImages = (content?: string): string => {
  if (!content) return '';

  return content
    .split(/\r?\n/)
    .filter((line) => !getImageTokenUrl(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const parseGnbContent = (content?: string): GnbContentBlock[] => {
  if (!content) return [];

  const normalizedContent = content.replace(/\r\n/g, '\n');
  const lines = normalizedContent.split('\n');
  const blocks: GnbContentBlock[] = [];
  const textBuffer: string[] = [];

  const flushTextBuffer = () => {
    const textValue = textBuffer.join('\n').trim();
    if (textValue) {
      blocks.push({ type: 'text', value: textValue });
    }
    textBuffer.length = 0;
  };

  for (const line of lines) {
    const imageUrl = getImageTokenUrl(line);
    if (imageUrl) {
      flushTextBuffer();
      blocks.push({ type: 'image', value: imageUrl });
      continue;
    }

    textBuffer.push(line);
  }

  flushTextBuffer();
  return blocks;
};
