# Privacy

This release has no user accounts, advertising or individual analytics. It does not request GPS coordinates, contacts, photos or personal reports. Selected filters/language and the most recent public snapshot may be stored in the browser for convenience and offline use. Browser storage can be cleared in site settings.

Foreground notifications require the browser's permission and an explicit user action. No push-subscription endpoint is stored by this release. Closing the page stops application polling; no background delivery is guaranteed.

Cloudflare necessarily processes requests and operational metadata to serve the site. Structured application logs describe ingestion/request outcomes; the application must not log API keys, cookies, source bodies, personal locations or subscriber data. Hosting-provider retention and network logs are governed by the hosting account/provider, not eliminated by this application.

Official service links open other organizations' websites under their own privacy policies. No account credentials or redemption codes from the event are included in this repository or sent to those services.

`POST /api/explain` accepts alert text a visitor pastes. This is not a personal report form: there is no account, the text is not written to D1, and application logs do not include the text or the Gemini key. When `GEMINI_API_KEY` is configured, that text is sent to Google Gemini (`generativelanguage.googleapis.com`) to draft a summary. When the key is missing, or Gemini errors, the summary is produced on the server from keywords and is not sent to Google. The route is limited to 15 requests per minute per client and 60 per minute per runtime instance, rejects cross-origin browser calls, and caps the body at 20,000 bytes. In immediate danger, call 112. The original alert remains the authority.
