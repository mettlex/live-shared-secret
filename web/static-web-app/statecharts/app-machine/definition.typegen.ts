// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  internalEvents: {
    "xstate.init": { type: "xstate.init" };
  };
  invokeSrcNameMap: {};
  missingImplementations: {
    actions:
      | "changeColorScheme"
      | "storeColorScheme"
      | "setNavOpen"
      | "setNavClosed"
      | "storeServerlessApiAccessToken"
      | "storeServerlessApiBaseUrl"
      | "restoreColorScheme"
      | "loadSettingsFromStorage";
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    changeColorScheme: "COLOR_SCHEME_CHANGED";
    loadSettingsFromStorage: "SETTINGS_REQUESTED";
    restoreColorScheme: "xstate.init";
    setNavClosed: "CLOSED_NAV";
    setNavOpen: "OPENED_NAV";
    storeColorScheme: "COLOR_SCHEME_CHANGED";
    storeServerlessApiAccessToken: "SERVERLESS_API_ACCESS_TOKEN_CHANGED";
    storeServerlessApiBaseUrl: "SERVERLESS_API_BASE_URL_CHANGED";
  };
  eventsCausingServices: {};
  eventsCausingGuards: {};
  eventsCausingDelays: {};
  matchesStates: "AppStarted" | "Settings";
  tags: never;
}
