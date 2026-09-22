# Coverage and geographic precision

The release lists 36 Maharashtra districts across six revenue divisions. District inventory, aliases and supported border settlements are in `server/districts.mjs`. `server/coverage-catalog.mjs` exposes a searchable subset of place aliases and an explicit coverage contract. Aliases such as Sawantwadi, Navi Mumbai and Marunji (Pune / Mulshi context) are navigation hints, not a village registry.

## What a result means

A place search returns district candidates. For example, Navi Mumbai returns both Thane and Raigad because the name spans district contexts. A user must choose the relevant district. The result does not establish a verified municipal boundary or imply that every resident of the district is affected.

Always read the original CAP affected-area description and geometry. Geography from an alert identifies its stated affected area, whereas a place-search alias is navigation metadata. The two are not interchangeable.

## Alert map (CAP geometry)

The homepage map plots **active relayed alerts** from `/api/alerts`:

- **Orange polygons** use official CAP `polygon` rings when the collector includes them.
- **Blue district dots** are approximate representative points when an alert lists districts but no polygon — they are not village or ward boundaries. This includes active CAP whose external `FetchPolygonXMLFile` URL is blocked (HTTP 403) or invalid; bulletin text and LGD districts remain.
- Basemap tiles are from [MapLibre demo tiles](https://demotiles.maplibre.org/) for orientation only; they are not government survey data.

The bulletin text, issuer, expiry and official links remain the only authoritative presentation of an alert.

## Optional situational layers (feature-flagged)

When `SITUATIONAL_LAYERS_ENABLED=true` on the worker, `/api/situational` proxies:

- **USGS** earthquake GeoJSON (last 7 days, M≥2.5) clipped to the **region pack** bounding box (`web/region.json`; Maharashtra in this sample).
- **NASA FIRMS** VIIRS heat detections when `FIRMS_MAP_KEY` is configured.

These layers use distinct map styling from official CAP alerts and are **off by default in production**. They do not create or modify relayed alert records.

## Border policy

Maharashtra border locations remain part of their Maharashtra districts. An incident outside the state can still have an officially declared impact within it; use the issuing authority's affected-area data. Never fabricate a Maharashtra impact from distance, earthquake magnitude or neighboring-state names. Goa and other neighboring states are not listed as Maharashtra districts.

## Explicit gaps

- No complete versioned LGD village/ward/local-body dataset is bundled.
- Existing aliases are not an authoritative registry and are not guaranteed exhaustive or unique.
- No precise-location tracking or automated background geofencing.
- Not every district, gram panchayat or municipality publishes a consumable public feed.
- A service directory is not a live incident feed.
- Source outages, empty feeds and absent village-level data never indicate an all-clear condition.

## Adding exact localities

Import a dated official LGD export with its provenance, permitted use, row count and checksums. Validate state membership, unique entity-type/code pairs, renamed entities and many-to-many municipal coverage before enabling precise search. Boundary geometry requires separate provenance and point/area matching tests. Do not synthesize LGD codes from district aliases or confuse Census codes with LGD codes.
