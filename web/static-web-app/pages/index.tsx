import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { Button, Stack } from "@mantine/core";
import { PageLinks } from "../types";
import {
  IconChartPie,
  IconClockPause,
  IconDoorEnter,
  IconHomeHeart,
} from "@tabler/icons";

const Home: NextPage = () => {
  return (
    <Stack
      align="center"
      justify="center"
      style={{
        height: "70%",
      }}
      spacing="xl"
    >
      <Head>
        <title>
          {`${process.env.NEXT_PUBLIC_SITE_NAME || "Live Shared Secret"}`}
        </title>
      </Head>

      <Link href={PageLinks.CreateShares} passHref>
        <Button
          component="a"
          style={{ width: "80vw", maxWidth: "400px" }}
          variant="light"
          color="violet"
          size="md"
          leftIcon={<IconChartPie />}
          styles={{
            leftIcon: {
              position: "absolute",
              left: "10%",
            },
          }}
        >
          Create Shares
        </Button>
      </Link>

      <Link href={PageLinks.CreateRoom} passHref>
        <Button
          component="a"
          style={{ width: "80vw", maxWidth: "400px" }}
          variant="light"
          color="indigo"
          size="md"
          leftIcon={<IconHomeHeart />}
          styles={{
            leftIcon: {
              position: "absolute",
              left: "10%",
            },
          }}
        >
          Create Room
        </Button>
      </Link>

      <Link href={PageLinks.EnterRoom} passHref>
        <Button
          component="a"
          style={{ width: "80vw", maxWidth: "400px" }}
          variant="light"
          color="grape"
          size="md"
          leftIcon={<IconDoorEnter />}
          styles={{
            leftIcon: {
              position: "absolute",
              left: "10%",
            },
          }}
        >
          Enter Room
        </Button>
      </Link>

      <Link href={PageLinks.TimeLock} passHref>
        <Button
          component="a"
          style={{ width: "80vw", maxWidth: "400px" }}
          variant="light"
          color="cyan"
          size="md"
          leftIcon={<IconClockPause />}
          styles={{
            leftIcon: {
              position: "absolute",
              left: "10%",
            },
          }}
        >
          Time-Lock
        </Button>
      </Link>
    </Stack>
  );
};

export default Home;
