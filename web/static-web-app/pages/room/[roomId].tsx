import {
  Button,
  Stack,
  Textarea,
  Modal,
  RingProgress,
  Text,
  Group,
  PasswordInput,
  Accordion,
} from "@mantine/core";
import {
  IconChartPie,
  IconClockPause,
  IconLock,
  IconLockOpen,
  IconShieldLock,
} from "@tabler/icons";
import { useActor } from "@xstate/react";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GlobalStateContext } from "../../store/global";
import { RoomData, TimeLockServerInfoWithShare } from "../../types";
import { addEncryptedShare, getRoomData } from "../../utils/api";
import {
  aesGcmDecryptToUint8,
  deriveKey,
  encryptTextUsingECDHAES,
  generateKeyPair,
} from "../../utils/cryptography";
import {
  decode as decodeBase64,
  encode as encodeBase64,
} from "../../utils/encoding/base64";

const Room: NextPage = () => {
  const { appService } = useContext(GlobalStateContext);
  const [state, send] = useActor(appService);
  const [formShown, setFormShown] = useState(true);
  const [decrypted, setDecrypted] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [ownPublicKey, setOwnPublicKey] = useState("");
  const [encryptedShare, setEncryptedShare] = useState("");
  const [encryptedShareCipherText, setEncryptedShareCipherText] = useState("");
  const [encryptedShareUsingPublicKey, setEncryptedShareUsingPublicKey] =
    useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [roomData, setRoomData] = useState<RoomData>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const timeLockInfo = useRef<string>();
  const router = useRouter();

  const { roomId } = router.query;
  const {
    serverlessApiAccessToken: token,
    serverlessApiBaseUrl: url,
    encryptedShare: encryptedShareInContext,
  } = state.context;

  useEffect(() => {
    const timeLockedPrefix = "timelocked_";

    let ciphertext = encryptedShare;

    if (ciphertext.startsWith(timeLockedPrefix)) {
      try {
        const parsed = JSON.parse(
          new TextDecoder().decode(
            decodeBase64(ciphertext.replace(timeLockedPrefix, "")),
          ),
        ) as TimeLockServerInfoWithShare;

        ciphertext = parsed.share;

        timeLockInfo.current = encodeBase64(JSON.stringify(parsed.timeLock));
      } catch (error) {
        console.error(error);
      }
    }

    setEncryptedShareCipherText(ciphertext);
  }, [encryptedShare]);

  const attemptToDecrypt = useCallback(async () => {
    if (!encryptedShareCipherText) {
      return;
    }

    try {
      const decryptedShare = await aesGcmDecryptToUint8({
        ciphertext: encryptedShareCipherText,
        password,
      });

      setDecrypted(true);

      if (publicKey) {
        const publicKeyJwk = JSON.parse(
          new TextDecoder().decode(decodeBase64(publicKey)),
        ) as JsonWebKey;

        const { privateKeyJwk, publicKeyJwk: ownPbKey } =
          await generateKeyPair();

        const encryptedUsingPbKey = await encryptTextUsingECDHAES({
          text: encodeBase64(decryptedShare),
          derivedKey: await deriveKey({ publicKeyJwk, privateKeyJwk }),
        });

        setEncryptedShareUsingPublicKey(JSON.stringify(encryptedUsingPbKey));
        setOwnPublicKey(encodeBase64(JSON.stringify(ownPbKey)));
      }
    } catch (error) {
      // console.error(error);
      setDecrypted(false);
    }
  }, [encryptedShareCipherText, password, publicKey]);

  const completedProgress = useMemo(() => {
    if (!roomData) {
      return 0;
    }

    const submittedShares = roomData.encrypted_shares?.length || 0;

    return Math.floor((100 / roomData.min_share_count) * submittedShares);
  }, [roomData]);

  useEffect(() => {
    if (encryptedShareInContext) {
      setEncryptedShare(encryptedShareInContext);
    }
  }, [encryptedShareInContext]);

  useEffect(() => {
    if (roomData?.public_key) {
      setPublicKey(roomData.public_key);
    }
  }, [roomData?.public_key]);

  useEffect(() => {
    if (
      completedProgress === 100 ||
      (roomData &&
        roomData.encrypted_shares &&
        roomData.min_share_count === roomData.encrypted_shares.length)
    ) {
      clearInterval(intervalRef.current);
      setFormShown(false);
    }
  }, [completedProgress, roomData]);

  useEffect(() => {
    if (password) {
      attemptToDecrypt();
    }
  }, [attemptToDecrypt, encryptedShare, password]);

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
        <title>
          {`Room | ${
            process.env.NEXT_PUBLIC_SITE_NAME || "Live Shared Secret"
          }`}
        </title>
      </Head>

      <Stack align="center">
        {formShown && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();

              if (
                ownPublicKey &&
                encryptedShareUsingPublicKey &&
                decrypted &&
                typeof roomId === "string"
              ) {
                const response = await addEncryptedShare({
                  url,
                  token,
                  roomId,
                  setErrorText,
                  encryptedShareText: encryptedShareUsingPublicKey,
                  publicKey: ownPublicKey,
                });

                if (response?.success) {
                  setFormShown(false);
                }
              }
            }}
          >
            <Accordion
              styles={{
                control: {
                  maxWidth: "85vw",
                  paddingLeft: "5px",
                  paddingRight: "5px",
                },
              }}
              variant="filled"
              mt="xs"
            >
              <Accordion.Item value="publickey">
                <Accordion.Control
                  icon={<IconShieldLock size={16} color="skyblue" />}
                >
                  <Text size="sm">Public Key</Text>
                </Accordion.Control>

                <Accordion.Panel>
                  <Textarea
                    minRows={4}
                    styles={{
                      input: {
                        maxHeight: "18vh",
                        height: "200px",
                      },
                    }}
                    placeholder="Enter the room creator's public key here"
                    label=""
                    required
                    value={publicKey}
                    onChange={(event) =>
                      setPublicKey(event.currentTarget.value.trim())
                    }
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Accordion
              styles={{
                control: {
                  maxWidth: "85vw",
                  paddingLeft: "5px",
                  paddingRight: "5px",
                },
              }}
              variant="filled"
              mt="xs"
            >
              <Accordion.Item value="share">
                <Accordion.Control
                  icon={<IconChartPie size={16} color="skyblue" />}
                >
                  <Text size="sm">Your Encrypted Share</Text>
                </Accordion.Control>

                <Accordion.Panel>
                  <Textarea
                    minRows={4}
                    styles={{
                      input: {
                        maxHeight: "18vh",
                        height: "200px",
                      },
                    }}
                    placeholder="Enter your encrypted share here"
                    label=""
                    required
                    value={encryptedShare}
                    onChange={(event) =>
                      setEncryptedShare(event.currentTarget.value.trim())
                    }
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            {timeLockInfo.current && (
              <Accordion
                styles={{
                  control: {
                    maxWidth: "85vw",
                    paddingLeft: "5px",
                    paddingRight: "5px",
                  },
                }}
                variant="filled"
                mt="xs"
              >
                <Accordion.Item value="timelock">
                  <Accordion.Control
                    icon={<IconClockPause size={16} color="skyblue" />}
                  >
                    <Text size="sm">Time-Lock Server Info</Text>
                  </Accordion.Control>

                  <Accordion.Panel>
                    <Textarea
                      minRows={4}
                      styles={{
                        input: {
                          maxHeight: "18vh",
                          height: "200px",
                        },
                      }}
                      placeholder="Time-Lock Server Info"
                      label=""
                      required
                      value={timeLockInfo.current}
                      onChange={(_event) => {}}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            )}

            <PasswordInput
              icon={
                decrypted ? (
                  <IconLockOpen size={16} color="green" />
                ) : (
                  <IconLock size={16} color="red" />
                )
              }
              style={{ width: "85vw", maxWidth: "400px" }}
              mb="xl"
              placeholder="Enter your password to decrypt your share"
              label="Your Password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.currentTarget.value.trim());
              }}
            />

            <Button
              type="submit"
              style={{ width: "85vw", maxWidth: "400px" }}
              variant="gradient"
              gradient={{ from: "darkblue", to: "purple" }}
              size="md"
              disabled={!decrypted}
            >
              Send Share
            </Button>
          </form>
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
      </Stack>

      <Modal
        opened={!!errorText}
        onClose={() => {
          router.push("/");
        }}
        title="Error!"
        centered={true}
      >
        {errorText}
      </Modal>
    </>
  );
};

export default Room;
