# RouterOS Read-only Permissions

This project is designed around read-only RouterOS triage. It should not need a
RouterOS `admin` account.

## Current Guidance

Create a dedicated RouterOS user for the panel and grant the narrowest read
permissions that work in your environment.

Because RouterOS policy names and REST/SSH behavior can differ by RouterOS
version and local hardening, this project does not yet publish a universal
copy-paste permission command. A bad command here could over-grant access.

## What The Panel Reads

The collector reads RouterOS state such as:

- `/system/resource`
- interface and PPPoE client state
- IP addresses and routes
- DNS and DHCP state
- ARP and neighbor state
- firewall connection tracking summaries
- selected logs and security hints

Some paths are collected over RouterOS REST and some over SSH `print` or `get`
commands.

## Public Issue Guidance

When reporting permission problems, include:

- RouterOS version
- deployment path
- redacted error text
- whether SSH succeeds
- whether RouterOS REST is reachable

Do not paste full RouterOS exports or passwords into public issues.

## Roadmap

A future release should include a version-tested RouterOS permission matrix and
copy-paste commands for common RouterOS 7 profiles.
