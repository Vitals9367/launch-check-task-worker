export class NucleiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NucleiError";
  }
}
