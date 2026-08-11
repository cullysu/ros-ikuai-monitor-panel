export const ROUTER_ADDRESS_ERROR = "设备地址只能是 IP 地址或主机名；协议和端口请在高级连接设置中填写";

function isAsciiDigits(value: string): boolean {
  return value.length > 0 && [...value].every((character) => character >= "0" && character <= "9");
}

function isValidIpv4Address(value: string): boolean {
  const octets = value.split(".");
  return octets.length === 4 && octets.every((octet) => (
    isAsciiDigits(octet) && !(octet.length > 1 && octet.startsWith("0")) && Number(octet) <= 255
  ));
}

function isIpv4Candidate(value: string): boolean {
  const octets = value.split(".");
  return octets.length === 4 && octets.every(isAsciiDigits);
}

function isValidIpv6Address(value: string): boolean {
  try {
    new URL(`https://[${value}]/`);
    return true;
  } catch {
    return false;
  }
}

function isValidHostname(value: string): boolean {
  try {
    const hostname = new URL(`https://${value}`).hostname;
    if (!hostname || hostname.endsWith(".")) return false;
    return hostname.split(".").every((label) => (
      label.length > 0
      && label.length <= 63
      && !label.startsWith("-")
      && !label.endsWith("-")
      && [...label].every((character) => (
        (character >= "a" && character <= "z")
        || (character >= "A" && character <= "Z")
        || (character >= "0" && character <= "9")
        || character === "-"
      ))
    ));
  } catch {
    return false;
  }
}

export function validateRouterAddress(value: string): string {
  if (!value || [...value].some((character) => character === "/" || character === "\\" || character === "@" || character === "?" || character === "#" || character.trim().length === 0)) {
    return ROUTER_ADDRESS_ERROR;
  }

  const bracketed = value.startsWith("[") && value.endsWith("]");
  if (value.includes("[") || value.includes("]")) {
    if (!bracketed || value.indexOf("[") !== 0 || value.indexOf("]") !== value.length - 1) return ROUTER_ADDRESS_ERROR;
  }

  const address = bracketed ? value.slice(1, -1) : value;
  if (address.includes(":")) return isValidIpv6Address(address) ? "" : ROUTER_ADDRESS_ERROR;
  if (bracketed || address.endsWith(".")) return ROUTER_ADDRESS_ERROR;
  if (isIpv4Candidate(address)) return isValidIpv4Address(address) ? "" : ROUTER_ADDRESS_ERROR;
  return isValidHostname(address) ? "" : ROUTER_ADDRESS_ERROR;
}
