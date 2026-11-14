import { describe, it, expect, afterAll } from "vitest";
import { logger } from "../src/lib/logger";
import fs from "node:fs";
import path from "node:path";

describe("Logger Service", () => {
  const errorLogPath = path.resolve(process.cwd(), "logs", "error.log");
  const appLogPath = path.resolve(process.cwd(), "logs", "app.log");

  it("should write info logs to app.log", () => {
    const testMsg = "Test Info Message " + Date.now();
    logger.info(testMsg, { testKey: "testValue" });

    expect(fs.existsSync(appLogPath)).toBe(true);
    const content = fs.readFileSync(appLogPath, "utf-8");
    expect(content).toContain(testMsg);
    expect(content).toContain("[INFO]");
    expect(content).toContain("testValue");
  });

  it("should write error logs to both error.log and app.log", () => {
    const testErrMsg = "Test Error Message " + Date.now();
    const testErr = new Error("Simulated Database Error");
    logger.error(testErrMsg, testErr, { context: "unit-test" });

    expect(fs.existsSync(errorLogPath)).toBe(true);
    const errContent = fs.readFileSync(errorLogPath, "utf-8");
    expect(errContent).toContain(testErrMsg);
    expect(errContent).toContain("[ERROR]");
    expect(errContent).toContain("Simulated Database Error");
    expect(errContent).toContain("unit-test");
  });
});

