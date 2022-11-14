import { Button } from "@mantine/core";
import { IconArrowBack } from "@tabler/icons";
import { SelectedMenu } from "../../pages/time-lock";

type RecoveryPanelProps = {
  setSelected: (menu?: SelectedMenu) => void;
};

const TimeLockRecovery = ({ setSelected }: RecoveryPanelProps) => {
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
    </>
  );
};

export default TimeLockRecovery;
