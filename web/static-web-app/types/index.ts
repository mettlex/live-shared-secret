export enum PageLinks {
  Settings = "/settings",
  EnterRoom = "/enter-room",
  CreateRoom = "/create-room",
  CreateShares = "create-shares",
}

export interface TimeLockServer {
  base_url?: string;
  authentication?: TimeLockAuthentication;
  routes?: TimeLockRoutes;
}

export interface TimeLockAuthentication {
  headers?: TimeLockHeaders;
}

export interface TimeLockHeaders {
  API_ACCESS_TOKEN?: string;
}

export interface TimeLockRoutes {
  CREATE?: string;
  DELETE?: string;
  GET_TIME?: string;
  READ?: string;
  STATUS?: string;
  UNLOCK?: string;
  UPDATE?: string;
}

export type TimeLockProvider = {
  servers: TimeLockServer[];
};

export type ErrorResponse = {
  success: boolean;
  message: string;
};

export type PublicShare = {
  encrypted_share_text: string;
  public_key: string;
};

export type RoomData = {
  min_share_count: number;
  public_key?: string;
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
  encryptedShare: string;
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
      type: "ENCRYPTED_SHARE_CHANGED";
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
