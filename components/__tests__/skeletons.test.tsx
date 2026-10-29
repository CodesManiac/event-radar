// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedSkeleton, ResultsSkeleton } from "../skeletons";

describe("feed skeletons", () => {
  it("announces the loading state to assistive tech", () => {
    render(<FeedSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading events…")).toBeInTheDocument();
  });

  it("renders a bounded set of card placeholders", () => {
    const { container } = render(<ResultsSkeleton />);
    // Six cards keeps first paint cheap regardless of page size.
    expect(container.querySelectorAll('[role="status"] > .grid > div')).toHaveLength(6);
  });
});
