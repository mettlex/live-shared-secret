import machineDef from "./definition";
import {
  changeColorScheme,
  restoreColorScheme,
  storeColorScheme,
  setNavOpen,
  setNavClosed,
  loadSettingsFromStorage,
  storeServerlessApiAccessToken,
  storeServerlessApiBaseUrl,
} from "./actions";
import {} from "./services";

export default machineDef.withConfig({
  actions: {
    restoreColorScheme,
    changeColorScheme,
    storeColorScheme,

    setNavOpen,
    setNavClosed,

    loadSettingsFromStorage,
    storeServerlessApiAccessToken,
    storeServerlessApiBaseUrl,
  },
  services: {},
});
