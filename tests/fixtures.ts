import { expect, test as base } from "@playwright/test";

const privateTerms = [
  "stressed",
  "anxious",
  "sad",
  "lonely",
  "angry",
  "hopeless",
  "grateful",
  "lost",
];

export const test = base.extend<{ networkAudit: void }>({
  networkAudit: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(baseURL ?? "http://127.0.0.1:3000").origin;
      const thirdPartyRequests: string[] = [];
      const privateLeaks: string[] = [];

      page.on("request", (request) => {
        const url = request.url();
        if (/^https?:/i.test(url) && new URL(url).origin !== origin) {
          thirdPartyRequests.push(`${request.method()} ${url}`);
        }

        const outgoing = `${url}\n${request.postData() ?? ""}`.toLowerCase();
        for (const term of privateTerms) {
          if (new RegExp(`\\b${term}\\b`, "i").test(outgoing)) {
            privateLeaks.push(`${term}: ${request.method()} ${url}`);
          }
        }
      });

      await use();
      expect(thirdPartyRequests, "Browser requests must stay on our origin").toEqual([]);
      expect(privateLeaks, "Feelings must never appear in request URLs or bodies").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
