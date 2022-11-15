export enum PageLinks {
  Settings = "/settings",
  EnterRoom = "/enter-room",
  CreateRoom = "/create-room",
  CreateShares = "/create-shares",
  TimeLock = "/time-lock",
}

export enum DurationFormat {
  MINUTES = "minutes",
  HOURS = "hours",
  DAYS = "days",
  MONTHS = "months",
  YEARS = "years",
}

export type TimeLockServerErrorResponse = {
  statusCode?: number;
  message?: string;
};

export type TimeLockServerSuccessStatusResponse = {
  success?: true;
  message?: string;
  key?: {
    unlock_at?: string | null;
    delete_at?: string;
  };
};

export type TimeLockServerUnlockSuccessReponse = {
  status: "STARTED" | "PENDING" | "UNLOCKED";
  key: {
    uuid?: string;
    encrypted_partial_data?: string;
    iv?: string;
    lock_duration_seconds?: string;
    unlock_at: string;
    delete_at: string;
  };
};

export type TimeLockServerUnlockApiReponse =
  | TimeLockServerUnlockSuccessReponse
  | TimeLockServerErrorResponse;

export type TimeLockServerStatusApiResponse =
  | TimeLockServerSuccessStatusResponse
  | TimeLockServerErrorResponse;

export type TimeLockServerCreateKeyResult = {
  server?: TimeLockServer;
  uuid?: string;
};

export type TimeLockServerInfoForShare = {
  results: TimeLockServerCreateKeyResult[];
  iv: string;
};

export type TimeLockServerInfoWithShare = {
  share: string;
  timeLock: TimeLockServerInfoForShare;
};

export interface TimeLockServer {
  base_url?: string;
  authentication?: TimeLockAuthentication;
  routes?: TimeLockRoutes;
}

export interface TimeLockAuthentication {
  headers?: TimeLockAuthHeaders;
  body: TimeLockAuthBody;
}

export type TimeLockAuthHeaders = Record<string, string>;

export type TimeLockAuthBody = Record<string, string>;

export type TimeLockServerCreateKeyApiReponse = {
  success?: boolean;
  message?: string;
  key?: {
    uuid?: string;
    unlock_at?: null;
    delete_at?: string;
  };
};

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
