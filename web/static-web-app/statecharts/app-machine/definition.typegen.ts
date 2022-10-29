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
      | "loadSettingsFromStorage"
      | "storeServerlessApiAccessToken"
      | "storeServerlessApiBaseUrl"
      | "restoreColorScheme";
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingActions: {
    changeColorScheme: "COLOR_SCHEME_CHANGED";
    loadSettingsFromStorage:
      | "GO_HOME"
      | "ROOM_REQUESTED"
      | "SETTINGS_PAGE_REQUESTED"
      | "SETTINGS_REQUESTED";
    restoreColorScheme: "GO_HOME" | "xstate.init";
    setNavClosed: "CLOSED_NAV";
    setNavOpen: "OPENED_NAV";
    storeColorScheme: "COLOR_SCHEME_CHANGED";
    storeServerlessApiAccessToken: "SERVERLESS_API_ACCESS_TOKEN_CHANGED";
    storeServerlessApiBaseUrl: "SERVERLESS_API_BASE_URL_CHANGED";
  };
  eventsCausingServices: {};
  eventsCausingGuards: {};
  eventsCausingDelays: {};
  matchesStates: "Home" | "Room" | "Settings" | "SettingsLoaded";
  tags: never;
}
