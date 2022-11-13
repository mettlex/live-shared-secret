import { Button, Modal, PasswordInput, Text, Textarea } from "@mantine/core";
import { IconLock, IconLockOpen, IconTrash } from "@tabler/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseISO, differenceInSeconds } from "date-fns";
import {
  TimeLockServerCreateKeyResult,
  TimeLockServerInfoForShare,
  TimeLockServerSuccessStatusResponse,
} from "../../types";
import { getKeyStatus } from "../../utils/api";
import { aesGcmDecryptToUint8 } from "../../utils/cryptography";
import { useRouter } from "next/router";

const AdminControlPanel = () => {
  const [adminPassword, setAdminPassword] = useState("");
  const [ciphertext, setCiphertext] = useState("");
  const [decrypted, setDecrypted] = useState(false);
  const [locked, setLocked] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [keyStatus, setKeyStatus] =
    useState<TimeLockServerSuccessStatusResponse>();
  const [serverResults, setServerResults] =
    useState<TimeLockServerCreateKeyResult[]>();
  const [unlockAt, setUnlockAt] = useState("");
  const [deleteAt, setDeleteAt] = useState("");

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
        await fetchStatus().catch((_e) => {
          clearInterval(intervalRef.current);
        });
      }, 2000);
    }

    const interval = intervalRef.current;

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchStatus, intervalRef, serverResults]);

  useEffect(() => {
    if (!unlockAt) {
      return;
    }

    if (differenceInSeconds(new Date(), parseISO(unlockAt)) > 0) {
      setLocked(false);
    }
  }, [unlockAt]);

  const deleteKey = useCallback(async () => {
    // todo:
    alert("not done. i'll implement this later :)");
  }, []);

  return (
    <>
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
        label="Your Password"
        required
        value={adminPassword}
        onChange={(event) => {
          setAdminPassword(event.currentTarget.value.trim());
        }}
      />

      {keyStatus && (
        <Text size="sm">
          Status:{" "}
          {unlockAt && locked
            ? "Unlocking Started"
            : locked
            ? "Locked"
            : "Unlocked"}
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
          style={{ width: "80vw", maxWidth: "400px" }}
          variant="light"
          color="pink"
          size="sm"
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
              await deleteKey();

              // router.push("/");
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
