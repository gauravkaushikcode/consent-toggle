# Privacy Policy — Consent Toggle

**Effective date:** 2026-05-29

Consent Toggle is a browser extension that helps you set the toggles inside a
website's cookie / consent preferences dialog to OFF or ON in one click.

## What we collect

**Nothing.**

Consent Toggle does not collect, transmit, sell, share, or store any personal
information, browsing history, page contents, form data, or analytics. All
processing happens **locally in your browser**, only on the tab where you
explicitly trigger the extension (by clicking its toolbar icon or pressing its
keyboard shortcut).

The extension does not include any analytics SDK, telemetry, remote-config
endpoint, or tracking pixel. It does not embed remote code; all JavaScript it
runs is included in the extension package itself.

## Permissions used and why

- **`activeTab`** — grants the extension temporary access to the tab you are
  currently viewing, only after you explicitly invoke it. We use this to read
  and modify the cookie-consent dialog's DOM on that tab. Access is revoked
  automatically when you navigate away.
- **`scripting`** — required to inject the consent-toggling engine into the
  active tab on user gesture.

Consent Toggle declares no `host_permissions` and does not run automatically
when pages load.

## Third parties

Consent Toggle does not use any third-party service or library that processes
user data.

## Open source

Consent Toggle is open source under the
[MIT License](https://github.com/gauravkaushikcode/consent-toggle/blob/main/LICENSE).
You can inspect, audit, and modify the source at
<https://github.com/gauravkaushikcode/consent-toggle>.

## Changes to this policy

Any changes to this policy will be published at this same URL and noted in the
project's
[CHANGELOG](https://github.com/gauravkaushikcode/consent-toggle/blob/main/CHANGELOG.md).

## Contact

Open an issue at
<https://github.com/gauravkaushikcode/consent-toggle/issues>.
