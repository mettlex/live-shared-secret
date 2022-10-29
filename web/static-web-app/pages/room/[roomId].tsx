import { Button, TextInput, Stack, Textarea } from "@mantine/core";
import { useActor } from "@xstate/react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import { GlobalStateContext } from "../../store/global";

const Room: NextPage = () => {
  const { appService } = useContext(GlobalStateContext);
  const [state, send] = useActor(appService);
  const [publicKey, setPublicKey] = useState("");
  const [encryptedShare, setEncryptedShare] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const { roomId } = router.query;
  const { serverlessApiAccessToken, serverlessApiBaseUrl } = state.context;

  console.log({ roomId, serverlessApiBaseUrl });

  useEffect(() => {
    send({
      type: "ROOM_REQUESTED",
    });
  }, [send]);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, user-scalable=no" />

        <title>Live Shared Secret</title>
      </Head>

      <Stack align="center">
        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <Textarea
            style={{ width: "80vw", maxWidth: "400px" }}
            mb="xl"
            placeholder="Enter the room creator's public key here"
            label="Public Key"
            required
            value={publicKey}
            onChange={(event) => setPublicKey(event.currentTarget.value)}
          />

          <Textarea
            style={{ width: "80vw", maxWidth: "400px" }}
            mb="xl"
            placeholder="Enter your encrypted share here"
            label="Your Share"
            required
            value={encryptedShare}
            onChange={(event) => setEncryptedShare(event.currentTarget.value)}
          />

          <TextInput
            style={{ width: "80vw", maxWidth: "400px" }}
            mb="xl"
            placeholder="Enter your password to decrypt your share"
            label="Your Password"
            required
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />

          <Button
            type="submit"
            style={{ width: "80vw", maxWidth: "400px" }}
            variant="gradient"
            gradient={{ from: "darkblue", to: "purple" }}
            size="md"
          >
            Send Share
          </Button>
        </form>
      </Stack>
    </>
  );
};

export default Room;
