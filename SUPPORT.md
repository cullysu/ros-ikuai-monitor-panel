# Support

This is an early public MVP. Support is best-effort and should stay safe for
real networks.

## Before Asking For Help

1. Read the deployment path that matches your install:
   - [Docker](./DEPLOY_DOCKER.md)
   - [Windows EXE](./DEPLOY_WINDOWS_EXE.md)
   - [Local Python](./DEPLOY_LOCAL.md)
   - [Linux systemd / VM](./README.md#linux-systemd--vm)
   - [RouterOS Container](./DEPLOY_ROUTEROS_CONTAINER.md)
2. Confirm the panel opens on the panel host:
   `http://127.0.0.1:28646/`
3. Confirm you are opening the panel as `http://127.0.0.1:28646/`; other IP
   browser entrypoints are outside the public deployment contract.
4. Confirm RouterOS SSH is reachable from the panel host and that you are using
   a dedicated read-only RouterOS user.
5. For RouterOS Container installs, confirm whether you used a registry image
   or an uploaded tar archive. If an uploaded tar contains `oci-layout`, use the
   converter documented in [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md)
   before reporting an import failure.
6. If Docker install is slow or building locally, note whether the GHCR image
   pull failed and whether the installer fell back to local build.

## Good Public Issues Include

- Deployment path: Docker, Windows EXE, Local Python, Linux systemd/VM, or
  RouterOS Container.
- Panel version or Git commit.
- RouterOS version and device model, if safe to share.
- Whether the failure is panel startup, browser access, RouterOS login, missing
  data, UI layout, or packaging.
- Redacted logs or screenshots.

## Do Not Post

- RouterOS passwords, tokens, private keys, or full config exports.
- Public IPs, DNS names, MAC addresses, PPPoE credentials, or ISP account data.
- Screenshots that expose sensitive WAN, firewall, NAT, or user details.

## Security Reports

Do not open a public issue for vulnerabilities or credential leaks. Follow
[SECURITY.md](./SECURITY.md).
