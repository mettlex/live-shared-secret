import { createMachine } from "xstate";
import { AppContext, AppEvent } from "../../types/index";

const appMachine = createMachine({
  id: "App",
  strict: true,
  predictableActionArguments: true,
  initial: "Home",
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
    GO_HOME: {
      actions: ["loadSettingsFromStorage"],
      target: "Home",
    },
    SERVERLESS_API_ACCESS_TOKEN_CHANGED: {
      actions: ["storeServerlessApiAccessToken"],
    },
    SERVERLESS_API_BASE_URL_CHANGED: {
      actions: ["storeServerlessApiBaseUrl"],
    },
  },
  tsTypes: {} as import("./definition.typegen").Typegen0,
  schema: {
    events: {} as AppEvent,
  },
  states: {
    Home: {
      entry: ["restoreColorScheme"],
      on: {
        SETTINGS_PAGE_REQUESTED: {
          target: "Settings",
        },
        SETTINGS_REQUESTED: {
          actions: ["loadSettingsFromStorage"],
          target: "SettingsLoaded",
        },
      },
    },
    SettingsLoaded: {
      on: {
        ROOM_REQUESTED: {
          target: "Room",
        },
      },
    },
    Settings: {
      entry: ["loadSettingsFromStorage"],
    },
    Room: {
      entry: ["loadSettingsFromStorage"],
      on: {},
    },
  },
});

export default appMachine;
