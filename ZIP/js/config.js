// V0.9.0 Release Candidate — configuração central da aplicação
(function(){
  const info = {
    name: "Assistente Jogos Santa Casa",
    version: "0.9.0",
    label: "V0.9.0",
    build: "2026.07.09",
    codename: "Release Candidate",
    slug: "release-candidate",
    environment: "Production",
    backend: "Supabase",
    push: "Firebase",
    cloud: true
  };

  const config = {
    API: "https://jogos-santa-casa-api.onrender.com",
    BACKEND_API: "https://jogos-santa-casa-backend.onrender.com",
    SUPABASE_URL: "https://whnokdkqobtgyywqmrju.supabase.co",
    SUPABASE_KEY: "sb_publishable_t1ONYEGH_h11uFDENsINJw_RqlNxcpc",
    SUPABASE_HISTORICO: "historico_premios",
    SUPABASE_APOSTAS: "apostas_guardadas",
    SUPABASE_V67_PROFILES: "profiles",
    SUPABASE_V67_DEVICES: "devices",
    SUPABASE_V67_PUSH_SUBSCRIPTIONS: "push_subscriptions",
    SUPABASE_V68_PUSH_ENGINE_RUNS: "push_engine_runs",
    VAPID_PUBLIC_KEY: "BLIiD2ChRw0XwhWFES1hjpu7qwUfItr5fEjBxcLMKTSatPAS-1OkhQSjTgKA4q3gafiY2Dhxi6UX9wpFd_jQwp4"
  };

  window.APP_INFO = info;
  window.APP_VERSION = `v${info.version}-${info.slug}`;
  window.JSC_CONFIG = config;
})();
