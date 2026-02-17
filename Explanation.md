# Explanation

## What was the bug?

The `HttpClient.request()` method in `src/httpClient.ts` failed to refresh the OAuth2 token when `oauth2Token` was a plain object (e.g. `{ accessToken: "stale", expiresAt: 0 }`) instead of a proper `OAuth2Token` class instance. This caused API requests to be sent without an Authorization header.

## Why did it happen?

The refresh condition used a combined truthiness and `instanceof` check:

```typescript
if (
  !this.oauth2Token ||
  (this.oauth2Token instanceof OAuth2Token && this.oauth2Token.expired)
)
```

When `oauth2Token` is a plain object:

1. `!this.oauth2Token` evaluates to `false` because plain objects are truthy.
2. `this.oauth2Token instanceof OAuth2Token` evaluates to `false` because the object was not constructed with `OAuth2Token`.

Both branches are `false`, so `refreshOAuth2()` is never called. The subsequent `instanceof` guard on line 28 also fails, so no Authorization header is set.

## Why does your fix solve it?

The fix restructures the condition to three explicit checks:

```typescript
if (
  !this.oauth2Token ||
  !(this.oauth2Token instanceof OAuth2Token) ||
  this.oauth2Token.expired
)
```

This triggers a refresh when the token is: (a) missing/null, (b) not a valid `OAuth2Token` instance (covers plain objects), or (c) expired. Any non-`OAuth2Token` value is now replaced with a fresh token before the Authorization header is set.

## One realistic edge case the tests don't cover

The tests don't cover **concurrent requests racing against token expiry** — where one request finds the token valid and another finds it expired in the same tick, or where `refreshOAuth2()` is called multiple times simultaneously. In a real system with async I/O, this race condition could cause redundant refreshes or stale token usage.
