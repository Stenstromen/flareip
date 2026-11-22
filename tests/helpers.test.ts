import { describe, expect, it } from "vitest";
import {
  applyBtIp,
  bencode,
  buildMagnet,
  bytesToHex,
  concatBytes,
  decodeQueryValueToBytes,
  escapeHtml,
  formatBtIpMessage,
  getRawQueryParam,
  isIPv6Address,
  isTextBasedUserAgent,
} from "../ip_worker";

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("concatBytes", () => {
  it("concatenates multiple chunks in order", () => {
    const result = concatBytes([
      new Uint8Array([1, 2]),
      new Uint8Array([3]),
      new Uint8Array([4, 5]),
    ]);
    expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns an empty array for no chunks", () => {
    expect(concatBytes([])).toEqual(new Uint8Array([]));
  });
});

describe("bencode", () => {
  it("encodes strings with byte length prefix", () => {
    expect(decodeUtf8(bencode("spam"))).toBe("4:spam");
  });

  it("encodes empty strings", () => {
    expect(decodeUtf8(bencode(""))).toBe("0:");
  });

  it("encodes integers and truncates fractions", () => {
    expect(decodeUtf8(bencode(42))).toBe("i42e");
    expect(decodeUtf8(bencode(-7))).toBe("i-7e");
    expect(decodeUtf8(bencode(3.9))).toBe("i3e");
  });

  it("encodes raw byte strings by length", () => {
    expect(Array.from(bencode(new Uint8Array([0xff, 0x00])))).toEqual([
      0x32, 0x3a, 0xff, 0x00,
    ]);
  });

  it("encodes lists", () => {
    expect(decodeUtf8(bencode(["a", 1]))).toBe("l1:ai1ee");
  });

  it("encodes dictionaries with sorted keys", () => {
    expect(decodeUtf8(bencode({ cow: "moo", spam: "eggs" }))).toBe(
      "d3:cow3:moo4:spam4:eggse"
    );
  });

  it("skips undefined dictionary values", () => {
    expect(
      decodeUtf8(
        bencode({
          keep: "yes",
          drop: undefined as unknown as string,
        })
      )
    ).toBe("d4:keep3:yese");
  });
});

describe("bytesToHex", () => {
  it("converts bytes to lowercase hex", () => {
    expect(bytesToHex(new Uint8Array([0x0a, 0xff, 0x00]))).toBe("0aff00");
  });

  it("returns empty string for empty input", () => {
    expect(bytesToHex(new Uint8Array([]))).toBe("");
  });
});

describe("getRawQueryParam", () => {
  it("reads values with and without a leading question mark", () => {
    expect(getRawQueryParam("?info_hash=abc&event=started", "info_hash")).toBe(
      "abc"
    );
    expect(getRawQueryParam("info_hash=abc", "info_hash")).toBe("abc");
  });

  it("returns empty string for present keys without values", () => {
    expect(getRawQueryParam("?info_hash&x=1", "info_hash")).toBe("");
  });

  it("returns null when missing or search is empty", () => {
    expect(getRawQueryParam("?event=started", "info_hash")).toBeNull();
    expect(getRawQueryParam("", "info_hash")).toBeNull();
    expect(getRawQueryParam("?", "info_hash")).toBeNull();
  });

  it("preserves raw percent-encoding instead of decoding", () => {
    expect(getRawQueryParam("?info_hash=%00%ff", "info_hash")).toBe("%00%ff");
  });
});

describe("decodeQueryValueToBytes", () => {
  it("decodes percent-encoded bytes", () => {
    expect(Array.from(decodeQueryValueToBytes("%41%42"))).toEqual([
      0x41, 0x42,
    ]);
  });

  it("treats plus as space", () => {
    expect(Array.from(decodeQueryValueToBytes("a+b"))).toEqual([
      0x61, 0x20, 0x62,
    ]);
  });

  it("leaves invalid percent sequences as literal characters", () => {
    expect(Array.from(decodeQueryValueToBytes("%zz"))).toEqual([
      0x25, 0x7a, 0x7a,
    ]);
  });

  it("round-trips binary info hashes used by BitTorrent clients", () => {
    const raw =
      "%12%34%56%78%9a%bc%de%f0%12%34%56%78%9a%bc%de%f0%12%34%56%78";
    const bytes = decodeQueryValueToBytes(raw);
    expect(bytes.length).toBe(20);
    expect(bytesToHex(bytes)).toBe("123456789abcdef0123456789abcdef012345678");
  });
});

describe("IPv4 / IPv6 helpers", () => {
  it("detects IPv6 addresses by colon", () => {
    expect(isIPv6Address("2001:db8::1")).toBe(true);
    expect(isIPv6Address("203.0.113.1")).toBe(false);
  });

  it("stores IPv4 and IPv6 on the BitTorrent IP record", () => {
    let record = applyBtIp({}, "203.0.113.1");
    expect(record).toEqual({ ipv4: "203.0.113.1" });

    record = applyBtIp(record, "2001:db8::1");
    expect(record).toEqual({ ipv4: "203.0.113.1", ipv6: "2001:db8::1" });

    record = applyBtIp(record, "198.51.100.9");
    expect(record).toEqual({ ipv4: "198.51.100.9", ipv6: "2001:db8::1" });
  });

  it("formats dual-stack messages and falls back when empty", () => {
    expect(
      formatBtIpMessage(
        { ipv4: "203.0.113.1", ipv6: "2001:db8::1" },
        "unused"
      )
    ).toBe("IP: 203.0.113.1, 2001:db8::1");
    expect(formatBtIpMessage({ ipv4: "203.0.113.1" }, "unused")).toBe(
      "IP: 203.0.113.1"
    );
    expect(formatBtIpMessage({}, "203.0.113.9")).toBe("IP: 203.0.113.9");
  });
});

describe("isTextBasedUserAgent", () => {
  it("detects common CLI and bot agents", () => {
    for (const agent of [
      "curl/8.0.0",
      "Wget/1.21",
      "HTTPie/3.2.0",
      "python-requests/2.31.0",
      "Mozilla/5.0 (compatible; Googlebot/2.1)",
    ]) {
      expect(
        isTextBasedUserAgent(
          new Request("https://example.com", {
            headers: { "user-agent": agent },
          })
        )
      ).toBe(true);
    }
  });

  it("treats browsers and missing UA as non-text agents", () => {
    expect(
      isTextBasedUserAgent(
        new Request("https://example.com", {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
          },
        })
      )
    ).toBe(false);
    expect(isTextBasedUserAgent(new Request("https://example.com"))).toBe(
      false
    );
  });
});

describe("buildMagnet", () => {
  it("builds a magnet link with display name and tracker", () => {
    const magnet = buildMagnet(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      new URL("https://addr.se/bt")
    );
    expect(magnet).toContain(
      "magnet:?xt=urn:btih:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    );
    expect(magnet).toContain("dn=FlareIP%20BitTorrent%20IP%20Check");
    expect(magnet).toContain("tr=https%3A%2F%2Faddr.se%2Fbt");
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;'");
  });
});
