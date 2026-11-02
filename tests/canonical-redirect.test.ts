import assert from "node:assert/strict";
import test from "node:test";
import { getCanonicalRedirect } from "../lib/canonical-redirect";

function redirectFor(url: string) {
  const response = getCanonicalRedirect(new Request(url));
  return response && { status: response.status, to: response.headers.get("location") };
}

test("sends www to the canonical host and keeps the path and query", () => {
  assert.deepEqual(redirectFor("https://www.tierlistmaker.win/share/abc?x=1"), {
    status: 301,
    to: "https://tierlistmaker.win/share/abc?x=1",
  });
});

test("sends plain HTTP on either host straight to HTTPS", () => {
  const expected = { status: 301, to: "https://tierlistmaker.win/" };

  assert.deepEqual(redirectFor("http://tierlistmaker.win/"), expected);
  assert.deepEqual(redirectFor("http://www.tierlistmaker.win/"), expected);
});

test("leaves the canonical address alone", () => {
  assert.equal(redirectFor("https://tierlistmaker.win/dashboard"), null);
});

test("leaves local and preview hosts alone, even over HTTP", () => {
  assert.equal(redirectFor("http://localhost:3001/"), null);
  assert.equal(
    redirectFor("https://abc-tier-list-maker.kalen.workers.dev/"),
    null,
  );
});
