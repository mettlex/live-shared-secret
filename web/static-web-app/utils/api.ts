import { RoomData } from "../types";

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

  type ErrorResponse = {
    success: boolean;
    message: string;
  };

  const data = (await response.json()) as
    | Partial<ErrorResponse>
    | Partial<RoomData>;

  const errorData = data as ErrorResponse;

  if (!errorData.success && errorData.message && setErrorText) {
    setErrorText(errorData.message);
    return;
  }

  return data;
};
