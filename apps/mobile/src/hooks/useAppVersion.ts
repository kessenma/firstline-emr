import DeviceInfo from 'react-native-device-info';

export function useAppVersion() {
  const version = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();
  return {
    version,
    buildNumber,
    displayVersion: `v${version} (${buildNumber})`,
  };
}
