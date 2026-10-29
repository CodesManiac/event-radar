// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventResults } from "../event-results";
import { EventsError } from "@/lib/events/types";
import { makeEvent, makePage, makeQuery } from "@/lib/events/__tests__/fixtures";

const getEvents = vi.hoisted(() => vi.fn());
vi.mock("@/lib/events/service", () => ({ getEvents }));
// The request-scope marker only exists inside the Next runtime.
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

beforeEach(() => {
  getEvents.mockReset();
  // Expected failures are logged by the service; keep test output clean.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("EventResults", () => {
  it("renders the grid, total, and pagination for a normal page", async () => {
    const events = [
      makeEvent({ id: "bushdrum:1", title: "Lagos Jazz Night" }),
      makeEvent({ id: "nawhe:2", source: "nawhe", title: "Tech Meetup" }),
    ];
    getEvents.mockResolvedValue(makePage({ total: 42, hasMore: true }, events));

    render(await EventResults({ query: makeQuery() }));

    expect(getEvents).toHaveBeenCalledWith(makeQuery());
    expect(screen.getByRole("heading", { name: /42 events/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lagos Jazz Night/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tech Meetup/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/?page=2");
    expect(screen.getByText(/Sorted by soonest first/)).toBeInTheDocument();
  });

  it("scopes the heading to the active city and category", async () => {
    getEvents.mockResolvedValue(makePage({ total: 1 }, [makeEvent()]));
    render(await EventResults({ query: makeQuery({ city: "lagos", category: "business" }) }));

    expect(
      screen.getByRole("heading", { name: /1 event in Lagos · Business/ }),
    ).toBeInTheDocument();
  });

  it("shows the unfiltered empty state when the feed has nothing", async () => {
    getEvents.mockResolvedValue(makePage({ total: 0 }, []));
    render(await EventResults({ query: makeQuery() }));

    expect(screen.getByRole("heading", { name: "No events found yet" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("offers a way out of a filtered empty state", async () => {
    getEvents.mockResolvedValue(makePage({ total: 0 }, []));
    render(await EventResults({ query: makeQuery({ city: "lagos", category: "music" }) }));

    expect(screen.getByRole("heading", { name: "No events match your filters" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/");
  });

  it("degrades provider failure to a friendly inline state with a retry", async () => {
    getEvents.mockRejectedValue(
      new EventsError("provider_unavailable", "We could not reach the event sources."),
    );

    render(await EventResults({ query: makeQuery({ city: "lagos" }) }));

    expect(screen.getByRole("heading", { name: "Couldn’t load events right now" })).toBeInTheDocument();
    expect(screen.getByText("We could not reach the event sources.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/?city=lagos",
    );
  });

  it("explains invalid URLs without leaking internals", async () => {
    getEvents.mockRejectedValue(new EventsError("invalid_query", "That page is beyond the results."));

    render(await EventResults({ query: makeQuery({ page: 9 }) }));

    expect(screen.getByRole("heading", { name: /isn’t valid/ })).toBeInTheDocument();
    expect(screen.getByText("That page is beyond the results.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("surfaces partial results when one provider is down", async () => {
    getEvents.mockResolvedValue(
      makePage(
        {
          total: 3,
          sources: [
            { source: "bushdrum", state: "error" },
            { source: "nawhe", state: "ok" },
          ],
        },
        [makeEvent()],
      ),
    );

    render(await EventResults({ query: makeQuery() }));

    expect(screen.getByText(/Partial results\./)).toBeInTheDocument();
    expect(screen.getByText(/Bushdrum didn’t respond/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lagos Jazz Night|Nigeria Energy Week/ })).toBeInTheDocument();
  });

  it("propagates unexpected errors to the route error boundary", async () => {
    getEvents.mockRejectedValue(new Error("boom"));
    await expect(EventResults({ query: makeQuery() })).rejects.toThrow("boom");
  });
});
