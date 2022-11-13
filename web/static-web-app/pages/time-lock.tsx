import type { NextPage } from "next";
import Head from "next/head";
import { Button, Stack } from "@mantine/core";
import { IconCloudLockOpen, IconHomeCog } from "@tabler/icons";
import { useState } from "react";
import AdminControlPanel from "../components/TLAdminControlPanel";
import TimeLockRecovery from "../components/TLRecovery";

type SelectedMenu = "ADMIN" | "RECOVERY";

const TimeLock: NextPage = () => {
  const [selected, setSelected] = useState<SelectedMenu>();

  return (
    <Stack
      align="center"
      justify="center"
      style={{
        height: "70%",
      }}
      spacing={selected ? "xs" : "xl"}
    >
      <Head>
        <title>
          {`Time-Lock | ${
            process.env.NEXT_PUBLIC_SITE_NAME || "Live Shared Secret"
          }`}
        </title>
      </Head>

      {selected === "ADMIN" && <AdminControlPanel />}

      {selected === "RECOVERY" && <TimeLockRecovery />}

      {!selected && (
        <>
          <Button
            component="button"
            style={{ width: "80vw", maxWidth: "400px" }}
            variant="light"
            color="teal"
            size="md"
            leftIcon={<IconHomeCog />}
            styles={{
              leftIcon: {
                position: "absolute",
                left: "10%",
              },
            }}
            onClick={() => {
              setSelected("ADMIN");
            }}
          >
            Admin Control Panel
          </Button>

          <Button
            component="button"
            style={{ width: "80vw", maxWidth: "400px" }}
            variant="light"
            color="blue"
            size="md"
            leftIcon={<IconCloudLockOpen />}
            styles={{
              leftIcon: {
                position: "absolute",
                left: "10%",
              },
            }}
            onClick={() => {
              setSelected("RECOVERY");
            }}
          >
            Recovery
          </Button>
        </>
      )}
    </Stack>
  );
};

export default TimeLock;
