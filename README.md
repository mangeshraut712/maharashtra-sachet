# Maharashtra Civic Alert Relay

Unofficial public-feed relay for **Maharashtra**: NDMA SACHET Common Alerting Protocol (CAP 1.2), IMD district nowcasts, INCOIS tsunami watches, CWC FloodWatch when the portal answers, and optional CPCB AQI.

It presents those **official** messages in a **US Wireless Emergency Alert** style (Presidential / Imminent Threat / AMBER / Public Safety / Weather advisory) so people can scan any kind of situation — cyclone, flood, landslide, earthquake, chemical, fire, health, missing child, heat — not weather only.

**This is not a government website.** It does not speak for NDMA, Maharashtra SDMA, IMD, CWC, INCOIS, CPCB, or any telecom operator. It **cannot** inject cell broadcasts or Wireless Emergency Alerts. India’s WEA analogue is NDMA SACHET + C-DOT cell broadcast, sent by SDMA through licensed operators (`XX-NDMAEW`). This project only **reads** what those agencies already publish.

## Can we build on it?

Yes — on every source below that already publishes a public feed. No — on cell-broadcast inject, IHIP outbreak push, Mission Vatsalya AMBER CB, or ERSS-112 dispatch. Those stay with government.

| Source | Role | Public consume? |
| --- | --- | --- |
| [NDMA SACHET](https://sachet.ndma.gov.in/) Maharashtra RSS + CAP XML | State multi-hazard CAP (SDMA is the sender) | **Yes** — RSS `rss_maharashtra.xml`, CAP `FetchXMLFile`, polygons `FetchPolygonXMLFile` (homepage cookie handshake) |
| [Maharashtra SDMA](https://sdma.maharashtra.gov.in/en/) | SEOC 11077 / +91-9321587143, DEOC 1070, policy | Helplines and guidance — no public push API |
| [IMD](https://mausam.imd.gov.in/) | District nowcast | **Yes** — public RSS. REST `api.imd.gov.in` needs a key + IP whitelist |
| [CWC FloodWatch](https://ffs.india-water.gov.in/) | River / reservoir | Best-effort JSON; the homepage often times out |
| [INCOIS ITEWC](https://tsunami.incois.gov.in/TEWS/searlywarnings.jsp) | Tsunami / large earthquakes | **Yes** — `past90days.json` (west-coast / M≥6.5 filter) |
| [CPCB AQI](https://airquality.cpcb.gov.in/AQI_India/) via [data.gov.in](https://data.gov.in) | Air quality | **Yes** with a personal API key |
| 112 / 1098 / 108 / 181 | Life-saving voice | Dial only |

## Run

Requires Node.js 20.11 or newer.

```bash
npm install
cp .env.example .env   # optional DATA_GOV_IN_API_KEY for AQI
npm start              # http://127.0.0.1:8787
```

`npm test` runs CAP parse, LGD, and WEA classification tests without the network.

## What the UI does (2026)

- Lock-screen style cards: **EMERGENCY ALERT**, class, source, until-when, instruction, **Call 112** (and **1098** on AMBER-style copy).
- Marathi / English toggle. SACHET already ships `hi` and `en-IN` CAP `info` blocks.
- All **36 districts**, grouped by revenue division, including renamed Ahilyanagar, Dharashiv, and Chhatrapati Sambhajinagar. Konkan includes **Sindhudurg** (Sawantwadi, Dodamarg, Tillari) and Kolhapur includes **Chandgad** — Maharashtra border gaons. **Goa state is not in this map** (North/South Goa LGD 551/552 are ignored).
- Region filters: Konkan, Vidarbha, Marathwada, Khandesh, Western Maharashtra, heat-vulnerable belt.
- Coverage grid on the home page: every district stays listed even when the live feed is quiet there.
- Situation filter (flood, chemical, missing child, heat, …), not a weather-only list.
- Leaflet map of CAP polygons when SACHET publishes them (`lat,lon` rings).
- Browser notifications + optional siren for Presidential / Imminent Threat / AMBER.
- PWA shell cache. Live `EventSource` `/api/alerts/live`.
- Relays only. Highest alertness still means: **official cell broadcast on your phone**, then 112.

## API

- `GET /api/health`
- `GET /api/meta` — districts, helplines, WEA classes
- `GET /api/coverage` — all 36 districts, live vs quiet, Goa exclusion note
- `GET /api/alerts?district=pune&region=konkan&class=IMMINENT_THREAT&kind=flood`
- `GET /api/alerts/live` — SSE

## Contribute alertness, not a parallel government

Useful civic work:

1. Keep this relay honest (disclaimer, ETags, no fake LGD codes, no pretending to be MSDMA).
2. File feed outages with NDMA SACHET / IMD / INCOIS instead of scraping private APIs.
3. Translate instructions into Marathi that match SDMA wording.
4. District collectors can still only **originate** CAP inside SACHET. This repo cannot grant that.

Do not add a “send alert to all phones” button. That path is SDMA → C-DOT CBS → TSPs.

## License

MIT. Government feed text remains copyright of the originating agency; this software only fetches and displays it.
