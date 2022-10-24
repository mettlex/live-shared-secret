import { Button, Stack } from "@mantine/core";
import { useActor } from "@xstate/react";
import type { NextPage } from "next";
import Head from "next/head";
import { useContext, useState } from "react";
import { GlobalStateContext } from "../store/global";

const Home: NextPage = () => {
  const { appService } = useContext(GlobalStateContext);
  const [state, send] = useActor(appService);
  const [formShowed, setFormShowed] = useState(false);
  const [roomId, setRoomId] = useState("");

  const { context } = state;

  return (
    <>
      <Head>
        <title>Live Shared Secret</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Stack align="center" justify="center">
        <Button
          style={{ width: "200px" }}
          size="lg"
          variant="light"
          onClick={() => {
            setRoomId(crypto.randomUUID());
            setFormShowed(true);
          }}
        >
          Create Room
        </Button>

        <Button
          style={{ width: "200px" }}
          size="lg"
          variant="filled"
          onClick={() => {
            setFormShowed(true);
          }}
        >
          Enter Room
        </Button>
      </Stack>
    </>
  );
};

export default Home;
