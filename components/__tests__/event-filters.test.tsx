// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventFilters } from "../event-filters";
import { makeQuery } from "@/lib/events/__tests__/fixtures";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push, prefetch: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => {
  push.mockClear();
});

describe("EventFilters", () => {
  it("marks the active city and category chips and composes their hrefs", () => {
    render(<EventFilters query={makeQuery({ city: "lagos", category: "music", keyword: "jazz" })} />);

    expect(screen.getByRole("link", { name: "Lagos" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Port Harcourt" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Music" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Sports" })).not.toHaveAttribute("aria-current");

    // City chips carry the category (and keyword) so filters compose.
    expect(screen.getByRole("link", { name: "Port Harcourt" })).toHaveAttribute(
      "href",
      "/?keyword=jazz&city=port-harcourt&category=music",
    );
    // Category chips carry the city (and keyword).
    expect(screen.getByRole("link", { name: "Sports" })).toHaveAttribute(
      "href",
      "/?keyword=jazz&city=lagos&category=sports",
    );
    // "All" chips clear exactly one dimension.
    expect(screen.getByRole("link", { name: "All events" })).toHaveAttribute(
      "href",
      "/?keyword=jazz&city=lagos",
    );
    expect(screen.getByRole("link", { name: "All Nigeria" })).toHaveAttribute(
      "href",
      "/?keyword=jazz&category=music",
    );
  });

  it("starts unfiltered with every All chip active and no clear link", () => {
    render(<EventFilters query={makeQuery()} />);
    expect(screen.getByRole("link", { name: "All Nigeria" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "All events" })).toHaveAttribute("aria-current", "true");
    expect(screen.queryByRole("link", { name: "Clear all filters" })).not.toBeInTheDocument();
  });

  it("keeps the feed working without JavaScript: plain GET form with hidden filters", () => {
    render(<EventFilters query={makeQuery({ city: "lagos", category: "music" })} />);

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/");
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getByRole("searchbox", { name: "Search events" })).toBeInTheDocument();
    const hidden = Array.from(form.querySelectorAll('input[type="hidden"]')).map((input) => [
      input.getAttribute("name"),
      input.getAttribute("value"),
    ]);
    expect(hidden).toEqual([
      ["city", "lagos"],
      ["category", "music"],
    ]);
  });

  it("submits a trimmed keyword client-side, preserving filters and resetting paging", async () => {
    const user = userEvent.setup();
    render(
      <EventFilters query={makeQuery({ city: "lagos", category: "music", page: 3, keyword: "old" })} />,
    );

    const input = screen.getByRole("searchbox", { name: "Search events" });
    await user.clear(input);
    await user.type(input, "  afrobeat  ");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(push).toHaveBeenCalledWith("/?keyword=afrobeat&city=lagos&category=music");
  });

  it("clears the keyword when submitting an empty search", async () => {
    const user = userEvent.setup();
    render(<EventFilters query={makeQuery({ keyword: "old", city: "lagos" })} />);

    await user.clear(screen.getByRole("searchbox", { name: "Search events" }));
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(push).toHaveBeenCalledWith("/?city=lagos");
  });

  it("offers a Clear all filters link only while filters are active", () => {
    const { rerender } = render(<EventFilters query={makeQuery({ city: "lagos" })} />);
    expect(screen.getByRole("link", { name: "Clear all filters" })).toHaveAttribute("href", "/");

    rerender(<EventFilters query={makeQuery()} />);
    expect(screen.queryByRole("link", { name: "Clear all filters" })).not.toBeInTheDocument();
  });
});
