import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

import { resetAppStore } from "../app/appStore";
import { invalidateApiCache } from "../shared/api/client";

afterEach(() => {
  invalidateApiCache();
  resetAppStore();
});
