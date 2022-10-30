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

  const response = await fetch(`${url}/room`, requestOptions);

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
  token,
  url,
  setErrorText,
}: {
  roomId: string;
  minShareCount: number;
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
    },
  };

  console.log(requestBody);

  const body = JSON.stringify(requestBody);

  const requestOptions = {
    method: "POST",
    headers,
    body,
  };

  const response = await fetch(
    `${url}/room/set-min-share-count`,
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
