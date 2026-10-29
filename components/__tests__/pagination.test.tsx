// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination } from "../pagination";
import { makePage, makeQuery } from "@/lib/events/__tests__/fixtures";

describe("Pagination", () => {
  it("offers only Next on the first page when more results exist", () => {
    render(<Pagination query={makeQuery()} page={makePage({ page: 1, hasMore: true })} />);

    expect(screen.queryByRole("link", { name: /Previous/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/?page=2");
    expect(screen.getByText("Page 1")).toBeInTheDocument();
  });

  it("walks forward and back while preserving every active filter", () => {
    const query = makeQuery({ city: "lagos", category: "music", keyword: "jazz", page: 2 });
    render(
      <Pagination
        query={query}
        page={makePage({ page: 2, hasMore: true }, [])}
      />,
    );

    expect(screen.getByRole("link", { name: /Previous/ })).toHaveAttribute(
      "href",
      "/?keyword=jazz&city=lagos&category=music",
    );
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      "/?keyword=jazz&city=lagos&category=music&page=3",
    );
    expect(screen.getByText("Page 2")).toBeInTheDocument();
  });

  it("disables both directions on a single, exhausted page", () => {
    render(<Pagination query={makeQuery()} page={makePage({ page: 1, hasMore: false })} />);

    expect(screen.queryByRole("link", { name: /Previous/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Next/ })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Previous|Next/)).toHaveLength(2);
    for (const control of screen.getAllByText(/Previous|Next/)) {
      expect(control).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("carries a non-default page size through both directions", () => {
    const query = makeQuery({ size: 30, page: 3 });
    render(<Pagination query={query} page={makePage({ page: 3, hasMore: true, size: 30 }, [])} />);

    expect(screen.getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "/?page=2&size=30");
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/?page=4&size=30");
  });
});
