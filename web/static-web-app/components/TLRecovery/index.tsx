import { Button, Modal, PasswordInput, Text, Textarea } from "@mantine/core";
import {
  IconArrowBack,
  IconCopy,
  IconLock,
  IconLockOpen,
  IconRefresh,
} from "@tabler/icons";
import { differenceInSeconds, parseISO } from "date-fns";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { SelectedMenu } from "../../pages/time-lock";
import {
  TimeLockServerCreateKeyResult,
  TimeLockServerSuccessStatusResponse,
} from "../../types";
import { getKeyStatus, unlockKey } from "../../utils/api";
import { aesGcmDecrypt } from "../../utils/cryptography";
import { decode as decodeBase64 } from "../../utils/encoding/base64";

type RecoveryPanelProps = {
  setSelected: (menu?: SelectedMenu) => void;
};

const prefix = "timelocked_";

const TimeLockRecovery = ({ setSelected }: RecoveryPanelProps) => {
  const [serverInfoText, setServerInfoText] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [refreshButtonDisabled, setRefreshButtonDisabled] = useState(false);
  const [locked, setLocked] = useState(true);
  const [requestingUnlock, setRequestingUnlock] = useState(false);
  const [unlockRequested, setUnlockRequested] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [secretText, setSecretText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [keyStatus, setKeyStatus] = useState<
    TimeLockServerSuccessStatusResponse | undefined
  >();
  const [parsedData, setParsedData] = useState<{
    iv: string;
    results: TimeLockServerCreateKeyResult[];
  }>();
  const [serverResults, setServerResults] =
    useState<TimeLockServerCreateKeyResult[]>();
  const [unlockAt, setUnlockAt] = useState("");
  const [deleteAt, setDeleteAt] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  const statusIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const unlockingIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const router = useRouter();

  useEffect(() => {
    if (!statusIntervalRef.current) {
      setKeyStatus(undefined);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!serverResults) {
      return;
    }

    const status = await getKeyStatus({
      results: serverResults,
      setErrorText,
    });

    if (!status) {
      setErrorText("Unable to get the key status!");
      return;
    }

    setKeyStatus(status);
  }, [serverResults]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!keyStatus?.key) {
      return;
    }

    if (keyStatus.key.unlock_at === null) {
      setLocked(true);
    }

    setUnlockAt(keyStatus.key.unlock_at || "");
    setDeleteAt(keyStatus.key.delete_at || "");
  }, [keyStatus?.key]);

  useEffect(() => {
    if (statusIntervalRef.current) {
      return;
    }

    if (serverResults) {
      statusIntervalRef.current = setInterval(async () => {
        if (secretText && statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current);
          statusIntervalRef.current = undefined;
          return;
        }

        await fetchStatus().catch((e) => {
          clearInterval(statusIntervalRef.current);
          statusIntervalRef.current = undefined;
          setErrorText(e.message || e);
        });

        setRefreshCount(refreshCount + 1);
      }, 3000);
    }

    const interval = statusIntervalRef.current;

    return () => {
      if (interval) {
        clearInterval(interval);
        statusIntervalRef.current = undefined;
      }
    };
  }, [fetchStatus, statusIntervalRef, refreshCount, serverResults, secretText]);

  useEffect(() => {
    if (!unlockAt || !refreshCount) {
      return;
    }

    if (differenceInSeconds(new Date(), parseISO(unlockAt)) > 0) {
      setLocked(false);
    }
  }, [unlockAt, refreshCount]);

  const attemptToDecode = useCallback(() => {
    if (!serverInfoText) {
      return;
    }

    const decoded = new TextDecoder().decode(decodeBase64(serverInfoText));

    const parsed = JSON.parse(decoded);

    setParsedData(parsed);
  }, [serverInfoText]);

  useEffect(() => {
    if (!parsedData) {
      return;
    }

    if (!parsedData.results) {
      setErrorText("Invalid server data");
      return;
    }

    setServerResults(parsedData.results);
  }, [parsedData]);

  useEffect(() => {
    if (!serverInfoText) {
      return;
    }

    if (serverInfoText.startsWith(prefix)) {
      setErrorText(
        "Do not enter your share. Enter the server info received from a room.",
      );

      return;
    }

    try {
      attemptToDecode();
    } catch (error) {
      setErrorText((error as any).message || error);
    }
  }, [attemptToDecode, serverInfoText]);

  const performUnlock = useCallback(async () => {
    if (!serverResults) {
      return;
    }

    if (secretText && unlockingIntervalRef.current) {
      clearInterval(unlockingIntervalRef.current);
      unlockingIntervalRef.current = undefined;
      return;
    }

    if (secretText && statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = undefined;
      return;
    }

    const data = await unlockKey({
      recoveryPassword,
      results: serverResults,
      setErrorText,
    }).catch(() => {
      if (unlockingIntervalRef.current) {
        clearInterval(unlockingIntervalRef.current);
        unlockingIntervalRef.current = undefined;
      }
    });

    if (!data) {
      if (unlockingIntervalRef.current) {
        clearInterval(unlockingIntervalRef.current);
        unlockingIntervalRef.current = undefined;
      }
    }

    if (!data || !data?.encrypted_partial_data || !parsedData) {
      return;
    }

    const decrypted = await aesGcmDecrypt({
      ciphertext: `${parsedData.iv}${data.encrypted_partial_data}`,
      password: recoveryPassword,
    });

    setSecretText(decrypted);
  }, [parsedData, recoveryPassword, secretText, serverResults]);

  useEffect(() => {
    if (unlockRequested && !unlockingIntervalRef.current) {
      unlockingIntervalRef.current = setInterval(() => {
        performUnlock().catch((e) => {
          if (unlockingIntervalRef.current) {
            clearInterval(unlockingIntervalRef.current);
            unlockingIntervalRef.current = undefined;
          }
          setErrorText(e.message || e);
        });
      }, 2000);
    } else if (secretText && unlockingIntervalRef.current) {
      clearInterval(unlockingIntervalRef.current);
      unlockingIntervalRef.current = undefined;
    }

    return () => {
      if (unlockingIntervalRef.current) {
        clearInterval(unlockingIntervalRef.current);
        unlockingIntervalRef.current = undefined;
      }
    };
  }, [performUnlock, secretText, unlockRequested]);

  return (
    <>
      <Button
        component="button"
        style={{ width: "85vw", maxWidth: "400px" }}
        mb="xl"
        variant="light"
        color="blue"
        size="md"
        leftIcon={<IconArrowBack />}
        styles={{
          leftIcon: {
            position: "absolute",
            left: "10%",
          },
        }}
        onClick={() => {
          setSelected(undefined);
        }}
      >
        Back
      </Button>

      <Textarea
        minRows={4}
        styles={{
          root: {
            width: "85vw",
            maxWidth: "400px",
          },
          input: {
            maxHeight: "18vh",
            height: "200px",
          },
        }}
        placeholder="Enter the base-64 encoded time-lock server info. You can receive this by entering a room with your valid share."
        label="Time-Lock Server Info"
        value={serverInfoText}
        onChange={(event) => {
          setServerInfoText(event.currentTarget.value);
        }}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        required
        onFocus={(event) => {
          event.currentTarget.select();
        }}
      />

      <PasswordInput
        icon={<IconLock size={16} color="skyblue" />}
        style={{ width: "85vw", maxWidth: "400px" }}
        placeholder="Enter the result of combined shares"
        label="Recovery Password"
        required
        value={recoveryPassword}
        onChange={(event) => {
          setRecoveryPassword(event.currentTarget.value.trim());
        }}
      />

      <Button
        component="button"
        style={{ width: "85vw", maxWidth: "400px" }}
        mb={0}
        variant="light"
        color="cyan"
        size="md"
        leftIcon={<IconRefresh />}
        styles={{
          leftIcon: {
            position: "absolute",
            left: "10%",
          },
        }}
        onClick={async () => {
          setRefreshButtonDisabled(true);
          await fetchStatus().catch((e) => {
            setErrorText(e.message || e);
          });
          setRefreshButtonDisabled(false);
          setRefreshCount(refreshCount + 1);
        }}
        disabled={!serverResults || refreshButtonDisabled}
      >
        Refresh
      </Button>

      <Text size="xs" color="dimmed" hidden={refreshCount < 2}>
        Refreshed {refreshCount} times
      </Text>

      {keyStatus && (
        <Text size="sm">
          Status:{" "}
          {unlockAt && locked
            ? "Unlocking Started ⏳️"
            : locked
            ? "Locked 🔒️"
            : "Unlocked 🔓️"}
        </Text>
      )}

      {deleteAt && (
        <Text size="xs" color="dimmed">
          automatic removal at {parseISO(deleteAt).toLocaleString()}
        </Text>
      )}

      {unlockAt && (
        <Text size="xs" color="pink">
          {locked ? "Unlocks" : "Unlocked"} at{" "}
          {parseISO(unlockAt).toLocaleString()}
        </Text>
      )}

      <Button
        mt="xl"
        component="button"
        style={{ width: "85vw", maxWidth: "400px" }}
        variant="light"
        color="teal"
        size="md"
        leftIcon={<IconLockOpen />}
        styles={{
          leftIcon: {
            position: "absolute",
            left: "10%",
          },
        }}
        onClick={async () => {
          const answer = confirm("Are you sure to unlock the secret?");

          if (answer === true) {
            setRequestingUnlock(true);
            await performUnlock()
              .then(() => {
                setUnlockRequested(true);
              })
              .catch((e) => {
                setErrorText(e.message || e);
              });
          }
        }}
        hidden={!!secretText || unlockRequested}
        disabled={
          !(
            recoveryPassword &&
            serverResults &&
            serverResults.length > 0 &&
            recoveryPassword.length > 0 &&
            !requestingUnlock
          )
        }
      >
        Request Unlock
      </Button>

      <Button
        mt="xl"
        component="button"
        style={{ width: "85vw", maxWidth: "400px" }}
        variant="light"
        color="teal"
        size="md"
        leftIcon={<IconCopy />}
        styles={{
          leftIcon: {
            position: "absolute",
            left: "10%",
          },
        }}
        onClick={async (event) => {
          event.preventDefault();

          await navigator.clipboard.writeText(secretText);

          setSecretCopied(true);
        }}
        hidden={!secretText}
      >
        Copy Secret
      </Button>

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

      <Modal
        opened={!!errorText}
        onClose={() => {
          if (errorText.toLowerCase().includes("match")) {
            router.reload();
            return;
          }

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

export default TimeLockRecovery;
