import { Button, Modal, PasswordInput, Text, Textarea } from "@mantine/core";
import {
  IconArrowBack,
  IconLock,
  IconLockOpen,
  IconRefresh,
  IconTrash,
} from "@tabler/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseISO, differenceInSeconds } from "date-fns";
import {
  TimeLockServerCreateKeyResult,
  TimeLockServerInfoForShare,
  TimeLockServerSuccessStatusResponse,
} from "../../types";
import { deleteKey, getKeyStatus } from "../../utils/api";
import { aesGcmDecryptToUint8 } from "../../utils/cryptography";
import { SelectedMenu } from "../../pages/time-lock";
import { useRouter } from "next/router";

type AdminControlPanelProps = {
  setSelected: (menu?: SelectedMenu) => void;
};

const AdminControlPanel = ({ setSelected }: AdminControlPanelProps) => {
  const [adminPassword, setAdminPassword] = useState("");
  const [ciphertext, setCiphertext] = useState("");
  const [refreshButtonDisabled, setRefreshButtonDisabled] = useState(false);
  const [decrypted, setDecrypted] = useState(false);
  const [locked, setLocked] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [keyStatus, setKeyStatus] = useState<
    TimeLockServerSuccessStatusResponse | undefined
  >();
  const [serverResults, setServerResults] =
    useState<TimeLockServerCreateKeyResult[]>();
  const [unlockAt, setUnlockAt] = useState("");
  const [deleteAt, setDeleteAt] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const ivRef = useRef<string>();

  const router = useRouter();

  const attemptToDecrypt = useCallback(async () => {
    try {
      const { iv, results } = JSON.parse(
        new TextDecoder().decode(
          await aesGcmDecryptToUint8({
            ciphertext,
            password: adminPassword,
          }),
        ),
      ) as TimeLockServerInfoForShare;

      ivRef.current = iv;
      setServerResults(results);

      setDecrypted(true);
    } catch (error) {
      // console.error(error);
      setDecrypted(false);
    }
  }, [ciphertext, adminPassword]);

  useEffect(() => {
    attemptToDecrypt();
  }, [attemptToDecrypt, ciphertext]);

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

  const attemptDeleteKey = useCallback(async () => {
    if (!serverResults) {
      return;
    }

    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    } catch (_error) {
      // no op
    }

    const responses = await deleteKey({
      adminPassword,
      results: serverResults,
      setErrorText,
    });

    const count = responses.reduce((acc, curr) => {
      if (curr.success) {
        return acc + 1;
      } else {
        return acc;
      }
    }, 0);

    alert(
      `Successfully removed key from ${count} server${count > 1 ? "s" : ""}`,
    );
  }, [adminPassword, serverResults]);

  useEffect(() => {
    if (!intervalRef.current) {
      setKeyStatus(undefined);
    }
  }, []);

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
        placeholder="Enter your encrypted admin information"
        label="Encrypted Admin Information"
        onChange={(event) => {
          setCiphertext(event.currentTarget.value);
        }}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        required
      />

      <PasswordInput
        icon={
          decrypted ? (
            <IconLockOpen size={16} color="green" />
          ) : (
            <IconLock size={16} color="red" />
          )
        }
        style={{ width: "85vw", maxWidth: "400px" }}
        placeholder="Enter your password to decrypt your share"
        label="Your Admin Password"
        required
        value={adminPassword}
        onChange={(event) => {
          setAdminPassword(event.currentTarget.value.trim());
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

      {keyStatus && (
        <Button
          mt="xl"
          component="button"
          style={{ width: "85vw", maxWidth: "400px" }}
          variant="light"
          color="pink"
          size="md"
          leftIcon={<IconTrash />}
          styles={{
            leftIcon: {
              position: "absolute",
              left: "10%",
            },
          }}
          onClick={async () => {
            const answer = confirm("Do you want to delete the key forever?");

            if (answer === true) {
              await attemptDeleteKey();

              router.push("/");
            }
          }}
        >
          Delete Key
        </Button>
      )}

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

export default AdminControlPanel;
