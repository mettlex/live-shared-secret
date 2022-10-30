import { useContext } from "react";
import { Navbar, NavLink, Stack } from "@mantine/core";
import { GlobalStateContext } from "../../store/global";
import { useActor } from "@xstate/react";
import {
  IconCircle,
  IconCirclePlus,
  IconHome2,
  IconSettings,
} from "@tabler/icons";
import { useRouter } from "next/router";
import Link from "next/link";

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

        <Link href="/settings" passHref>
          <NavLink
            label="Settings"
            icon={<IconSettings size={16} stroke={1.5} />}
            active={pathname === "/settings"}
            onClick={() => {
              send("CLOSED_NAV");
            }}
          />
        </Link>

        <Link href="/create-room" passHref>
          <NavLink
            label="Create Room"
            icon={<IconCirclePlus size={16} stroke={1.5} />}
            active={pathname === "/create-room"}
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
