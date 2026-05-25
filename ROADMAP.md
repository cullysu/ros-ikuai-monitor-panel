# Roadmap

This roadmap is directional. It is not a promise of dates or support levels.

## Now

- Keep the public product read-only by default.
- Make Docker the simplest public install path.
- Keep Windows EXE, Linux systemd/VM, and RouterOS Container documented but
  clearly scoped.
- Improve issue quality, support docs, security docs, CI, and release hygiene.

## Next

- Publish versioned GitHub releases with checksums.
- Publish container images for stable tags.
- Add a release installer path that can pin `--version`.
- Add a tested RouterOS read-only permission matrix.
- Improve credential storage options and make unsafe storage choices explicit.
- Split stable fixtures from test scripts for easier public review.

## Later

- Optional authentication guidance or integration examples for reverse proxies.
- More scale-adaptive section APIs.
- More explicit home, multi-WAN, and scale-adaptive modes.
- Optional private diagnostics that remain off by default.

## Not Planned For The Public Default

- RouterOS configuration writes.
- Silent firewall/NAT/routing changes.
- Direct public-internet exposure without external auth/TLS.
- Private OpenWrt/Nikki/local-lab diagnostics enabled by default.
