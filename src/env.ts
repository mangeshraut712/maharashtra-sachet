export {}

declare global {
  interface Env {
    DATA_GOV_IN_API_KEY?: string
    FIRMS_MAP_KEY?: string
    AQI_CITIES?: string
    JEV_API_KEY?: string
    JEV_GATEWAY_URL?: string
    JEV_USE_LIVE?: string
    JEV_SHADOW_KILL?: string
    cursor?: string
  }
}
