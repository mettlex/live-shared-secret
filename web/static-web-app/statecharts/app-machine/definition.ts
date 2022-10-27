import { createMachine } from "xstate";
import { AppContext, AppEvent } from "../../types/index";

const appMachine = createMachine({
  id: "App",
  strict: true,
  predictableActionArguments: true,
  initial: "AppStarted",
  context: {} as AppContext,
  on: {
    COLOR_SCHEME_CHANGED: {
      actions: ["changeColorScheme", "storeColorScheme"],
    },
    OPENED_NAV: {
      actions: ["setNavOpen"],
    },
    CLOSED_NAV: {
      actions: ["setNavClosed"],
    },
  },
  tsTypes: {} as import("./definition.typegen").Typegen0,
  schema: {
    events: {} as AppEvent,
  },
  states: {
    AppStarted: {
      entry: ["restoreColorScheme"],
      on: {
        SETTINGS_REQUESTED: {
          target: "Settings",
        },
      },
    },
    Settings: {
      entry: ["loadSettingsFromStorage"],
      on: {
        SERVERLESS_API_ACCESS_TOKEN_CHANGED: {
          actions: ["storeServerlessApiAccessToken"],
        },
        SERVERLESS_API_BASE_URL_CHANGED: {
          actions: ["storeServerlessApiBaseUrl"],
        },
      },
    },
  },
});

export default appMachine;
