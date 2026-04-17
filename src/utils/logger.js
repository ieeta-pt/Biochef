const isDev = process.env.NODE_ENV === "development";
// const isDev = false

const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
};

export default logger;