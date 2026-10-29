// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventCard } from "../event-card";
import { makeEvent } from "@/lib/events/__tests__/fixtures";

describe("EventCard", () => {
  it("renders real fields: title, date, location, category, provenance", () => {
    render(<EventCard event={makeEvent()} />);

    const link = screen.getByRole("link", { name: /Nigeria Energy Week/ });
    expect(link).toHaveAttribute("href", "https://bushdrum.com/e/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");

    expect(screen.getByText("Tue, 3 Nov 2026, 10:00")).toBeInTheDocument();
    expect(screen.getByText("Eko Hotel · Lagos")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("via Bushdrum")).toBeInTheDocument();
    expect(screen.getByText(/Energy industry gathering\./)).toBeInTheDocument();
  });

  it("shows the provider's explicit free statement", () => {
    render(<EventCard event={makeEvent({ isFree: true })} />);
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("shows a known price range in the event currency", () => {
    render(
      <EventCard event={makeEvent({ isFree: false, priceMin: 1000, priceMax: 5000, currency: "NGN" })} />,
    );
    expect(screen.getByText("₦1,000 – ₦5,000")).toBeInTheDocument();
    expect(screen.queryByText("Paid")).not.toBeInTheDocument();
  });

  it("says Paid only when the provider explicitly states it and no price exists", () => {
    render(<EventCard event={makeEvent({ isFree: false })} />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("omits the price entirely when nothing is known", () => {
    render(<EventCard event={makeEvent({ isFree: null })} />);
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
    expect(screen.queryByText("Paid")).not.toBeInTheDocument();
  });

  it("shows the Online badge only when the provider marks the event online", () => {
    const { rerender } = render(<EventCard event={makeEvent({ isOnline: true })} />);
    expect(screen.getByText("Online")).toBeInTheDocument();

    rerender(<EventCard event={makeEvent({ isOnline: null })} />);
    expect(screen.queryByText("Online")).not.toBeInTheDocument();
  });

  it("renders the end date when present", () => {
    render(<EventCard event={makeEvent({ endDate: "2026-11-06T18:00:00+01:00" })} />);
    expect(screen.getByText(/ends Fri, 6 Nov 2026/)).toBeInTheDocument();
  });

  it("degrades missing fields to absence instead of placeholder text", () => {
    render(
      <EventCard
        event={makeEvent({ description: null, venue: null, imageUrl: null, endDate: null })}
      />,
    );
    expect(screen.queryByText(/TBA|unknown|null|N\/A/i)).not.toBeInTheDocument();
    expect(screen.getByText("Lagos")).toBeInTheDocument();
    expect(document.querySelector("img")).not.toBeInTheDocument();
  });

  it("renders provider images through the image component", () => {
    render(<EventCard event={makeEvent({ imageUrl: "https://nawhe.com/media/event.webp" })} />);
    const img = document.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("nawhe.com");
  });

  it("uses a plain lazy img for hosts outside the optimizer allowlist", () => {
    // Real bushdrum payloads point at arbitrary organizer CDNs; the page must
    // render them without a server-side proxy (and without crashing).
    render(
      <EventCard
        event={makeEvent({ imageUrl: "https://eventvibb.com/wp-content/uploads/summit.webp" })}
      />,
    );
    const img = document.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://eventvibb.com/wp-content/uploads/summit.webp");
    expect(img?.getAttribute("loading")).toBe("lazy");
    // Not routed through /_next/image (no optimizer proxying for unknown hosts).
    expect(img?.getAttribute("src")).not.toContain("_next/image");
  });
});
