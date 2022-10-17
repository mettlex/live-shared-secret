export const zeroPad64Bytes = (data: Uint8Array): Uint8Array => {
  const bytes = new Uint8Array(64);
  bytes.set(data, 0);

  for (let i = data.length; i < bytes.length - data.length; i++) {
    bytes[i] = 0;
  }

  return bytes;
};

export const zeroPadStringTo64 = (text: string): string => {
  return new TextDecoder().decode(
    zeroPad64Bytes(new TextEncoder().encode(text)),
  );
};

export const zeroPadBy64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);

  if (bytes.length < 65) {
    return zeroPadStringTo64(text);
  }

  const remainder = text.length % 64;

  return text
    .slice(0, text.length - remainder)
    .concat(zeroPadStringTo64(text.slice(text.length - remainder)));
};
