import fs from "node:fs";
import path from "node:path";

const LOGS_DIR = path.resolve(process.cwd(), "logs");
const ERROR_LOG_PATH = path.join(LOGS_DIR, "error.log");
const APP_LOG_PATH = path.join(LOGS_DIR, "app.log");

function ensureLogsDirectory() {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("[Logger] Could not create logs directory:", err);
  }
}

function formatLogMessage(
  level: "INFO" | "WARN" | "ERROR",
  message: string,
  error?: unknown,
  meta?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  let entry = `[${timestamp}] [${level}] ${message}\n`;

  if (error instanceof Error) {
    entry += `Stack: ${error.stack || error.message}\n`;
    if ("cause" in error && (error as { cause?: unknown }).cause) {
      const cause = (error as { cause?: unknown }).cause;
      entry += `Cause: ${typeof cause === "object" ? JSON.stringify(cause) : String(cause)}\n`;
    }
  } else if (error) {
    entry += `Details: ${typeof error === "object" ? JSON.stringify(error) : String(error)}\n`;
  }

  if (meta && Object.keys(meta).length > 0) {
    try {
      entry += `Meta: ${JSON.stringify(meta, null, 2)}\n`;
    } catch {
      entry += `Meta: [Unserializable Object]\n`;
    }
  }

  entry += `--------------------------------------------------------------------------------\n`;
  return entry;
}

function writeToFile(filePath: string, content: string) {
  try {
    ensureLogsDirectory();
    fs.appendFileSync(filePath, content, "utf-8");
  } catch (err) {
    console.error("[Logger] Failed to write to log file:", err);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    const log = formatLogMessage("INFO", message, undefined, meta);
    console.log(`[INFO] ${message}`);
    writeToFile(APP_LOG_PATH, log);
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    const log = formatLogMessage("WARN", message, undefined, meta);
    console.warn(`[WARN] ${message}`);
    writeToFile(APP_LOG_PATH, log);
  },

  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    const log = formatLogMessage("ERROR", message, error, meta);
    console.error(`[ERROR] ${message}`, error ?? "");
    writeToFile(APP_LOG_PATH, log);
    writeToFile(ERROR_LOG_PATH, log);
  },
};

