import {
  Button,
  TextInput,
  Stack,
  Textarea,
  Modal,
  RingProgress,
  Text,
} from "@mantine/core";
import { useActor } from "@xstate/react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { GlobalStateContext } from "../../store/global";
import { RoomData } from "../../types";
import { getRoomData } from "../../utils/api";

const Room: NextPage = () => {
  const { appService } = useContext(GlobalStateContext);
  const [state, send] = useActor(appService);
  const [formShown, setFormShown] = useState(true);
  const [publicKey, setPublicKey] = useState("");
  const [encryptedShare, setEncryptedShare] = useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [roomData, setRoomData] = useState<RoomData>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const router = useRouter();

  const { roomId } = router.query;
  const { serverlessApiAccessToken: token, serverlessApiBaseUrl: url } =
    state.context;

  const completedProgress = useMemo(() => {
    if (!roomData) {
      return 0;
    }

    const submittedShares = roomData.encrypted_shares?.length || 0;

    return Math.floor((100 / roomData.min_share_count) * submittedShares);
  }, [roomData]);

  useEffect(() => {
    if (completedProgress === 100) {
      clearInterval(intervalRef.current);
      setFormShown(false);
    }
  }, [completedProgress]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof roomId !== "string") {
      return;
    }

    intervalRef.current = setInterval(async () => {
      try {
        const roomData = (await getRoomData({
          roomId,
          token,
          url,
          setErrorText,
        })) as RoomData;

        if (!roomData || !roomData.expires_in_seconds) {
          clearInterval(intervalRef.current);

          return;
        } else {
          setRoomData(roomData);
        }
      } catch (error) {
        console.error(error);
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [roomId, token, url]);

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
        {formShown && (
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
        )}

        {roomData && (
          <>
            <RingProgress
              sections={[{ value: completedProgress, color: "blue" }]}
              label={
                <Text color="blue" weight={700} align="center" size="xl">
                  {completedProgress}%
                </Text>
              }
            />
            <Text weight="bold" color="blue">
              Share Progress
            </Text>
          </>
        )}
      </Stack>

      <Modal
        opened={!!errorText}
        onClose={() => {
          router.push("/");
        }}
        title="Error!"
      >
        {errorText}
      </Modal>
    </>
  );
};

export default Room;
