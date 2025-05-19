export class LoggerService {
  private readonly red: '\x1b[31m';
  private readonly green: '\x1b[32m';
  private readonly blue: '\x1b[34m';

  constructor() {
    this.red = '\x1b[31m';
    this.green = '\x1b[32m';
    this.blue = '\x1b[34m';
  }
  log(message: string, data?: unknown) {
    console.log(this.green + `[LOG] ${message}`, data ?? '');
  }

  error(message: string, error?: unknown) {
    console.error(this.red + `[ERROR] ${message}`, error ?? '');
  }

  info(message: string, data?: unknown) {
    console.info(this.blue + `[INFO] ${message}`, data ?? '');
  }
}
