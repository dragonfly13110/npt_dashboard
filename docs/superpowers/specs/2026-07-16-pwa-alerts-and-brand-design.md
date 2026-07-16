# PWA Alerts and Brand Design

## Goal

Make the existing PWA reliable, add standard Web Push notifications for outbreak and fire-hotspot events, and replace the app icon with a trustworthy green-and-gold `NPT` leaf mark.

## Scope

### Reliable PWA foundation

- Run the PWA end-to-end test against a production build, not the Vite development server.
- Keep service-worker registration production-only and handle registration failure without breaking app startup.
- Ship installable 192×192 and 512×512 PNG icons alongside the existing manifest.
- Verify installation, offline app-shell reopening, service-worker updates, and notification deep links.
- Address only measured first-load bundle bottlenecks that affect the install/open experience.

### Brand mark

- Use a restrained, trustworthy government-service style.
- Combine the letters `NPT` with a simple agricultural leaf.
- Use dark green as the primary color with a small gold accent.
- Keep `NPT` readable at mobile icon size and avoid seals, shields, gradients, and fine detail.
- Produce a square master image and derive the required PWA icon sizes from it.

### Web Push alerts

- Ask for notification permission only after an explicit user action.
- Let users subscribe independently to outbreak alerts and fire-hotspot alerts.
- Let users select the district or area they follow.
- Store push subscriptions and alert preferences in Supabase.
- Use a Netlify Scheduled Function to check existing outbreak and hotspot data sources.
- Create a stable event key from source, event type, location, and source identifier/time so the same event is sent once.
- Send notifications through standard Web Push using server-side VAPID credentials.
- Open the relevant existing dashboard page when a notification is tapped.
- Remove expired subscriptions when the push provider reports them as gone.

## Data Flow

1. The installed PWA registers its service worker.
2. The user opens notification settings, chooses alert types and an area, then grants permission.
3. The browser creates a push subscription; the app stores it with the user's preferences in Supabase.
4. A scheduled Netlify function reads the existing outbreak and hotspot feeds.
5. New events are deduplicated, matched to preferences, and sent through Web Push.
6. The service worker displays the notification and routes a click to the relevant page.

## Safety and Failure Handling

- Never include personal or confidential data in notification payloads.
- API and authenticated responses remain excluded from service-worker caches.
- Permission denial does not block normal app use.
- A failed source check or push send is logged and retried on the next schedule; other sources continue.
- VAPID private keys remain server-side in environment variables.
- Supabase policies restrict subscription access to its owner; scheduled delivery uses server credentials.

## Verification

- Existing PWA unit tests pass.
- PWA E2E passes against `vite preview`, including offline reload.
- Tests cover subscribe/unsubscribe, preference matching, event deduplication, expired subscriptions, notification display, and deep linking.
- Manual checks cover Android/Chrome and an installed iOS/Safari PWA.
- Production build completes without introducing a new client dependency except the minimum Web Push client/server support required.

## Out of Scope

- Native Android or iOS applications.
- Offline forms or full offline datasets.
- General announcements, weather alerts, SMS, email, or LINE notifications.
- A new outbreak or hotspot data provider; the implementation reuses existing application sources.
- Unrelated dashboard redesign or broad performance refactoring.

## Delivery Order

1. Fix the production-mode PWA feedback loop.
2. Create and integrate the approved logo and icon sizes.
3. Add subscription storage and notification settings.
4. Add event detection, deduplication, and scheduled delivery.
5. Add notification display/deep links and complete cross-device verification.
