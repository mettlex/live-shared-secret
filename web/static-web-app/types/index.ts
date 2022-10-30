export type PublicShare = {
  encrypted_share_text: string;
  public_key: string;
};

export type RoomData = {
  min_share_count: number;
  expires_in_seconds: number;
  encrypted_shares?: PublicShare[];
};

export type AppSettings = {
  serverlessApiAccessToken: string;
  serverlessApiBaseUrl: string;
};

export type AppContext = {
  colorScheme: "dark" | "light";
  isNavOpen: boolean;
} & AppSettings;

export type AppEvent =
  | {
      type: "xstate.init";
    }
  | {
      type: "COLOR_SCHEME_CHANGED";
      data: AppContext["colorScheme"];
    }
  | {
      type: "OPENED_NAV";
    }
  | {
      type: "CLOSED_NAV";
    }
  | {
      type: "SERVERLESS_API_ACCESS_TOKEN_CHANGED";
      data: string;
    }
  | {
      type: "SERVERLESS_API_BASE_URL_CHANGED";
      data: string;
    }
  | {
      type: "SETTINGS_REQUESTED";
    }
  | {
      type: "SETTINGS_PAGE_REQUESTED";
    }
  | {
      type: "ROOM_REQUESTED";
    }
  | {
      type: "GO_HOME";
    };
