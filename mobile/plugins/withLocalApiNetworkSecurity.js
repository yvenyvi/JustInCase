import fs from 'node:fs/promises';
import path from 'node:path';
import { withAndroidManifest, withDangerousMod } from '@expo/config-plugins';

const getCleartextApiHost = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://justincase-production-9b25.up.railway.app';

  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== 'http:') return null;

    const host = url.hostname.toLowerCase();
    const isLocalhost = host === 'localhost' || host === '10.0.2.2';
    const octets = host.split('.').map(Number);
    const isPrivateIpv4 = octets.length === 4
      && octets.every(octet => Number.isInteger(octet) && octet >= 0 && octet <= 255)
      && (octets[0] === 10
        || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
        || (octets[0] === 192 && octets[1] === 168));

    return isLocalhost || isPrivateIpv4 ? host : null;
  } catch {
    return null;
  }
};

const withLocalApiNetworkSecurity = config => {
  config = withAndroidManifest(config, modConfig => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return modConfig;
  });

  return withDangerousMod(config, ['android', async modConfig => {
    const resourceDirectory = path.join(
      modConfig.modRequest.platformProjectRoot,
      'app',
      'src',
      'main',
      'res',
      'xml',
    );
    await fs.mkdir(resourceDirectory, { recursive: true });

    const host = getCleartextApiHost();
    const domainRule = host
      ? `  <domain-config cleartextTrafficPermitted="true"><domain>${host}</domain></domain-config>\n`
      : '';
    const xml = `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n  <base-config cleartextTrafficPermitted="false" />\n${domainRule}</network-security-config>\n`;

    await fs.writeFile(path.join(resourceDirectory, 'network_security_config.xml'), xml);
    return modConfig;
  }]);
};

export default withLocalApiNetworkSecurity;
