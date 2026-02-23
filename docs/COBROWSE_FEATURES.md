# Cobrowse.io — Feature Reference & Platform SDK Guide

This document is the **complete feature reference** for Cobrowse.io capabilities, platform SDKs, and configuration options relevant to GroTap's web and future native mobile apps.

**GroTap integration specifics:** For JWT auth, API routes, session audit, and CSP config, see `docs/COBROWSE.md`.

**Official docs:** https://docs.cobrowse.io

---

## 1. Overview

Cobrowse.io provides real-time screen sharing and remote support. Features split between two sides:

| Side | What it does | Who uses it |
|------|-------------|-------------|
| **Client SDK** | Embedded in web/mobile apps. Captures screen, handles consent, enforces redaction. | End users (GroTap customers) |
| **Agent SDK / Dashboard** | Connects to client sessions. Provides annotations, remote control, device management. | Support agents (GroTap team) |

The client SDK runs entirely on the user's device — Cobrowse.io uses peer-to-peer streaming where possible. Redacted data never leaves the device.

---

## 2. Capabilities Reference

Capabilities are string keys set in `CobrowseIO.capabilities` before calling `start()`. Including a key enables it; omitting it disables it.

### 2.1 Complete Capability Matrix

| Key | Category | Description | Web | iOS | Android | RN | Flutter | .NET |
|-----|----------|-------------|-----|-----|---------|-----|---------|------|
| `drawing` | Annotation | Freehand drawing on user's screen | Yes | Yes | Yes | Yes | Yes | Yes |
| `laser` | Annotation | Temporary laser pointer | Yes | Yes | Yes | Yes | Yes | Yes |
| `disappearing_ink` | Annotation | Auto-fading marks (few seconds) | **Web only** | No | No | No | No | No |
| `rectangles` | Annotation | Rectangle shape tool | Yes | Yes | Yes | Yes | Yes | Yes |
| `arrows` | Annotation | Arrow shape tool | Yes | Yes | Yes | Yes | Yes | Yes |
| `cursor` | Remote Control | Render agent cursor on client | Yes | Yes | Yes | Yes | Yes | Yes |
| `pointer` | Remote Control | Agent can point and click/tap | Yes | Yes | Yes | Yes | Yes | Yes |
| `keypress` | Remote Control | Agent can generate key events | Yes | Yes | Yes | Yes | Yes | Yes |
| `scroll` | Remote Control | Agent can scroll pages | **Web only** | No | No | No | No | No |
| `select` | Remote Control | Agent can select text | **Web only** | No | No | No | No | No |
| `full_device` | Device Mode | Share beyond app to full OS | Yes | Yes | Yes | Yes | Yes | Yes |
| `universal` | Co-browsing | Follow user to third-party sites | Yes | N/A | N/A | N/A | N/A | N/A |

### 2.2 Configuration Example (Web)

```javascript
CobrowseIO.capabilities = [
  'cursor', 'drawing', 'laser', 'rectangles', 'arrows',
  'pointer', 'keypress', 'scroll', 'select',
  'full_device'
];
CobrowseIO.start();
```

### 2.3 Agent-Side Tool Switching

Agents using the Agent SDK (iframe integration) can switch tools programmatically:

```javascript
remoteContext.setTool('laser');
remoteContext.setTool('drawing');
remoteContext.clearAnnotations();
```

---

## 3. Data Redaction

Redaction ensures sensitive data (PII, passwords, financial info) **never leaves the user's device**. Redacted elements appear as black boxes to the agent.

### 3.1 Web

**CSS selector-based:**

```javascript
// Simple selectors
CobrowseIO.redactedViews = ['.redacted', '#sensitive-field', 'input[type=password]'];

// URL-scoped selectors (different rules per page)
CobrowseIO.redactedViews = {
  'https://example.com/account*': ['.balance', '.ssn'],
  'https://example.com/checkout*': ['.card-number']
};

// Un-redaction (reveal sub-elements inside redacted containers)
CobrowseIO.unredactedViews = ['.visible-inside-redacted'];
```

Full CSS selector standard is supported. Centralized configuration also available via the Cobrowse dashboard (Redaction Playground).

### 3.2 iOS (UIKit + SwiftUI)

```swift
// UIKit
sensitiveView.cobrowseRedacted()

// SwiftUI
TextField("SSN", text: $ssn).cobrowseRedacted()

// Protocol-based (per view controller)
class MyVC: UIViewController, CobrowseIORedacted {
    func redactedViews() -> [UIView] { return [sensitiveView] }
}

// Delegate-based (global)
func cobrowseRedactedViews(for vc: UIViewController) -> [UIView] { ... }

// WebView content redaction
CobrowseIO.instance().webviewRedactedViews = [".redacted"]
```

### 3.3 Android

```java
// Interface-based
class MyActivity implements CobrowseIO.Redacted {
    public List<View> redactedViews() { return Arrays.asList(sensitiveView); }
}

// Jetpack Compose (requires additional dependency)
// implementation 'io.cobrowse:cobrowse-sdk-android-compose-ui:2.+'
Modifier.redacted()

// WebView content redaction
CobrowseIO.instance().webviewRedactedViews(new String[] { ".redacted" });
```

### 3.4 React Native

```jsx
import { Redacted, Unredacted } from 'cobrowse-sdk-react-native';

<Redacted><Text>Sensitive content</Text></Redacted>
<Unredacted><Text>Visible inside redacted parent</Text></Unredacted>
```

### 3.5 Flutter

```dart
Redacted(child: TextField(/* sensitive field */))
```

### 3.6 .NET Mobile (MAUI)

```csharp
// iOS: implement ICobrowseIORedacted, return UIView[] from RedactedViews
// Android: implement CobrowseIO.IRedacted, return IList<View> from RedactedViews()
// MAUI: custom Effect class CobrowseRedactedViewEffect

CobrowseIO.Instance.WebViewRedactedViews = new string[] { ".redacted" };
```

---

## 4. Session Initiation Methods

### 4.1 Six-Digit Codes

Codes expire after approximately 20 minutes. Generate only when the user wants to start a session.

```javascript
// Web
CobrowseIO.createSessionCode().then(code => console.log('Code:', code));
```

```swift
// iOS (Swift)
CobrowseIO.instance().createSession { error, session in
    print(session?.code() ?? "")
}
```

```java
// Android (Java)
CobrowseIO.instance().createSession((err, session) -> {
    Log.i("App", "Code: " + session.code());
});
```

```javascript
// React Native
const session = await CobrowseIO.createSession();
console.log('Code:', session.code);
```

```dart
// Flutter
Session session = await CobrowseIO.instance.createSession();
print('Code: ${session.code}');
```

```csharp
// .NET / Windows
Session session = await CobrowseIO.Instance.CreateSession();
Console.WriteLine("Code: {0}", session.Code);
```

### 4.2 One-Click Connect (Device Listing)

Agent sees the customer's device listed in the dashboard or CRM integration. Clicks Connect, customer accepts the consent prompt.

Requires `CobrowseIO.customData` to be set with identifying information (user_id, user_email, etc.).

### 4.3 Session Links (SMS/Email)

Agent sends a URL via SMS or email. Customer clicks to join. Supports personalized landing pages.

### 4.4 Push Notifications (FCM)

Uses Firebase Cloud Messaging for silent push — no visible notification shown. User must have the app open in foreground.

```swift
// iOS
CobrowseIO.setDeviceToken(deviceToken)
```

```java
// Android
CobrowseIO.instance().setDeviceToken(getApplication(), token);
CobrowseIO.instance().onPushNotification(remoteMessage.getData());
```

```javascript
// React Native / Flutter
CobrowseIO.deviceToken = "<FCM token>";
```

### 4.5 Bring Your Own Channel

Fully custom initiation through existing communication channels using the Agent SDK APIs.

### 4.6 Agent SDK (Programmatic)

```javascript
const cobrowse = new CobrowseAPI(jwtToken);
const session = await cobrowse.sessions.create();
console.log('Session code:', session.code);
```

---

## 5. Remote Control Consent

By default, a consent dialog is shown when an agent requests remote control. This can be customized per platform:

| Platform | Customization Method |
|----------|---------------------|
| Web | Override `CobrowseIO.confirmRemoteControl` — return a Promise |
| iOS | Implement `cobrowseHandleRemoteControlRequest:` from `CobrowseIODelegate` |
| Android | Implement `CobrowseIO.RemoteControlRequestDelegate` |
| React Native | Override `CobrowseIO.handleRemoteControlRequest` |
| Flutter | Use stream listeners with `setRemoteControl(RemoteControlState.on)` |

The consent dialog can be disabled entirely by admins in Cobrowse dashboard account settings.

**Agent SDK (programmatic):**

```javascript
await session.setRemoteControl('on');   // 'on', 'off', or 'rejected'
```

---

## 6. Full Device Mode

Full device mode extends the session beyond the app/browser to the entire operating system.

### 6.1 Screen Sharing Setup

| Platform | Extra Setup | Notes |
|----------|------------|-------|
| Web | None | Toggle appears during active session. Redaction/annotation/remote control disabled in full device mode. Not available on mobile browsers. |
| iOS | Broadcast Extension | Requires Broadcast Upload Extension target in Xcode, Keychain Sharing for `io.cobrowse` group, `CBIOBroadcastExtension` key in Info.plist. Physical device only. |
| Android | None | Toggle during active session. Requires Google Play Media Projection API declaration form. |
| macOS | None | Toggle during active session |
| Windows | None | Toggle during active session |
| React Native / Flutter / .NET | Follow iOS/Android setup | Inherits platform requirements |

### 6.2 Full Device Remote Control

| Platform | Supported | Notes |
|----------|-----------|-------|
| Android | Yes | SDK v2.16.0+, Accessibility Service in AndroidManifest, API 21+ |
| Windows | Yes | Enabled by default |
| macOS | Yes | Requires user consent |
| iOS | **No** | Apple platform restrictions prevent full device remote control |

### 6.3 Programmatic Activation

```javascript
// Web
await session.setFullDevice('requested');
```

```swift
// iOS (Swift)
session.setFullDevice(.requested)
```

```java
// Android (Java)
session.setFullDevice(Session.FullDeviceState.Requested, callback);
```

```javascript
// React Native
await session.setFullDevice(true);
```

```dart
// Flutter
await session.setFullDevice(FullDeviceState.on);
```

```csharp
// .NET
session.SetFullDevice(FullDeviceState.On, callback);
```

Full device mode can be enabled/disabled globally from Account Settings in the Cobrowse dashboard.

---

## 7. Agent Present Mode

Reverses the typical flow: the **agent shares their screen** with the customer instead of viewing the customer's screen.

**Use cases:** Product demos, guided walkthroughs, onboarding presentations.

### 7.1 Setup

1. Cobrowse dashboard → Settings → Session Settings → Present Mode (toggle on)
2. Access via sidebar icon or `https://cobrowse.io/dashboard/present`

### 7.2 Sharing Methods

| Method | How it works |
|--------|-------------|
| **Share Desktop** | Agent clicks "Share my Desktop", selects screen/window/tab, shares the generated link with users. Not supported on mobile browsers. |
| **Share a Different Device** | Agent generates a 6-digit code, enters it into a Cobrowse-enabled app via `CobrowseIO.getSession("<code>")`, then shares the present link with the user. |

### 7.3 Content Restriction

- SDK redaction rules apply (restrict what end-users can see)
- IFrame-based sharing limits visibility to only the iframe content

---

## 8. AI Virtual Agent Co-browse

Cobrowse.io provides developer tools to equip AI bots with the ability to see and interact with the user's screen.

### 8.1 Client Configuration

```javascript
CobrowseIO.virtualAgent = 'my-agent-identifier';
CobrowseIO.start();
```

Once activated, chat and voice widgets automatically appear on the page.

### 8.2 Agent Types

| Type | Description |
|------|-------------|
| **Trial** | Free testing with restricted conversation limits, duration, and concurrent sessions. Auto-conducts web searches for support info. |
| **Production** | Connected to ElevenLabs API key. Unlimited usage. Requires configured knowledge base. |

### 8.3 Production Agent Customization

- Telephony functionality
- Conversation behavior and personality
- Voice selection and modification
- Widget branding and appearance
- MCP (Model Context Protocol) integrations
- Display name visible to users

### 8.4 Developer Tools

| Tool | Purpose |
|------|---------|
| Agent SDK (`cobrowse-agent-sdk` npm) | Build custom dashboards, query devices/sessions, control iframes |
| RemoteContext API | `setTool()`, `setFullDevice()`, `setRemoteControl()`, `endSession()`, `clearAnnotations()` |
| REST APIs | Sessions, devices, recordings, and user management |

AI agents have access to the full co-browsing toolkit (drawing, annotations, pointers).

**Platform support:** Web, Android, iOS, and Desktop.

**Billing:** Virtual agent sessions are billed separately from standard Cobrowse usage.

---

## 9. Platform SDK Reference

### 9.1 SDK Matrix

| Platform | Package / Install | Min Version |
|----------|-------------------|-------------|
| **Web** | `npm install cobrowse-sdk-js` or CDN `<script>` tag | Chrome 105+, Firefox 142+, Safari 11+, Edge 139+ |
| **iOS** | SPM: `cobrowse-sdk-ios-binary`, CocoaPods: `pod 'CobrowseIO', '~>3'`, Carthage, Manual xcframework | iOS 12.0+ |
| **Android** | Gradle: `implementation 'io.cobrowse:cobrowse-sdk-android:3.+'` | API 19 (Android 4.4)+ |
| **React Native** | `npm install cobrowse-sdk-react-native` then `cd ios && pod install` | iOS 12.0+, Android API 19+ |
| **Flutter** | `cobrowse_sdk_flutter: ^1.0.0` in pubspec.yaml | iOS 12.0+, Android API 24 (7.0)+ |
| **.NET Mobile (MAUI)** | NuGet: `CobrowseIO.DotNet` | iOS 12.0+, Android API 21 (5.0)+ |
| **macOS** | SPM / CocoaPods (same as iOS) | macOS 10.13+ |
| **Windows** | NuGet: `CobrowseIO.Windows` | .NET Framework 4.6+ / .NET Core 3+ / .NET 5.0+, Windows 7+ (x86/x64) |

**Extras:**
- **Jetpack Compose:** `implementation 'io.cobrowse:cobrowse-sdk-android-compose-ui:2.+'`
- **SwiftUI:** Built into the standard iOS SDK — use `.cobrowseRedacted()` and `.cobrowseSelector()` modifiers

### 9.2 Initialization Per Platform

**Web:**

```javascript
CobrowseIO.license = "your-license-key";
CobrowseIO.customData = { user_id: "123", user_name: "John", user_email: "john@example.com" };
CobrowseIO.capabilities = ['cursor', 'drawing', 'keypress', 'laser', 'pointer', 'scroll', 'select'];
CobrowseIO.redactedViews = ['.sensitive', 'input[type=password]'];
CobrowseIO.client().then(() => CobrowseIO.start());
```

**iOS (Swift):**

```swift
CobrowseIO.instance().license = "your-license-key"
CobrowseIO.instance().customData = [
    CBIOUserIdKey: "123",
    CBIOUserNameKey: "John",
    CBIOUserEmailKey: "john@example.com"
]
CobrowseIO.instance().start()
```

**Android (Java):**

```java
CobrowseIO.instance().license("your-license-key");
HashMap<String, String> data = new HashMap<>();
data.put("user_id", "123");
data.put("user_name", "John");
data.put("user_email", "john@example.com");
CobrowseIO.instance().customData(data);
CobrowseIO.instance().start();
```

**React Native:**

```javascript
CobrowseIO.license = "your-license-key";
CobrowseIO.customData = { user_id: "123", user_name: "John" };
CobrowseIO.start();
```

**Flutter:**

```dart
CobrowseIO.instance.license = "your-license-key";
CobrowseIO.instance.customData = { "user_id": "123", "user_name": "John" };
await CobrowseIO.instance.start();
```

**.NET Mobile:**

```csharp
CobrowseIO.Instance.License = "your-license-key";
CobrowseIO.Instance.CustomData = new Dictionary<string, string> {
    { "user_id", "123" }, { "user_name", "John" }
};
CobrowseIO.Instance.Start();
```

---

## 10. SDK Configuration Reference

### 10.1 Client SDK Properties (Web)

| Property | Type | Description |
|----------|------|-------------|
| `CobrowseIO.license` | `string` | License key from Cobrowse dashboard (required) |
| `CobrowseIO.customData` | `object` | Key-value pairs for device identification and filtering |
| `CobrowseIO.capabilities` | `string[]` | Array of enabled capability keys (see section 2) |
| `CobrowseIO.redactedViews` | `string[]` or `object` | CSS selectors for redaction; object form for URL-scoped rules |
| `CobrowseIO.unredactedViews` | `string[]` | CSS selectors to un-redact within redacted containers |
| `CobrowseIO.trustedOrigins` | `string[]` | Allowed parent origins for cross-document iframe communication |
| `CobrowseIO.universalLinks` | `string[]` or `regex[]` | URL patterns for universal co-browse activation |
| `CobrowseIO.virtualAgent` | `string` | Agent identifier for AI virtual agent integration |
| `CobrowseIO.deviceToken` | `string` | FCM token for push-based session initiation |
| `CobrowseIO.webviewRedactedViews` | `string[]` | CSS selectors for redacting content within webviews |

### 10.2 Standard customData Fields

| Key | Description |
|-----|-------------|
| `user_id` | User identifier (searchable in dashboard) |
| `user_name` | User's display name |
| `user_email` | User's email address |
| `device_id` | Device identifier |
| `device_name` | Device display name |
| (custom) | Any additional key-value pairs (all searchable and filterable) |

### 10.3 CSP Requirements (Web)

When using Content Security Policy headers, add:

```
connect-src: cobrowse.io *.cobrowse.io wss://*.cobrowse.io
script-src: js.cobrowse.io
```

GroTap's CSP is configured in `src/api/app.js` via Helmet — see `docs/COBROWSE.md` section 6.

### 10.4 Agent SDK Configuration

```javascript
const CobrowseAPI = require('cobrowse-agent-sdk');
const cobrowse = new CobrowseAPI(jwtToken, {
    api: 'https://custom-instance.com'  // only for self-hosted Enterprise
});
```

Agent SDK properties: `api`, `token`, `license`, `devices`, `sessions`, `recordings`, `users`.

---

## 11. GroTap Integration Status

### Currently Implemented (Web Only)

| Component | Status | Details |
|-----------|--------|---------|
| Client SDK loading | Live | CDN dynamic load in `src/dashboard/public/js/cobrowse.js` |
| License key config | Live | Via `COBROWSE_API_TOKEN` env var → `/api/cobrowse/config` |
| JWT agent auth | Live | RS256 signing in `src/api/lib/cobrowse.js` |
| Session audit trail | Live | `cobrowse_sessions` table with RLS |
| Support button | Live | Floating "?" on 7 authenticated pages |
| CSP config | Live | Helmet allows `js.cobrowse.io` + `cobrowse.io` |
| 12 tests | Live | `tests/routes/cobrowse.test.js` |

### Not Yet Configured

| Feature | Status | When to Add |
|---------|--------|-------------|
| Capabilities array | Not set | Configure in `js/cobrowse.js` when enabling annotation/remote control |
| Data redaction | Not set | Add `CobrowseIO.redactedViews` rules for PII fields |
| Remote control consent | Default | Customize when support workflows are defined |
| Full device mode | Disabled | Enable when needed for advanced support |
| Universal co-browsing | Disabled | Enable if users navigate to third-party sites during support |
| AI virtual agent | Not configured | Add `CobrowseIO.virtualAgent` when AI support is ready |

### Mobile App Integration (Future)

When GroTap mobile apps (iOS/Android) are built:

1. Add the platform SDK (see section 9.1)
2. Set `license` and `customData` matching web config
3. Configure `capabilities` array
4. Add redaction for sensitive fields
5. Set up push notifications for session initiation (section 4.4)
6. If using full device mode on iOS, add Broadcast Extension (section 6.1)
7. Wire session events back to `/api/cobrowse/sessions` for audit trail continuity

See `docs/COBROWSE.md` for the server-side integration that mobile apps will share with the web dashboard.
