import {
  Button,
  TextInput,
  Stack,
  Accordion,
  Textarea,
  NumberInput,
  PasswordInput,
  Text,
  Group,
  Select,
  Loader,
  Modal,
  List,
  Card,
  LoadingOverlay,
} from "@mantine/core";
import {
  IconClockPause,
  IconLock,
  IconLockOpen,
  IconPlus,
} from "@tabler/icons";
import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect, useCallback, useRef } from "react";
import { TimeLockServer } from "../types";
import { createTimeLockKey, getTimeLockServers } from "../utils/api";
import { aesGcmEncrypt } from "../utils/cryptography";
import { encode as encodeBase64 } from "../utils/encoding/base64";
import { createShares } from "../utils/sss-wasm";

enum DurationFormat {
  MINUTES = "minutes",
  DAYS = "days",
  MONTHS = "months",
  YEARS = "years",
}

const CreateShares: NextPage = () => {
  const [totalShares, setTotalShares] = useState(3);
  const [minShares, setMinShares] = useState(2);
  const [secret, setSecret] = useState("");
  const [errorText, setErrorText] = useState("");
  const [firstStepDone, setFirstStepDone] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [refreshed, refresh] = useState("");
  const [durationFormat, setDurationFormat] = useState<DurationFormat>(
    DurationFormat.DAYS,
  );
  const [timeLockDurationNumber, setTimeLockDurationNumber] =
    useState<number>();
  const [usingTimeLock, setUsingTimeLock] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordOK, setAdminPasswordOK] = useState(false);
  const [timeLockOK, setTimeLockOK] = useState(false);
  const [timeLockAccordingValue, setTimeLockAccordingValue] = useState<
    string | null
  >(null);
  const [maxTimeLockServersCount, setMaxTimeLockServersCount] = useState(1);
  const [minTimeLockServersCount, setMinTimeLockServersCount] = useState(1);
  const [maxTimeLockServersCountError, setMaxTimeLockServersCountError] =
    useState("");
  const [minTimeLockServersCountError, setMinTimeLockServersCountError] =
    useState("");
  const defaultServerListProvider = "https://timelock.onrender.com";
  const [providerUrl, setProviderUrl] = useState(defaultServerListProvider);
  const [usedProviderUrl, setUsedProviderUrl] = useState(
    defaultServerListProvider,
  );
  const [timeLockServers, setTimeLockServers] = useState<TimeLockServer[]>([]);
  const [timeLockServersLoading, setTimeLockServersLoading] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);

  const [adminPasswordError, setAdminPasswordError] = useState("");

  const [firstSecretPart, setFirstSecretPart] = useState("");
  const [secondSecretPart, setSecondSecretPart] = useState("");
  const [timeLockIv, setTimeLockIv] = useState("");
  const [timeLockUuids, setTimeLockUuids] = useState<string[]>([]);
  const [encryptedTimeLockAdminInfo, setEncryptedTimeLockAdminInfo] =
    useState("");

  const [passwords, setPasswords] = useState<{ text: string; done: boolean }[]>(
    [],
  );

  const [encryptedShares, setEncryptedShares] = useState<string[]>([]);

  const tlServerListAPICalled = useRef(false);

  const sendKeyToTimeServers = useCallback(async () => {
    if (!firstSecretPart || !usingTimeLock || !timeLockOK) {
      return;
    }

    if (timeLockServers.length > 2) {
      throw new Error("Not Implemented Yet");
    }

    const firstPart = firstSecretPart;
    const secondPart = secondSecretPart;

    const iv = "<NOT SENT>";

    let encryptedPartialData = await aesGcmEncrypt({
      plaintext: firstPart,
      password: secondPart,
    });

    setTimeLockIv(encryptedPartialData.slice(0, 24));

    encryptedPartialData = encryptedPartialData.slice(24);

    const results = await createTimeLockKey({
      timeLockServers,
      adminPassword,
      recoveryPassword: secondPart,
      iv,
      encryptedPartialData,
      timeLockDuration: 1,
      setErrorText,
    });

    if (results instanceof Array) {
      setSecret(secondPart);

      setTimeLockUuids(results.map((r) => r.uuid || ""));

      const cipherText = await aesGcmEncrypt({
        plaintext: JSON.stringify({ results }),
        password: adminPassword,
      });

      setEncryptedTimeLockAdminInfo(cipherText);
    }
  }, [
    adminPassword,
    firstSecretPart,
    secondSecretPart,
    timeLockOK,
    timeLockServers,
    usingTimeLock,
  ]);

  useEffect(() => {
    if (!secret) {
      return;
    }

    if (!usingTimeLock || !timeLockOK) {
      return;
    }

    const delimiter = " ";
    const index = secret.indexOf(delimiter);

    if (secret.includes(delimiter) && index > 0) {
      setFirstSecretPart(secret.slice(0, index).trim());
      setSecondSecretPart(secret.slice(index).trim());
    } else {
      const index = Math.floor(secret.length / 2);
      setFirstSecretPart(secret.slice(0, index).trim());
      setSecondSecretPart(secret.slice(index).trim());
    }
  }, [usingTimeLock, timeLockOK, secret]);

  useEffect(() => {
    if (timeLockServers.length > 0) {
      setMaxTimeLockServersCount(Math.min(10, timeLockServers.length));
    }
  }, [timeLockServers.length]);

  useEffect(() => {
    setMinTimeLockServersCount(Math.ceil(maxTimeLockServersCount * (2 / 3)));
  }, [maxTimeLockServersCount]);

  useEffect(() => {
    if (timeLockAccordingValue === "timelock") {
      setUsingTimeLock(true);
    } else {
      setUsingTimeLock(false);
    }
  }, [timeLockAccordingValue]);

  const setRandomSecret = useCallback(() => {
    const randomSecret = encodeBase64(
      crypto.getRandomValues(new Uint8Array(32)),
    );

    setSecret(randomSecret?.trim());
  }, []);

  useEffect(() => {
    setRandomSecret();
  }, [setRandomSecret]);

  useEffect(() => {
    const finished =
      passwords.length === totalShares && !passwords.find((x) => !x.done);

    setAllDone(finished);
  }, [passwords, refreshed, totalShares]);

  const attemptToEncrypt = useCallback(async () => {
    const shares = await createShares(
      new TextEncoder().encode(secret),
      totalShares,
      minShares,
    );

    let encShares = await Promise.all(
      shares.map(
        async (s, i) =>
          await aesGcmEncrypt({ plaintext: s, password: passwords[i].text }),
      ),
    );

    if (usingTimeLock && timeLockOK && timeLockUuids.length > 0) {
      encShares = encShares.map((share) => {
        const prefix = "timelocked_";

        const json = JSON.stringify({
          share,
          uuids: timeLockUuids,
          iv: timeLockIv,
          timeLockServers,
        });

        return `${prefix}${encodeBase64(json)}`;
      });
    }

    setEncryptedShares(encShares);
  }, [
    minShares,
    passwords,
    secret,
    timeLockIv,
    timeLockOK,
    timeLockServers,
    timeLockUuids,
    totalShares,
    usingTimeLock,
  ]);

  useEffect(() => {
    if (!allDone) {
      return;
    }

    attemptToEncrypt();
  }, [allDone, attemptToEncrypt]);

  const fetchTimeLockServers = useCallback(async () => {
    if (!timeLockServersLoading || tlServerListAPICalled.current) {
      return;
    }

    tlServerListAPICalled.current = true;

    const servers = await getTimeLockServers({
      url: providerUrl,
      token: process.env.NEXT_PUBLIC_TIMELOCK_API_ACCESS_TOKEN || "",
      setErrorText,
    });

    if (servers instanceof Array) {
      setTimeLockServers(servers);
    }

    setTimeLockServersLoading(false);
  }, [providerUrl, timeLockServersLoading]);

  useEffect(() => {
    fetchTimeLockServers();
  }, [fetchTimeLockServers]);

  useEffect(() => {
    if (!adminPassword) {
      return;
    }

    if (adminPassword.length < 10) {
      setAdminPasswordError("Password must be more than 9 characters");

      return;
    }

    if (!/[a-z]/.test(adminPassword)) {
      setAdminPasswordError("Must include at least one small letter");

      return;
    }

    if (!/[A-Z]/.test(adminPassword)) {
      setAdminPasswordError("Must include at least one capital letter");

      return;
    }

    if (!/[0-9]/.test(adminPassword)) {
      setAdminPasswordError("Must include at least one number");

      return;
    }

    if (!/\W/.test(adminPassword)) {
      setAdminPasswordError("Must include at least one special symbol");

      return;
    }

    setAdminPasswordError("");
    setAdminPasswordOK(true);
  }, [adminPassword]);

  useEffect(() => {
    if (
      typeof timeLockDurationNumber === "number" &&
      timeLockDurationNumber > 0 &&
      durationFormat &&
      adminPasswordOK &&
      timeLockServers.length > 0
    ) {
      setTimeLockOK(true);
    } else {
      setTimeLockOK(false);
    }
  }, [
    adminPasswordOK,
    durationFormat,
    timeLockDurationNumber,
    timeLockServers.length,
  ]);

  return (
    <>
      <Head>
        <title>
          {`Create Shares | ${
            process.env.NEXT_PUBLIC_SITE_NAME || "Live Shared Secret"
          }`}
        </title>
      </Head>

      <Stack align="center">
        {!firstStepDone && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();

              if (
                (!usingTimeLock && !timeLockAccordingValue) ||
                (usingTimeLock && timeLockOK)
              ) {
                setFirstStepDone(true);

                if (usingTimeLock && timeLockOK) {
                  setCreatingKey(true);

                  try {
                    await sendKeyToTimeServers();
                  } catch (error) {
                    setErrorText((error as any)?.message || error || "");
                  }

                  setCreatingKey(false);
                }
              }
            }}
          >
            <NumberInput
              min={3}
              max={100}
              style={{ width: "85vw", maxWidth: "400px" }}
              mb="xl"
              placeholder="Enter the total number of shares"
              label="Total Shares"
              required
              value={totalShares}
              onChange={(value) => {
                if (value) {
                  setTotalShares(value);
                }
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />

            <NumberInput
              min={2}
              max={totalShares}
              style={{ width: "85vw", maxWidth: "400px" }}
              mb="xl"
              placeholder="Enter the minimum number of shares"
              label="Minimum Shares"
              required
              value={minShares}
              onChange={(value) => {
                if (value) {
                  setMinShares(value);
                }
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />

            <PasswordInput
              maxLength={63}
              style={{ width: "85vw", maxWidth: "400px" }}
              mb="xl"
              placeholder="Enter the secret text"
              label="The Secret"
              required
              value={secret}
              onChange={(event) => {
                setSecret(event.currentTarget.value?.trim());
              }}
              onFocus={(event) => {
                event.currentTarget.select();
              }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />

            <Accordion
              chevron={<IconPlus size={16} />}
              styles={{
                chevron: {
                  "&[data-rotate]": {
                    transform: "rotate(45deg)",
                  },
                },
                control: {
                  maxWidth: "85vw",
                },
              }}
              variant="separated"
              mb="60px"
              value={timeLockAccordingValue}
              onChange={setTimeLockAccordingValue}
            >
              <Accordion.Item value="timelock">
                <Accordion.Control
                  icon={<IconClockPause size={20} color="purple" />}
                >
                  Time-Lock (Optional)
                </Accordion.Control>

                <Accordion.Panel>
                  <Stack>
                    <Text size="xs" color="dimmed">
                      Close this panel to continue without time-lock.
                    </Text>

                    <TextInput
                      label="Server List Provider"
                      placeholder="Enter Provider URL"
                      value={providerUrl}
                      onChange={(event) =>
                        setProviderUrl(event.currentTarget.value)
                      }
                      required
                    ></TextInput>

                    {timeLockServersLoading && (
                      <Stack align="center">
                        <Loader color="grape" />
                        <Text size="xs">Fetching the providers...</Text>
                      </Stack>
                    )}

                    {!timeLockServersLoading && (
                      <Button
                        component="button"
                        variant="gradient"
                        gradient={{ from: "darkblue", to: "purple" }}
                        size="sm"
                        onClick={async () => {
                          setTimeLockServersLoading(true);
                          tlServerListAPICalled.current = false;
                          await fetchTimeLockServers();
                          setUsedProviderUrl(providerUrl);
                        }}
                        disabled={providerUrl === usedProviderUrl}
                      >
                        {providerUrl === usedProviderUrl
                          ? `Found ${timeLockServers.length} Time-Lock Server${
                              timeLockServers.length > 1 ? "s" : ""
                            }`
                          : `Get New Servers`}
                      </Button>
                    )}

                    <Card>
                      <Card.Section>
                        <Text size="xs">Locking Strategy:</Text>
                      </Card.Section>
                      <Card.Section>
                        <Stack spacing="xs">
                          <Text size="xs" color="dimmed">
                            You can use one of the two options:
                          </Text>

                          <List type="ordered" size="xs" spacing="xs">
                            <List.Item>
                              <Text size="xs">
                                {`If you don't use any space in your secret,`}
                              </Text>
                              <Text size="xs">
                                the first half of your secret will be
                                time-locked
                              </Text>
                            </List.Item>
                            <List.Item>
                              <Text size="xs">
                                Use a space in your secret to split your secret
                              </Text>
                              <Text size="xs">
                                to time-lock the part left side of the space
                              </Text>
                            </List.Item>
                          </List>
                        </Stack>
                      </Card.Section>
                    </Card>

                    <Stack>
                      <NumberInput
                        label="Maximum servers to use"
                        placeholder={`Enter the number of servers to use`}
                        size="xs"
                        type="number"
                        required
                        autoComplete="off"
                        autoCorrect="off"
                        value={maxTimeLockServersCount}
                        error={maxTimeLockServersCountError}
                        onChange={(value) => {
                          if (typeof value !== "number") {
                            return;
                          }

                          if (value > 0 && value <= timeLockServers.length) {
                            setMaxTimeLockServersCount(value);
                            setMaxTimeLockServersCountError("");
                          } else {
                            if (value < 1) {
                              setMaxTimeLockServersCountError(
                                "It can't be less than 1 server",
                              );

                              return;
                            }

                            if (value > timeLockServers.length) {
                              setMaxTimeLockServersCountError(
                                "It can't be more than the number of found servers",
                              );

                              return;
                            }
                          }
                        }}
                      ></NumberInput>

                      <NumberInput
                        label="Minimum servers required"
                        placeholder={`Enter the  minimum number of servers to unlock`}
                        size="xs"
                        type="number"
                        required
                        autoComplete="off"
                        autoCorrect="off"
                        value={minTimeLockServersCount}
                        error={minTimeLockServersCountError}
                        onChange={(value) => {
                          if (typeof value !== "number") {
                            return;
                          }

                          if (value > 0 && value <= maxTimeLockServersCount) {
                            setMinTimeLockServersCount(value);
                            setMinTimeLockServersCountError("");
                          } else {
                            if (value < 1) {
                              setMinTimeLockServersCountError(
                                "It can't be less than 1 server",
                              );

                              return;
                            }

                            if (value > maxTimeLockServersCount) {
                              setMinTimeLockServersCountError(
                                "It can't be more than the number of max servers",
                              );

                              return;
                            }
                          }
                        }}
                      ></NumberInput>
                    </Stack>

                    <Stack>
                      <Text size="xs">Lock Duration:</Text>

                      <Group position="center" grow>
                        <NumberInput
                          placeholder={`Enter ${durationFormat}`}
                          size="xs"
                          type="number"
                          required
                          autoComplete="off"
                          autoCorrect="off"
                          value={timeLockDurationNumber}
                          onChange={(value) =>
                            setTimeLockDurationNumber(value || 0)
                          }
                        ></NumberInput>

                        <Select
                          label=""
                          placeholder="Pick one"
                          data={[
                            { value: DurationFormat.YEARS, label: "Years" },
                            { value: DurationFormat.MONTHS, label: "Months" },
                            { value: DurationFormat.DAYS, label: "Days" },
                            { value: DurationFormat.MINUTES, label: "Minutes" },
                          ]}
                          value={durationFormat}
                          onChange={(value) =>
                            value && setDurationFormat(value as DurationFormat)
                          }
                          size="xs"
                          styles={{
                            root: {
                              width: "50px",
                            },
                          }}
                          dropdownPosition="top"
                        />
                      </Group>

                      <PasswordInput
                        icon={
                          adminPasswordOK ? (
                            <IconLockOpen size={16} color="green" />
                          ) : (
                            <IconLock size={16} color="red" />
                          )
                        }
                        mt="md"
                        mb="md"
                        placeholder="Enter admin password here"
                        label="Admin Password (Never Share)"
                        required
                        value={adminPassword}
                        onChange={(event) => {
                          setAdminPassword(event.currentTarget.value.trim());
                        }}
                        error={adminPasswordError}
                      />
                    </Stack>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Button
              type="submit"
              style={{ width: "85vw", maxWidth: "400px" }}
              mb="xl"
              variant="gradient"
              gradient={{ from: "darkblue", to: "purple" }}
              size="md"
              disabled={
                !totalShares ||
                !minShares ||
                minShares > totalShares ||
                !secret ||
                secret.length > 63 ||
                (usingTimeLock && !timeLockOK) ||
                (!!timeLockAccordingValue && !timeLockOK)
              }
            >
              Next
            </Button>
          </form>
        )}

        {firstStepDone && !allDone && (
          <>
            {new Array(totalShares).fill(0).map((_, i) => (
              <Stack key={i} mb="lg" justify="flex-start">
                <PasswordInput
                  style={{ width: "85vw", maxWidth: "400px" }}
                  placeholder={`Enter the password for share #${i + 1}`}
                  label={`Password For Share #${i + 1}`}
                  required
                  onChange={(event) => {
                    const target = event.currentTarget;

                    setPasswords((prevPasswords) => {
                      if (!prevPasswords[i]) {
                        prevPasswords[i] = {
                          text: "",
                          done: false,
                        };
                      }

                      prevPasswords[i].text = target.value.trim();

                      return prevPasswords;
                    });
                  }}
                  onFocus={(event) => {
                    event.currentTarget.select();
                  }}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  disabled={passwords[i]?.done}
                  hidden={passwords[i]?.done === true}
                />

                <Button
                  style={{ width: "85vw", maxWidth: "400px" }}
                  variant="gradient"
                  gradient={{ from: "darkblue", to: "purple" }}
                  size="sm"
                  disabled={passwords[i]?.done}
                  onClick={() => {
                    setPasswords((prevPasswords) => {
                      if (prevPasswords[i] && prevPasswords[i].text) {
                        prevPasswords[i].done = true;
                      }

                      return prevPasswords;
                    });

                    refresh(Math.random().toString());
                  }}
                >
                  Done #{i + 1}
                </Button>
              </Stack>
            ))}
          </>
        )}

        <LoadingOverlay visible={creatingKey} overlayBlur={1} />

        {allDone && (
          <>
            {timeLockUuids.filter((x) => x).length > 0 && (
              <Textarea
                minRows={7}
                style={{ width: "85vw", maxWidth: "400px" }}
                styles={{ input: { maxHeight: "20vh", height: "200px" } }}
                label={`Time-Lock Admin Information`}
                mb="lg"
                value={encryptedTimeLockAdminInfo}
                onFocus={(event) => event.currentTarget.select()}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            )}

            {new Array(totalShares).fill(0).map((_, i) => (
              <Textarea
                key={i}
                minRows={7}
                style={{ width: "85vw", maxWidth: "400px" }}
                styles={{ input: { maxHeight: "20vh", height: "200px" } }}
                label={`Encrypted Share #${i + 1}`}
                mb="lg"
                value={encryptedShares[i]}
                onFocus={(event) => event.currentTarget.select()}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
            ))}
          </>
        )}
      </Stack>

      <Modal
        opened={!!errorText}
        onClose={() => {
          setErrorText("");
        }}
        title="Error!"
        centered={true}
      >
        {errorText}
      </Modal>
    </>
  );
};

export default CreateShares;
