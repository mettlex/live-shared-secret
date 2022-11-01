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
import { useRouter } from "next/router";
import { useContext, useEffect, useMemo, useState } from "react";
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
  const router = useRouter();
  const [token, setToken] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const { appService } = useContext(GlobalStateContext);
  const [state, send] = useActor(appService);
  const [saved, setSaved] = useState(false);

  const { context } = state;

  const data: SelectItem[] = useMemo(
    () =>
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
          }),
    [context.serverlessApiBaseUrl],
  );

  useEffect(() => {
    if (context.serverlessApiAccessToken) {
      setToken(context.serverlessApiAccessToken);
    }
  }, [context.serverlessApiAccessToken]);

  useEffect(() => {
    if (context.serverlessApiBaseUrl) {
      setBaseUrl(context.serverlessApiBaseUrl);
    }
  }, [context.serverlessApiBaseUrl]);

  useEffect(() => {
    send("SETTINGS_PAGE_REQUESTED");
  }, [send]);

  useEffect(() => {
    if (data[0]?.value) {
      setBaseUrl(data[0].value);
    }
  }, [data]);

  console.log(state.value);

  return (
    <>
      <Head>
        <title>
          Settings | {process.env.NEXT_PUBLIC_SITE_NAME || "Live Shared Secret"}
        </title>
      </Head>

      <Stack align="center" justify="center" style={{ height: "80%" }}>
        <PasswordInput
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          label="Serverless API Token"
          placeholder="Paste the API access token here"
          icon={<IconLock size={14} />}
          required
          withAsterisk
          style={{ width: "80vw", maxWidth: "400px" }}
          value={token}
          onChange={(event) => setToken(event.currentTarget.value)}
        />

        <Select
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          label="Base URL of Serverless Function"
          placeholder="Pick one"
          data={data}
          icon={<IconLink size={14} />}
          withAsterisk
          required
          style={{ width: "80vw", maxWidth: "400px" }}
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
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            type="url"
            label="Custom Base URL"
            placeholder="Type the URL with https:// prefix here"
            icon={<IconLink size={14} />}
            required
            withAsterisk
            style={{ width: "80vw", maxWidth: "400px" }}
            onChange={(event) => {
              const { value } = event.currentTarget;

              if (value) {
                setBaseUrl(value);
              }
            }}
          />
        )}

        <Button
          mt="xl"
          style={{ width: "80vw", maxWidth: "400px" }}
          variant="gradient"
          gradient={{ from: "darkblue", to: "purple" }}
          onClick={() => {
            if (token && baseUrl) {
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

              const tid = setTimeout(() => {
                setSaved(true);
                clearTimeout(tid);
              }, 1000);
            }
          }}
        >
          Save
        </Button>

        {saved && (
          <Button
            style={{ width: "80vw", maxWidth: "400px" }}
            variant="gradient"
            gradient={{ from: "blue", to: "purple" }}
            onClick={() => {
              send({
                type: "SETTINGS_REQUESTED",
              });

              if (typeof router.query?.back === "string") {
                router.back();
                return;
              }

              router.push("/");
            }}
          >
            Go Back
          </Button>
        )}
      </Stack>
    </>
  );
};

export default Settings;
