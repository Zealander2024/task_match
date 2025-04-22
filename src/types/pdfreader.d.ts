declare module 'pdfreader' {
  export class PdfReader {
    constructor();
    parseBuffer(buffer: ArrayBuffer): Promise<void>;
    on(event: 'text', callback: (data: { text: string }) => void): void;
    on(event: 'end', callback: () => void): void;
  }
}