import { faker } from "@faker-js/faker";

export function generateFromTemplate(
    template: string,
    wordBank: Record<string, string[]>
): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) =>
        faker.helpers.arrayElement(wordBank[key] ?? [key])
    );
}
