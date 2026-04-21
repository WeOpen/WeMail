import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

import { resetAppStore } from "../app/appStore";

afterEach(() => {
  resetAppStore();
});
