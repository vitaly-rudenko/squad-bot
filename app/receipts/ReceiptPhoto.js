export class ReceiptPhoto {
  /**
   * @param {{ binary: Buffer; mime: string }} input
   */
  constructor({ binary, mime }) {
    this.binary = binary
    this.mime = mime
  }
}
