import { AppProps } from "next/app";

import "../styles/globals.css";
import AppShellComponent from "../components/AppShell";
import { GlobalStateProvider } from "../store/global";
import Head from "next/head";

export default function App(props: AppProps) {
  const { Component, pageProps } = props;

  return (
    <GlobalStateProvider>
      <Head>
        <meta name="viewport" content="width=device-width, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AppShellComponent>
        <Component {...pageProps} />
      </AppShellComponent>
    </GlobalStateProvider>
  );
}
