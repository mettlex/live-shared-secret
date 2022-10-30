import { type NextPage } from "next";
import Head from "next/head";
import {
  Button,
  Group,
  NumberInput,
  RingProgress,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useState, useContext, useEffect, useRef, useMemo } from "react";
import { useActor } from "@xstate/react";
import { v4 as uuidv4 } from "uuid";

import { GlobalStateContext } from "../store/global";
import { createRoom, getRoomData } from "../utils/api";
import {
  encode as encode64,
  decode as decode64,
} from "../utils/encoding/base64";
import { generateKeyPair } from "../utils/cryptography";
import { RoomData } from "../types";

const CreateRoom: NextPage = () => {
  const [formShown, setFormShown] = useState(true);
  const [roomId, setRoomId] = useState("");
  const [minShareCount, setMinShareCount] = useState<number>(2);
  const [errorText, setErrorText] = useState("");
  const [errorTextForRoomId, setErrorTextForRoomId] = useState("");
  const [errorTextForMinShareCount, setErrorTextForMinShareCount] =
    useState("");
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [roomData, setRoomData] = useState<RoomData>();
  const [roomCreated, setRoomCreated] = useState<boolean>(false);

  const { appService } = useContext(GlobalStateContext);
  const [state, send] = useActor(appService);

  const intervalRef = useRef<ReturnType<typeof setInterval>>();

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
    send({
      type: "SETTINGS_REQUESTED",
    });
  }, [send]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setRoomId(uuidv4());
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof roomId !== "string" ||
      roomCreated !== true
    ) {
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
  }, [roomCreated, roomId, token, url]);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, user-scalable=no" />

        <title>
          Create Room |{" "}
          {process.env.NEXT_PUBLIC_SITE_NAME || "Live Shared Secret"}
        </title>
      </Head>

      <Stack align="center" justify="center" style={{ height: "80%" }}>
        {formShown && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();

              setFormShown(false);

              let keypair:
                | Awaited<ReturnType<typeof generateKeyPair>>
                | undefined = undefined;

              try {
                keypair = await generateKeyPair();
              } catch (error: any) {
                alert(error.message || error);
              }

              setErrorText("");

              setErrorTextForRoomId("");
              setErrorTextForMinShareCount("");

              if (!keypair) {
                return;
              }

              if (roomId.length < 10 || roomId.length > 100) {
                setFormShown(true);
                setErrorTextForRoomId(
                  "Room ID should be between 10-100 characters long",
                );
                return;
              }

              if (minShareCount < 2 || minShareCount > 1000) {
                setFormShown(true);
                setErrorTextForRoomId(
                  "The number of minimum shares should be between 2-1000",
                );
                return;
              }

              try {
                const data = await createRoom({
                  roomId,
                  minShareCount,
                  token,
                  url,
                  setErrorText,
                });

                if (!data?.success) {
                  setFormShown(true);

                  if (data?.message) {
                    setErrorText(data.message);
                  }
                } else {
                  setFormShown(false);

                  setPublicKey(encode64(JSON.stringify(keypair.publicKeyJwk)));
                  setPrivateKey(JSON.stringify(keypair.privateKeyJwk));

                  setRoomCreated(true);
                }
              } catch (error: any) {
                setFormShown(true);
                console.error(error);
                setErrorText(error.message || error);
              }
            }}
          >
            <Text
              size="sm"
              style={{ width: "80vw", maxWidth: "400px" }}
              mb="xl"
            >
              Note: Creating room and copying the secret manually is not
              recommended. Use automated tools to integrate this feature. This
              page exists for demo purposes.
            </Text>

            <TextInput
              min={10}
              max={100}
              style={{ width: "80vw", maxWidth: "400px" }}
              placeholder="Enter Room ID here"
              label="Room ID"
              required
              value={roomId}
              onChange={(event) => {
                setErrorTextForRoomId("");
                setRoomId(event.currentTarget.value);
              }}
              error={errorTextForRoomId}
            />

            <NumberInput
              min={2}
              max={1000}
              style={{ width: "80vw", maxWidth: "400px" }}
              mb="xl"
              placeholder="Enter the number of minimum shares here"
              label="Minimum Shares"
              required
              value={minShareCount}
              onChange={(value) => {
                setErrorTextForMinShareCount("");

                if (value) {
                  setMinShareCount(value);
                }
              }}
              error={errorTextForMinShareCount}
            />

            <Button
              type="submit"
              style={{ width: "80vw", maxWidth: "400px" }}
              variant="gradient"
              gradient={{ from: "darkblue", to: "purple" }}
              size="md"
            >
              Create Room
            </Button>

            {errorText && (
              <Text color="red" size="sm">
                {errorText}
              </Text>
            )}
          </form>
        )}

        {roomCreated && roomData && roomId && (
          <TextInput
            style={{ width: "80vw", maxWidth: "400px" }}
            label="Room ID"
            required
            value={roomId}
            onFocus={(event) => event.currentTarget.select()}
          />
        )}

        {roomCreated && roomData && publicKey && (
          <Textarea
            style={{ width: "80vw", maxWidth: "400px" }}
            minRows={7}
            mb="xl"
            label="Your Public Key"
            value={publicKey}
            contentEditable={false}
            onFocus={(event) => event.currentTarget.select()}
          />
        )}

        {roomData && (
          <Group>
            <Stack align="center" spacing={0}>
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
            </Stack>

            {roomData.expires_in_seconds && roomData.expires_in_seconds > 1 && (
              <Stack align="center" spacing={0}>
                <RingProgress
                  sections={[
                    {
                      value: Math.floor(
                        (100 * (roomData.expires_in_seconds || 0)) / 60,
                      ),
                      color: "blue",
                    },
                  ]}
                  label={
                    <Text color="blue" weight={700} align="center" size="xl">
                      {roomData.expires_in_seconds || 0}s
                    </Text>
                  }
                />
                <Text weight="bold" color="blue">
                  Time Left
                </Text>
              </Stack>
            )}
          </Group>
        )}
      </Stack>
    </>
  );
};

export default CreateRoom;
