export class KatanaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KatanaError";
  }
}
