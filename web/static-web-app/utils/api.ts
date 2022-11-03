import routes from "../routes";
import { ErrorResponse, RoomData } from "../types";

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
