# Explanation

## What was the bug?

`HttpClient.request()` in `src/httpClient.ts` failed to refresh the OAuth2 token when `oauth2Token` was a plain object (e.g. `{ accessToken: "stale", expiresAt: 0 }`) rather than a proper `OAuth2Token` instance. This caused API requests to be sent without an Authorization header.

## Why did it happen?

The refresh condition used a combined truthiness and `instanceof` check:

```typescript
if (
  !this.oauth2Token ||
  (this.oauth2Token instanceof OAuth2Token && this.oauth2Token.expired)
)
```

When `oauth2Token` is a plain object:

1. `!this.oauth2Token` is `false` because plain objects are truthy.
2. `this.oauth2Token instanceof OAuth2Token` is `false` because the object was not constructed with `OAuth2Token`.

Both branches are `false`, so `refreshOAuth2()` is never called. The subsequent `instanceof` guard also fails, so no Authorization header is set.

## Why does your fix solve it?

The fix restructures the condition to two checks:

```typescript
if (
  !(this.oauth2Token instanceof OAuth2Token) ||
  this.oauth2Token.expired
)
```

`instanceof` returns `false` for `null`, plain objects, and any non-`OAuth2Token` value, so the first check covers all invalid token states in a single expression. The second check handles valid tokens that have expired. Together, a refresh is triggered for every case that needs one — without redundant checks.

## One realistic edge case the tests don't cover

The tests don't cover **concurrent requests racing against token expiry**, where one request finds the token valid while another finds it expired in the same tick. In a real system with async I/O, this could cause redundant refreshes or stale token usage.
