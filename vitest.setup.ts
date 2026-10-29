import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest globals are disabled, so Testing Library cannot register its own
// auto-cleanup hook — reset the DOM after every test explicitly.
afterEach(() => {
  cleanup();
});
