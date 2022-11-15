import { useContext } from "react";
import { Navbar, NavLink, Stack } from "@mantine/core";
import { GlobalStateContext } from "../../store/global";
import { useActor } from "@xstate/react";
import {
  IconChartPie,
  IconClockPause,
  IconDoorEnter,
  IconHome2,
  IconHomeHeart,
  IconSettings,
} from "@tabler/icons";
import { useRouter } from "next/router";
import Link from "next/link";
import { PageLinks } from "../../types";

const AppNavbar = () => {
  const { pathname } = useRouter();
  const { appService } = useContext(GlobalStateContext);
  const [state, send] = useActor(appService);

  const { context } = state;
  const { isNavOpen } = context;

  return (
    <Navbar
      p="md"
      hiddenBreakpoint="sm"
      hidden={isNavOpen !== true}
      width={{ sm: 200, lg: 300 }}
    >
      <Stack align="center">
        <Link href="/" passHref>
          <NavLink
            label="Home"
            icon={<IconHome2 size={16} stroke={1.5} />}
            active={pathname === "/"}
            onClick={() => {
              send("CLOSED_NAV");

              send({
                type: "GO_HOME",
              });
            }}
          />
        </Link>

        <Link href={PageLinks.Settings} passHref>
          <NavLink
            label="Settings"
            icon={<IconSettings size={16} stroke={1.5} />}
            active={pathname === PageLinks.Settings}
            onClick={() => {
              send("CLOSED_NAV");
            }}
          />
        </Link>

        <Link href={PageLinks.CreateRoom} passHref>
          <NavLink
            label="Create Room"
            icon={<IconHomeHeart size={16} stroke={1.5} />}
            active={pathname === PageLinks.CreateRoom}
            onClick={() => {
              send("CLOSED_NAV");
            }}
          />
        </Link>

        <Link href={PageLinks.EnterRoom} passHref>
          <NavLink
            label="Enter Room"
            icon={<IconDoorEnter size={16} stroke={1.5} />}
            active={pathname === PageLinks.EnterRoom}
            onClick={() => {
              send("CLOSED_NAV");
            }}
          />
        </Link>

        <Link href={PageLinks.CreateShares} passHref>
          <NavLink
            label="Create Shares"
            icon={<IconChartPie size={16} stroke={1.5} />}
            active={pathname === PageLinks.CreateShares}
            onClick={() => {
              send("CLOSED_NAV");
            }}
          />
        </Link>

        <Link href={PageLinks.TimeLock} passHref>
          <NavLink
            label="Time-Lock"
            icon={<IconClockPause size={16} stroke={1.5} />}
            active={pathname === PageLinks.TimeLock}
            onClick={() => {
              send("CLOSED_NAV");
            }}
          />
        </Link>
      </Stack>
    </Navbar>
  );
};

export default AppNavbar;
