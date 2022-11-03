import { type NextPage } from "next";
import Head from "next/head";
import {
  Button,
  Group,
  LoadingOverlay,
  Modal,
  NumberInput,
  RingProgress,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import {
  useState,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useActor } from "@xstate/react";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/router";

import { GlobalStateContext } from "../store/global";
import { createRoom, getRoomData } from "../utils/api";
import {
  encode as encodeBase64,
  decode as decodeBase64,
} from "../utils/encoding/base64";
import {
  decryptUsingECDHAES,
  deriveKey,
  generateKeyPair,
} from "../utils/cryptography";
import { combineShares } from "../utils/sss-wasm/index";
import { RoomData } from "../types";
import { IconCheck, IconX } from "@tabler/icons";

const CreateRoom: NextPage = () => {
  const theme = useMantineTheme();
  const [agreedToSendPbKey, setAgreedToSendPbKey] = useState(true);
  const [formShown, setFormShown] = useState(true);
  const [roomId, setRoomId] = useState("");
  const [minShareCount, setMinShareCount] = useState<number>(2);
  const [errorText, setErrorText] = useState("");
  const [errorTextForRoomId, setErrorTextForRoomId] = useState("");
  const [errorTextForMinShareCount, setErrorTextForMinShareCount] =
    useState("");
  const [publicKey, setPublicKey] = useState("");
  const [secretText, setSecretText] = useState("");
  const [privateKeyJwk, setPrivateKeyJwk] = useState<JsonWebKey>();
  const [roomData, setRoomData] = useState<RoomData>();
  const [roomCreated, setRoomCreated] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const { appService } = useContext(GlobalStateContext);
  const [state, send] = useActor(appService);

  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const router = useRouter();

  const { serverlessApiAccessToken: token, serverlessApiBaseUrl: url } =
    state.context;

  if (
    (state.matches("SettingsLoaded") || state.matches("Settings")) &&
    (!token || !url)
  ) {
    router.push("/settings?back=/create-room");
  }

  const attemptToDecrypt = useCallback(async () => {
    if (!roomData?.encrypted_shares || !privateKeyJwk) {
      return;
    }

    const shares = await Promise.all(
      roomData.encrypted_shares.map(async (es) => {
        const { public_key, encrypted_share_text } = es;

        try {
          const { base64Data, hexIv } = JSON.parse(encrypted_share_text) as {
            base64Data: string;
            hexIv: string;
          };

          const d = await decryptUsingECDHAES({
            message: {
              base64Data,
              hexIv,
            },
            derivedKey: await deriveKey({
              privateKeyJwk,
              publicKeyJwk: JSON.parse(
                new TextDecoder().decode(decodeBase64(public_key)),
              ),
            }),
          });

          return d;
        } catch (error) {
          setErrorText(
            (error as { message: string })?.message || (error as string),
          );
        }
      }),
    );

    if (!shares.find((s) => !s)) {
      try {
        let secret = new TextDecoder().decode(
          await combineShares(shares.map((x) => decodeBase64(x!))),
        );

        const endIndex = secret.split("").findIndex((x) => {
          return x.charCodeAt(0) === 0;
        });

        if (endIndex !== -1) {
          secret = secret.slice(0, endIndex);
        }

        if (secret) {
          setSecretText(secret.replace("[", ""));
        }
      } catch (error) {
        console.error(error);
      }
    }
  }, [privateKeyJwk, roomData?.encrypted_shares]);

  useEffect(() => {
    if (
      roomData &&
      roomData.encrypted_shares &&
      roomData.encrypted_shares.length === roomData.min_share_count
    ) {
      attemptToDecrypt();
    }
  }, [attemptToDecrypt, roomData]);

  const completedProgress = useMemo(() => {
    if (!roomData) {
      return 0;
    }

    const submittedShares = roomData.encrypted_shares?.length || 0;

    return Math.floor((100 / roomData.min_share_count) * submittedShares);
  }, [roomData]);

  useEffect(() => {
    if (!formShown && !roomCreated && !publicKey && !roomData) {
      setLoading(true);
    } else if (roomCreated && publicKey && roomData) {
      setLoading(false);
    }
  }, [formShown, publicKey, roomCreated, roomData]);

  useEffect(() => {
    if (errorText || errorTextForMinShareCount || errorTextForRoomId) {
      const tid = setTimeout(() => {
        setLoading(false);
        clearTimeout(tid);
      }, 300);
    }
  }, [errorText, errorTextForMinShareCount, errorTextForRoomId]);

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

  useEffect(() => {
    if (
      completedProgress === 100 ||
      (roomData &&
        roomData.encrypted_shares &&
        roomData.min_share_count === roomData.encrypted_shares.length)
    ) {
      clearInterval(intervalRef.current);
    }
  }, [completedProgress, roomData]);

  return (
    <>
      <Head>
        <title>
          {`Create Room | ${
            process.env.NEXT_PUBLIC_SITE_NAME || "Live Shared Secret"
          }`}
        </title>
      </Head>

      <Stack align="center" justify="center" style={{ height: "80%" }}>
        <LoadingOverlay visible={loading} overlayBlur={1} />

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

              const pbKeyText = encodeBase64(
                JSON.stringify(keypair.publicKeyJwk),
              );

              try {
                const data = await createRoom({
                  roomId,
                  minShareCount,
                  publicKey: agreedToSendPbKey ? pbKeyText : undefined,
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

                  setPublicKey(pbKeyText);

                  setPrivateKeyJwk(keypair.privateKeyJwk);

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
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
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
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />

            <Group position="left" mb="xl">
              <Switch
                checked={agreedToSendPbKey}
                onChange={(event) =>
                  setAgreedToSendPbKey(event.currentTarget.checked)
                }
                color="violet"
                size="xs"
                label="Send my public key to the serverless function"
                thumbIcon={
                  agreedToSendPbKey ? (
                    <IconCheck
                      size={12}
                      color={theme.colors.violet[theme.fn.primaryShade()]}
                      stroke={3}
                    />
                  ) : (
                    <IconX
                      size={12}
                      color={theme.colors.red[theme.fn.primaryShade()]}
                      stroke={3}
                    />
                  )
                }
              />
            </Group>

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

        {roomCreated && roomData && roomId && completedProgress !== 100 && (
          <TextInput
            style={{ width: "80vw", maxWidth: "400px" }}
            label="Room ID"
            required
            value={roomId}
            onFocus={(event) => event.currentTarget.select()}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            onChange={() => {}}
          />
        )}

        {roomCreated && roomData && publicKey && completedProgress !== 100 && (
          <Textarea
            style={{ width: "80vw", maxWidth: "400px" }}
            minRows={7}
            mb="xl"
            label="Your Public Key"
            value={publicKey}
            contentEditable={false}
            onFocus={(event) => event.currentTarget.select()}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            onChange={() => {}}
          />
        )}

        {secretText.length > 0 && (
          <Stack align="center">
            <form
              onSubmit={async (event) => {
                event.preventDefault();

                await navigator.clipboard.writeText(secretText);

                setSecretCopied(true);
              }}
            >
              <Button
                type="submit"
                style={{ width: "80vw", maxWidth: "400px" }}
                variant="gradient"
                gradient={{ from: "darkblue", to: "purple" }}
                size="md"
              >
                Copy Secret
              </Button>
            </form>

            <Modal
              opened={secretCopied}
              onClose={() => {
                setSecretCopied(false);
              }}
              title="Copied!"
              centered={true}
            >
              The secret has been copied the clipboard.
            </Modal>
          </Stack>
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

            {completedProgress !== 100 &&
              roomData.expires_in_seconds &&
              roomData.expires_in_seconds > 1 && (
                <Stack align="center" spacing={0}>
                  <RingProgress
                    sections={[
                      {
                        value: Math.floor(
                          (100 * (roomData.expires_in_seconds || 0)) /
                            parseInt(
                              process.env.NEXT_PUBLIC_DATA_EXPIRE_SECONDS ||
                                "120",
                            ),
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

        <Modal
          opened={!!errorText}
          onClose={() => {
            router.reload();
          }}
          title="Error!"
          centered={true}
        >
          {errorText}
        </Modal>
      </Stack>
    </>
  );
};

export default CreateRoom;
