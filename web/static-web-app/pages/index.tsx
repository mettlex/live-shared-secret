import { Button, TextInput, Stack } from "@mantine/core";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useContext, useEffect } from "react";
import { useActor } from "@xstate/react";
import { GlobalStateContext } from "../store/global";
import { getRoomData } from "../utils/api";
import { ErrorResponse, RoomData } from "../types";

const Home: NextPage = () => {
  const [roomId, setRoomId] = useState("");
  const [errorText, setErrorText] = useState("");
  const router = useRouter();
  const { appService } = useContext(GlobalStateContext);
  const [state, send] = useActor(appService);

  const { serverlessApiAccessToken: token, serverlessApiBaseUrl: url } =
    state.context;

  useEffect(() => {
    send({
      type: "SETTINGS_REQUESTED",
    });
  }, [send]);

  if (
    (state.matches("SettingsLoaded") || state.matches("Settings")) &&
    (!token || !url)
  ) {
    router.push("/settings");
  }

  console.log(state.value);

  return (
    <>
      <Head>
        <title>
          {process.env.NEXT_PUBLIC_SITE_NAME || "Live Shared Secret"}
        </title>
      </Head>

      <Stack align="center" justify="center" style={{ height: "80%" }}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();

            setErrorText("");

            if (roomId.length > 9 && roomId.length < 101) {
              try {
                const data = await getRoomData({
                  roomId,
                  token,
                  url,
                  setErrorText,
                });

                const errorRes = data as ErrorResponse;

                if (!errorRes?.success && errorRes?.message) {
                  setErrorText(errorRes.message);
                }

                if (!data || !(data as RoomData).expires_in_seconds) {
                  return;
                }
              } catch (error) {
                console.error(error);
                return;
              }

              router.push(`/room/${roomId}`);
            } else {
              setErrorText("Room ID should be between 10-100 characters long");
            }
          }}
        >
          <TextInput
            min={10}
            max={100}
            style={{ width: "80vw", maxWidth: "400px" }}
            mb="xl"
            placeholder="Enter Room ID here"
            label="Room ID"
            required
            value={roomId}
            onChange={(event) => {
              setErrorText("");
              setRoomId(event.currentTarget.value);
            }}
            error={errorText}
          />

          <Button
            type="submit"
            style={{ width: "80vw", maxWidth: "400px" }}
            variant="gradient"
            gradient={{ from: "darkblue", to: "purple" }}
            size="md"
          >
            Enter Room
          </Button>
        </form>
      </Stack>
    </>
  );
};

export default Home;
