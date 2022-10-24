import { ActionIcon, Footer, Group } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons";

const AppFooter = () => {
  return (
    <Footer height={50} p="md">
      <Group position="center">
        <ActionIcon
          onClick={() => {
            open("https://github.com/mettlex/live-shared-secret");
          }}
        >
          <IconBrandGithub />
        </ActionIcon>
      </Group>
    </Footer>
  );
};

export default AppFooter;
