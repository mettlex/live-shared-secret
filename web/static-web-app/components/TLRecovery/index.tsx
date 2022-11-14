import { Button, Modal, PasswordInput, Text, Textarea } from "@mantine/core";
import {
  IconArrowBack,
  IconLock,
  IconLockOpen,
  IconRefresh,
} from "@tabler/icons";
import { differenceInSeconds, parseISO } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import { SelectedMenu } from "../../pages/time-lock";
import {
  TimeLockServerCreateKeyResult,
  TimeLockServerSuccessStatusResponse,
} from "../../types";
import { getKeyStatus } from "../../utils/api";
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

  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!intervalRef.current) {
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
    if (intervalRef.current) {
      return;
    }

    if (serverResults) {
      intervalRef.current = setInterval(async () => {
        await fetchStatus().catch((e) => {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
          setErrorText(e.message || e);
        });

        setRefreshCount(refreshCount + 1);
      }, 3000);
    }

    const interval = intervalRef.current;

    return () => {
      if (interval) {
        clearInterval(interval);
        intervalRef.current = undefined;
      }
    };
  }, [fetchStatus, intervalRef, refreshCount, serverResults]);

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
        onClick={async () => {}}
        disabled={
          !(
            recoveryPassword &&
            serverResults &&
            serverResults.length > 0 &&
            recoveryPassword.length > 0
          )
        }
      >
        Request Unlock
      </Button>

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

export default TimeLockRecovery;
