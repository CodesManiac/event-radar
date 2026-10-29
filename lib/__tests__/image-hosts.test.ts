import { describe, expect, it } from "vitest";
import { canOptimizeImage, OPTIMIZED_IMAGE_HOSTS } from "../image-hosts";

describe("canOptimizeImage", () => {
  it("accepts the https CDN hosts the optimizer is configured for", () => {
    for (const host of OPTIMIZED_IMAGE_HOSTS) {
      expect(canOptimizeImage(`https://${host}/photo.webp`)).toBe(true);
    }
  });

  it("rejects arbitrary organizer hosts, plain http, and junk", () => {
    expect(canOptimizeImage("https://eventvibb.com/wp-content/uploads/summit.webp")).toBe(false);
    expect(canOptimizeImage("http://nawhe.com/media/event.webp")).toBe(false);
    expect(canOptimizeImage("not a url")).toBe(false);
    expect(canOptimizeImage("")).toBe(false);
  });
});
