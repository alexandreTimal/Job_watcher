let verbose = false;

export function setVerbose(v: boolean): void {
  verbose = v;
}

export function createLogger(source: string) {
  const tag = source.toUpperCase();

  const format = (level: string, message: string): string => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${tag}] ${level}: ${message}`;
  };

  return {
    info: (message: string) => console.log(format('INFO', message)),
    warn: (message: string) => console.warn(format('WARN', message)),
    error: (message: string, context?: Record<string, unknown>) => {
      const ctx = context ? ` ${JSON.stringify(context)}` : '';
      console.error(format('ERROR', `${message}${ctx}`));
    },
    debug: (message: string) => {
      if (verbose) {
        console.log(format('DEBUG', message));
      }
    },
  };
}
