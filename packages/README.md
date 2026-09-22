# Optional modules

Logical packages inside this MIT relay. They are not published to npm; forks copy the files.

| Module | Path | Default |
| --- | --- | --- |
| Region pack | `web/region.json` | Maharashtra sample (`in-mh`) |
| Geo / bbox | `web/modules/geo.mjs` | Generic |
| Map features | `web/modules/map-model.mjs` | Generic; needs a pack's centroids |
| MapLibre loader | `web/map-view.js` | Dynamic import; bulletin still works if it fails |
| Situational (USGS/FIRMS) | `server/situational.mjs` | **Off** in production |
| Jev System One shadow | `server/jev-shadow.mjs` | **Off** in production |

Enable situational or Jev only after reading [ARCHITECTURE.md](../docs/ARCHITECTURE.md), [FORKING.md](../docs/FORKING.md), and [JEV-SHADOW.md](../docs/JEV-SHADOW.md). CAP remains the sole public alert authority. Jev is a System One decision model, not a coding-agent LLM.
