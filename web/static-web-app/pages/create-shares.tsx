import {
  Button,
  TextInput,
  Stack,
  Accordion,
  Textarea,
  NumberInput,
  PasswordInput,
  Checkbox,
  Text,
  Group,
  Select,
} from "@mantine/core";
import {
  IconClockPause,
  IconLock,
  IconLockOpen,
  IconPlus,
} from "@tabler/icons";
import type { NextPage } from "next";
import Head from "next/head";
import { useState, useEffect, useCallback } from "react";
import { aesGcmEncrypt } from "../utils/cryptography";
import { encode as encodeBase64 } from "../utils/encoding/base64";
import { createShares } from "../utils/sss-wasm";

const CreateShares: NextPage = () => {
  const [totalShares, setTotalShares] = useState(3);
  const [minShares, setMinShares] = useState(2);
  const [secret, setSecret] = useState("");
  const [errorText, setErrorText] = useState("");
  const [firstStepDone, setFirstStepDone] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [refreshed, refresh] = useState("");
  const [durationFormat, setDurationFormat] = useState("days");
  const [usingTimeLock, setUsingTimeLock] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordOK, setAdminPasswordOK] = useState(false);
  const [shareablePassword, setShareablePassword] = useState("");
  const [shareablePasswordOK, setShareablePasswordOK] = useState(false);
  const [timeLockProvidersCount, setTimeLockProvidersCount] = useState(0);

  const [passwords, setPasswords] = useState<{ text: string; done: boolean }[]>(
    [],
  );

  const [encryptedShares, setEncryptedShares] = useState<string[]>([]);

  const setRandomSecret = useCallback(() => {
    const randomSecret = encodeBase64(
      crypto.getRandomValues(new Uint8Array(32)),
    );

    setSecret(randomSecret);
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

    const encShares = await Promise.all(
      shares.map(
        async (s, i) =>
          await aesGcmEncrypt({ plaintext: s, password: passwords[i].text }),
      ),
    );

    setEncryptedShares(encShares);
  }, [minShares, passwords, secret, totalShares]);

  useEffect(() => {
    if (!allDone) {
      return;
    }

    attemptToEncrypt();
  }, [allDone, attemptToEncrypt]);

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

              setFirstStepDone(true);
            }}
          >
            <NumberInput
              min={3}
              max={100}
              style={{ width: "80vw", maxWidth: "400px" }}
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
              error={errorText}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />

            <NumberInput
              min={2}
              max={totalShares}
              style={{ width: "80vw", maxWidth: "400px" }}
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
              error={errorText}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />

            <PasswordInput
              maxLength={63}
              style={{ width: "80vw", maxWidth: "400px" }}
              mb="xl"
              placeholder="Enter the secret text"
              label="The Secret"
              required
              value={secret}
              onChange={(event) => {
                setSecret(event.currentTarget.value);
              }}
              onFocus={(event) => {
                event.currentTarget.select();
              }}
              error={errorText}
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
                  maxWidth: "80vw",
                },
              }}
              variant="separated"
              mb="60px"
            >
              <Accordion.Item value="share">
                <Accordion.Control
                  icon={<IconClockPause size={20} color="purple" />}
                >
                  Time-Lock (Optional)
                </Accordion.Control>

                <Accordion.Panel>
                  <Stack>
                    <Checkbox
                      label={
                        usingTimeLock
                          ? `Using ${timeLockProvidersCount} federated time-lock providers`
                          : "Use federated time-lock providers"
                      }
                      color="grape"
                      size="xs"
                      mt="md"
                      checked={usingTimeLock}
                      onChange={(event) =>
                        setUsingTimeLock(event.currentTarget.checked)
                      }
                      disabled={timeLockProvidersCount < 3}
                    />

                    {usingTimeLock && (
                      <>
                        <Text>Lock Duration:</Text>

                        <Group position="center" grow>
                          <NumberInput
                            placeholder={`Enter ${durationFormat}`}
                            size="xs"
                            type="number"
                          ></NumberInput>

                          <Select
                            label=""
                            placeholder="Pick one"
                            data={[
                              { value: "years", label: "Years" },
                              { value: "months", label: "Months" },
                              { value: "days", label: "Days" },
                              { value: "minutes", label: "Minutes" },
                            ]}
                            value={durationFormat}
                            onChange={(value) =>
                              value && setDurationFormat(value)
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
                        />

                        <PasswordInput
                          icon={
                            shareablePasswordOK ? (
                              <IconLockOpen size={16} color="green" />
                            ) : (
                              <IconLock size={16} color="red" />
                            )
                          }
                          mb="md"
                          placeholder="Enter shareable password here"
                          label="Password to request unlock (Shareable)"
                          required
                          value={shareablePassword}
                          onChange={(event) => {
                            setShareablePassword(
                              event.currentTarget.value.trim(),
                            );
                          }}
                        />
                      </>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Button
              type="submit"
              style={{ width: "80vw", maxWidth: "400px" }}
              variant="gradient"
              gradient={{ from: "darkblue", to: "purple" }}
              size="md"
              disabled={
                !totalShares ||
                !minShares ||
                minShares > totalShares ||
                !secret ||
                secret.length > 63
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
                  style={{ width: "80vw", maxWidth: "400px" }}
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
                  style={{ width: "80vw", maxWidth: "400px" }}
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

        {allDone && (
          <>
            {new Array(totalShares).fill(0).map((_, i) => (
              <Textarea
                key={i}
                minRows={7}
                style={{ width: "80vw", maxWidth: "400px" }}
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
    </>
  );
};

export default CreateShares;
