import routes from "../routes";
import {
  ErrorResponse,
  RoomData,
  TimeLockServerCreateKeyApiReponse,
  TimeLockServer,
  TimeLockServerCreateKeyResult,
  TimeLockServerStatusApiResponse,
  TimeLockServerErrorResponse,
  TimeLockServerSuccessStatusResponse,
  TimeLockServerUnlockApiReponse,
  TimeLockServerUnlockSuccessReponse,
} from "../types";

export const getRoomData = async ({
  roomId,
  token,
  url,
  setErrorText,
}: {
  roomId: string;
  token: string;
  url: string;
  setErrorText?: (errorText: string) => void;
}) => {
  const headers = new Headers();

  headers.append("API_ACCESS_TOKEN", token.trim());
  headers.append("Content-Type", "application/json");

  headers.append(
    "Access-Control-Request-Headers",
    Array.from(headers.keys()).join(","),
  );

  const body = JSON.stringify({
    room: {
      uuid: `${roomId}`,
    },
  });

  const requestOptions = {
    method: "POST",
    headers,
    body,
  };

  const response = await fetch(`${url}${routes.GET_ROOM}`, requestOptions);

  try {
    const data = (await response.json()) as
      | Partial<ErrorResponse>
      | Partial<RoomData>;

    const errorData = data as ErrorResponse;

    if (!errorData.success && errorData.message && setErrorText) {
      setErrorText(errorData.message);
      return;
    }

    return data;
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message:
        response.status === 403
          ? "Forbidden. API Access Token may be invalid."
          : "",
    } as ErrorResponse;
  }
};

export const createRoom = async ({
  roomId,
  minShareCount,
  publicKey,
  token,
  url,
  setErrorText,
}: {
  roomId: string;
  minShareCount: number;
  publicKey?: string;
  token: string;
  url: string;
  setErrorText?: (errorText: string) => void;
}) => {
  const headers = new Headers();

  headers.append("API_ACCESS_TOKEN", token.trim());
  headers.append("Content-Type", "application/json");

  headers.append(
    "Access-Control-Request-Headers",
    Array.from(headers.keys()).join(","),
  );

  const requestBody = {
    room: {
      uuid: roomId,
      min_share_count: minShareCount,
      public_key: publicKey,
    },
  };

  const body = JSON.stringify(requestBody);

  const requestOptions = {
    method: "POST",
    headers,
    body,
  };

  const response = await fetch(`${url}${routes.CREATE_ROOM}`, requestOptions);

  try {
    const data = (await response.json()) as Partial<ErrorResponse>;

    if (!data.success && data.message && setErrorText) {
      setErrorText(data.message);
      return;
    }

    return data;
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message:
        response.status === 403
          ? "Forbidden. API Access Token may be invalid."
          : "",
    } as ErrorResponse;
  }
};

export const addEncryptedShare = async ({
  roomId,
  encryptedShareText,
  publicKey,
  token,
  url,
  setErrorText,
}: {
  roomId: string;
  encryptedShareText: string;
  publicKey: string;
  token: string;
  url: string;
  setErrorText?: (errorText: string) => void;
}) => {
  const headers = new Headers();

  headers.append("API_ACCESS_TOKEN", token.trim());
  headers.append("Content-Type", "application/json");

  headers.append(
    "Access-Control-Request-Headers",
    Array.from(headers.keys()).join(","),
  );

  const requestBody = {
    room: {
      uuid: roomId,
    },
    encrypted_share: {
      encrypted_share_text: encryptedShareText,
      public_key: publicKey,
    },
  };

  const body = JSON.stringify(requestBody);

  const requestOptions = {
    method: "POST",
    headers,
    body,
  };

  const response = await fetch(
    `${url}${routes.ADD_ENCRYPTED_SHARE}`,
    requestOptions,
  );

  try {
    const data = (await response.json()) as Partial<ErrorResponse>;

    if (!data.success && data.message && setErrorText) {
      setErrorText(data.message);
      return;
    }

    return data;
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message:
        response.status === 403
          ? "Forbidden. API Access Token may be invalid."
          : "",
    } as ErrorResponse;
  }
};

export const getTimeLockServers = async ({
  token,
  url,
  setErrorText,
}: {
  token: string;
  url: string;
  setErrorText?: (errorText: string) => void;
}) => {
  const headers = new Headers();

  headers.append("API_ACCESS_TOKEN", token.trim());
  headers.append("Content-Type", "application/json");

  headers.append(
    "Access-Control-Request-Headers",
    Array.from(headers.keys()).join(","),
  );

  const requestOptions = {
    method: "GET",
    headers,
  };

  let response;

  try {
    response = await fetch(
      `${url}${routes.GET_TIME_LOCK_SERVERS}`,
      requestOptions,
    );

    const data = (await response.json()) as
      | Partial<ErrorResponse>
      | TimeLockServer[];

    if (data instanceof Array) {
      return data;
    } else if (!data.success && data.message && setErrorText) {
      setErrorText(data.message);
      return;
    }

    return data;
  } catch (error) {
    console.error(error);

    if (setErrorText) {
      setErrorText((error as any)?.message || error);
    }

    return {
      success: false,
      message:
        response?.status === 401 ? "API Access Token may be invalid." : "",
    } as ErrorResponse;
  }
};

export const createTimeLockKey = async ({
  timeLockServers,
  adminPassword,
  recoveryPassword,
  iv,
  encryptedPartialData,
  lockDurationInSeconds,
  setErrorText,
}: {
  timeLockServers: TimeLockServer[];
  adminPassword: string;
  recoveryPassword: string;
  iv: string;
  encryptedPartialData: string;
  lockDurationInSeconds: number;
  setErrorText: (errorText: string) => void;
}): Promise<TimeLockServerCreateKeyResult[]> => {
  const results = await Promise.all(
    timeLockServers
      .map(async (server) => {
        const { routes, base_url, authentication } = server;

        if (!routes || !base_url) {
          return undefined;
        }

        const { CREATE } = routes;

        const createUrl = `${base_url}${CREATE}`;

        const baseHeaders = {
          "Content-Type": "application/json",
        };

        try {
          const response = await fetch(createUrl, {
            method: "POST",
            headers: authentication?.headers
              ? {
                  ...authentication.headers,
                  ...baseHeaders,
                }
              : baseHeaders,
            body: JSON.stringify({
              ...(authentication?.body ? authentication.body : {}),
              admin_password: adminPassword,
              recovery_password: recoveryPassword,
              iv,
              encrypted_partial_data: encryptedPartialData,
              lock_duration_seconds: lockDurationInSeconds,
            }),
          });

          return {
            server,
            response:
              (await response.json()) as TimeLockServerCreateKeyApiReponse,
          };
        } catch (error) {
          console.error(error);
          setErrorText && setErrorText((error as any).message || error);
          return undefined;
        }
      })
      .map((p) =>
        p.catch((e) => {
          console.error(e);
          setErrorText(e.message || e);
        }),
      ),
  );

  return results.map((r) => ({
    uuid: r?.response?.key?.uuid,
    server: r?.server,
  }));
};

export const getKeyStatus = async ({
  results,
  setErrorText,
}: {
  results: TimeLockServerCreateKeyResult[];
  setErrorText: (errorText: string) => void;
}) => {
  for (const createApiResult of results) {
    const { server, uuid } = createApiResult;

    if (!server || !uuid) {
      setErrorText("Invaid Time-Lock Server Info");
      continue;
    }

    const { base_url, routes, authentication } = server;

    if (!routes) {
      setErrorText("Invaid Time-Lock Server Info");
      continue;
    }

    const { STATUS } = routes;

    const statusUrl = `${base_url}${STATUS}`;

    const baseHeaders = {
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(statusUrl, {
        method: "POST",
        headers: authentication?.headers
          ? {
              ...authentication.headers,
              ...baseHeaders,
            }
          : baseHeaders,
        body: JSON.stringify({
          ...(authentication?.body ? authentication.body : {}),
          uuid,
        }),
      });

      const statusApiResult =
        (await response.json()) as TimeLockServerStatusApiResponse;

      if (
        typeof (statusApiResult as TimeLockServerErrorResponse)?.statusCode ===
          "number" &&
        (statusApiResult as TimeLockServerErrorResponse)?.statusCode !== 200
      ) {
        setErrorText(
          `${(statusApiResult as TimeLockServerErrorResponse).statusCode}. ${
            statusApiResult.message
          }`,
        );

        continue;
      }

      if ((statusApiResult as TimeLockServerSuccessStatusResponse).key) {
        return statusApiResult as TimeLockServerSuccessStatusResponse;
      } else {
        return undefined;
      }
    } catch (error) {
      console.error(error);
      setErrorText((error as any)?.message || error);
    }
  }
};

export const deleteKey = async ({
  adminPassword,
  results,
  setErrorText,
}: {
  adminPassword: string;
  results: TimeLockServerCreateKeyResult[];
  setErrorText: (errorText: string) => void;
}) => {
  const responses = [];

  for (const createApiResult of results) {
    const { server, uuid } = createApiResult;

    if (!server || !uuid) {
      setErrorText("Invaid Time-Lock Server Info");
      continue;
    }

    const { base_url, routes, authentication } = server;

    if (!routes) {
      setErrorText("Invaid Time-Lock Server Info");
      continue;
    }

    const { DELETE } = routes;

    const deleteUrl = `${base_url}${DELETE}`;

    const baseHeaders = {
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(deleteUrl, {
        method: "POST",
        headers: authentication?.headers
          ? {
              ...authentication.headers,
              ...baseHeaders,
            }
          : baseHeaders,
        body: JSON.stringify({
          ...(authentication?.body ? authentication.body : {}),
          uuid,
          admin_password: adminPassword,
        }),
      });

      const deleteApiResult = await response.json();

      if (
        typeof (deleteApiResult as TimeLockServerErrorResponse)?.statusCode ===
          "number" &&
        (deleteApiResult as TimeLockServerErrorResponse)?.statusCode !== 200
      ) {
        setErrorText(
          `${(deleteApiResult as TimeLockServerErrorResponse).statusCode}. ${
            deleteApiResult.message
          }`,
        );

        continue;
      }

      if (deleteApiResult && deleteApiResult.success === true) {
        responses.push(deleteApiResult as { success: true });
      } else {
        responses.push({ success: false });
      }
    } catch (error) {
      console.error(error);
      setErrorText((error as any)?.message || error);
      responses.push({ success: false });
    }
  }

  return responses;
};

export const unlockKey = async ({
  recoveryPassword,
  results,
  setErrorText,
}: {
  recoveryPassword: string;
  results: TimeLockServerCreateKeyResult[];
  setErrorText: (errorText: string) => void;
}) => {
  for (const createApiResult of results) {
    const { server, uuid } = createApiResult;

    if (!server || !uuid) {
      setErrorText("Invaid Time-Lock Server Info");
      continue;
    }

    const { base_url, routes, authentication } = server;

    if (!routes) {
      setErrorText("Invaid Time-Lock Server Info");
      continue;
    }

    const { UNLOCK } = routes;

    const unlockUrl = `${base_url}${UNLOCK}`;

    const baseHeaders = {
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(unlockUrl, {
        method: "POST",
        headers: authentication?.headers
          ? {
              ...authentication.headers,
              ...baseHeaders,
            }
          : baseHeaders,
        body: JSON.stringify({
          ...(authentication?.body ? authentication.body : {}),
          uuid,
          recovery_password: recoveryPassword,
        }),
      });

      const unlockApiResult =
        (await response.json()) as TimeLockServerUnlockApiReponse;

      if (
        typeof (unlockApiResult as TimeLockServerErrorResponse)?.statusCode ===
          "number" &&
        (unlockApiResult as TimeLockServerErrorResponse)?.statusCode !== 200
      ) {
        setErrorText(
          `${(unlockApiResult as TimeLockServerErrorResponse).statusCode}. ${
            (unlockApiResult as TimeLockServerErrorResponse).message
          }`,
        );

        continue;
      }

      if ((unlockApiResult as TimeLockServerUnlockSuccessReponse).key) {
        return (unlockApiResult as TimeLockServerUnlockSuccessReponse).key;
      } else {
        return undefined;
      }
    } catch (error) {
      console.error(error);
      setErrorText((error as any)?.message || error);
      return undefined;
    }
  }
};
