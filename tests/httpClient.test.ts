import { HttpClient } from "../src/httpClient";
import { OAuth2Token } from "../src/tokens";
import { describe, test, expect } from "vitest";

describe("HttpClient OAuth2 behavior", () => {
  test("api=true sets Authorization header when token is valid", () => {
    const c = new HttpClient();
    c.oauth2Token = new OAuth2Token("ok", Math.floor(Date.now() / 1000) + 3600);

    const resp = c.request("GET", "/me", { api: true });

    expect(resp.headers.Authorization).toBe("Bearer ok");
  });

  test("api=true refreshes when token is missing", () => {
    const c = new HttpClient();
    c.oauth2Token = null;

    const resp = c.request("GET", "/me", { api: true });

    expect(resp.headers.Authorization).toBe("Bearer fresh-token");
  });

  test("api=true refreshes when token is a plain object", () => {
    // This is the key failing case — plain objects are truthy but not OAuth2Token instances.
    const c = new HttpClient();
    c.oauth2Token = { accessToken: "stale", expiresAt: 0 };

    const resp = c.request("GET", "/me", { api: true });

    expect(resp.headers.Authorization).toBe("Bearer fresh-token");
  });

  test("api=true refreshes when token is expired", () => {
    const c = new HttpClient();
    // expiresAt in the past triggers the expired getter
    c.oauth2Token = new OAuth2Token("old", 0);

    const resp = c.request("GET", "/me", { api: true });

    expect(resp.headers.Authorization).toBe("Bearer fresh-token");
  });

  test("api=false does not set Authorization header", () => {
    const c = new HttpClient();
    c.oauth2Token = new OAuth2Token("ok", Math.floor(Date.now() / 1000) + 3600);

    const resp = c.request("GET", "/public", { api: false });

    expect(resp.headers.Authorization).toBeUndefined();
  });

  test("request without opts does not set Authorization header", () => {
    const c = new HttpClient();
    c.oauth2Token = new OAuth2Token("ok", Math.floor(Date.now() / 1000) + 3600);

    const resp = c.request("GET", "/public");

    expect(resp.headers.Authorization).toBeUndefined();
  });

  test("api=true with empty plain object refreshes token", () => {
    const c = new HttpClient();
    c.oauth2Token = {};

    const resp = c.request("GET", "/me", { api: true });

    expect(resp.headers.Authorization).toBe("Bearer fresh-token");
  });
});