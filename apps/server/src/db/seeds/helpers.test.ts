import { test, expect, describe } from "bun:test";
import { generateFromTemplate } from "./helpers";

describe("generateFromTemplate", () => {
    test("replaces a single slot with a value from the word bank", () => {
        const result = generateFromTemplate("{artist} releases new album", {
            artist: ["Taylor Swift"],
        });
        expect(result).toBe("Taylor Swift releases new album");
    });

    test("replaces multiple slots independently", () => {
        const result = generateFromTemplate("{artist} collaborates with {collab}", {
            artist: ["Kendrick Lamar"],
            collab: ["Drake"],
        });
        expect(result).toBe("Kendrick Lamar collaborates with Drake");
    });

    test("picks randomly from word bank entries", () => {
        const options = ["A", "B", "C", "D", "E", "F"];
        const results = new Set(
            Array.from({ length: 50 }, () =>
                generateFromTemplate("{x}", { x: options })
            )
        );
        expect(results.size).toBeGreaterThan(1);
    });

    test("leaves unknown slots as their key name", () => {
        const result = generateFromTemplate("Hello {unknown}", {});
        expect(result).toBe("Hello unknown");
    });

    test("replaces same slot used twice", () => {
        const result = generateFromTemplate("{team} beats {team}", {
            team: ["Arsenal"],
        });
        expect(result).toBe("Arsenal beats Arsenal");
    });
});
