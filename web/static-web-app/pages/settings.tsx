import {
  Button,
  PasswordInput,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconLink, IconLock } from "@tabler/icons";
import { useActor } from "@xstate/react";
import type { NextPage } from "next";
import Head from "next/head";
import { useContext, useEffect, useState } from "react";
import { GlobalStateContext } from "../store/global";

let defaultServerlessBaseUrls = [
  {
    value: "https://secret-share.deno.dev",
    label: "https://secret-share.deno.dev",
  },
];

if (typeof process.env.NEXT_PUBLIC_SERVERLESS_BASE_URLS === "string") {
  defaultServerlessBaseUrls =
    process.env.NEXT_PUBLIC_SERVERLESS_BASE_URLS.split(",").map((url) => ({
      value: url,
      label: url,
    }));
}

const Settings: NextPage = () => {
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const { appService } = useContext(GlobalStateContext);
  const [state, send] = useActor(appService);

  const { context } = state;

  console.log(context);

  const data: SelectItem[] =
    context.serverlessApiBaseUrl &&
    !defaultServerlessBaseUrls.find(
      (x) => x.value === context.serverlessApiBaseUrl,
    )
      ? [
          {
            value: context.serverlessApiBaseUrl,
            label: context.serverlessApiBaseUrl,
          },
          ...defaultServerlessBaseUrls.concat({
            value: "custom",
            label: "Custom",
          }),
        ]
      : defaultServerlessBaseUrls.concat({
          value: "custom",
          label: "Custom",
        });

  useEffect(() => {
    setToken(context.serverlessApiAccessToken);
    setBaseUrl(context.serverlessApiBaseUrl);
  }, [context.serverlessApiAccessToken, context.serverlessApiBaseUrl]);

  useEffect(() => {
    send("SETTINGS_REQUESTED");
  }, [send]);

  return (
    <>
      <Head>
        <title>Settings | Live Shared Secret</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Stack align="center" justify="center">
        <PasswordInput
          label="Serverless API Token"
          placeholder="Paste the API access token here"
          icon={<IconLock size={14} />}
          required
          withAsterisk
          styles={{
            root: {
              width: "100%",
            },
          }}
          value={token}
          onChange={(event) => setToken(event.currentTarget.value)}
        />

        <Select
          label="Base URL of Serverless Function"
          placeholder="Pick one"
          data={data}
          icon={<IconLink size={14} />}
          withAsterisk
          required
          styles={{
            root: {
              width: "100%",
            },
          }}
          onChange={(value) => {
            if (value === "custom") {
              setIsCustom(true);
            } else if (value) {
              setIsCustom(false);
            }

            setBaseUrl(value || "");
          }}
          value={baseUrl}
        />

        {isCustom && (
          <TextInput
            label="Custom Base URL"
            placeholder="Type the URL with https:// prefix here"
            icon={<IconLink size={14} />}
            required
            withAsterisk
            styles={{
              root: {
                width: "100%",
              },
            }}
            onChange={(event) => {
              const { value } = event.currentTarget;

              if (value) {
                setBaseUrl(value);
              }
            }}
          />
        )}

        <Button
          variant="gradient"
          gradient={{ from: "blue", to: "purple" }}
          size="sm"
          onClick={() => {
            send({
              type: "SERVERLESS_API_ACCESS_TOKEN_CHANGED",
              data: token,
            });

            if (baseUrl !== "custom") {
              send({
                type: "SERVERLESS_API_BASE_URL_CHANGED",
                data: baseUrl,
              });
            }
          }}
        >
          Save
        </Button>
      </Stack>
    </>
  );
};

export default Settings;
