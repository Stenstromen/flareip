import { describe, expect, it, vi } from "vitest";
import {
  generateHexId,
  generateUniqueHexId,
} from "../generate_hex_id.js";

describe("generate_hex_id", () => {
  it("generateHexId returns a 4-character lowercase hex string", () => {
    for (let i = 0; i < 20; i++) {
      const id = generateHexId();
      expect(id).toMatch(/^[0-9a-f]{4}$/);
    }
  });

  it("generateUniqueHexId skips IDs that already exist", () => {
    const mappings = { a1b2: "https://example.com" };
    const randomSpy = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0xa1b2 / 0xffff)
      .mockReturnValueOnce(0x00ff / 0xffff);

    const id = generateUniqueHexId(mappings);
    expect(id).toBe("00ff");
    expect(randomSpy).toHaveBeenCalledTimes(2);
    randomSpy.mockRestore();
  });

  it("generateUniqueHexId throws after too many collisions", () => {
    const mappings: Record<string, string> = {};
    for (let i = 0; i < 0xffff; i++) {
      mappings[i.toString(16).padStart(4, "0")] = "https://example.com";
    }
    // Ensure the full 0000-fffe range is taken; ffff may still be free depending
    // on loop bounds, so take that too.
    mappings["ffff"] = "https://example.com";

    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    expect(() => generateUniqueHexId(mappings)).toThrow(
      /Unable to generate unique hex ID/
    );
    randomSpy.mockRestore();
  });
});
