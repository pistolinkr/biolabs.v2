import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { formatFastApiDetail, formatNvidiaFetchError } from "./nvidiaError.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("nvidiaError", () => {
  it("formats FastAPI detail array", () => {
    const raw = JSON.parse(readFileSync(join(here, "__fixtures__", "fastapi-422.json"), "utf8")) as {
      detail: unknown;
    };
    const s = formatFastApiDetail(raw.detail);
    expect(s).toContain("body.sequence");
    expect(s).toContain("field required");
  });

  it("formatNvidiaFetchError never drops to URL-only", () => {
    const msg = formatNvidiaFetchError({
      ok: false,
      status: 422,
      data: JSON.parse(readFileSync(join(here, "__fixtures__", "fastapi-422.json"), "utf8")),
      text: "",
      requestUrl: "https://health.api.nvidia.com/v1/biology/x",
    });
    expect(msg).toMatch(/^HTTP 422/);
    expect(msg).toContain("field required");
    expect(msg).toContain("health.api");
  });
});
