import { describe, it, expect } from "vitest";
import postcssConfig from "../../postcss.config.js";
import tailwindConfig from "../../tailwind.config.js";

describe("Build configs", () => {
  it("exposes the PostCSS plugin map", () => {
    expect(postcssConfig).toBeTruthy();
    expect(postcssConfig.plugins).toMatchObject({
      tailwindcss: {},
      autoprefixer: {},
    });
  });

  it("defines the Tailwind theme tokens", () => {
    expect(tailwindConfig.content).toEqual(
      expect.arrayContaining(["./index.html", "./src/**/*.{js,ts,jsx,tsx}"])
    );
    expect(tailwindConfig.theme.extend.colors.nm_bg).toBe("#050816");
    expect(tailwindConfig.theme.extend.borderRadius.card).toBe("26px");
  });
});
