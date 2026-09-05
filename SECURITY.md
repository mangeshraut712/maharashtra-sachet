# Security policy

Do not use this independent relay as your only warning channel. No government authority or guaranteed delivery is claimed.

Report vulnerabilities privately through the repository owner's GitHub contact or private vulnerability reporting if enabled. Do not post credentials, private source records or exploit payloads against the public deployment. Include the affected commit, expected/actual behaviour and a sanitized local reproduction.

Release blockers include executable upstream content, TLS bypass, unsafe redirects, missing status/scope filtering, cross-issuer cancellation, false severity/instructions, source failures displayed as an all clear, and persisted snapshots regressing after concurrent ingestion.

Public API routes are read-only. A future notification or report mutation API requires separate authentication/abuse controls and a reviewed privacy policy. New sources must have bounded response sizes and deadlines, approved hosts/paths, validated schema and deterministic outage tests.
