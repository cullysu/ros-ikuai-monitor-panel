import ipaddress
import re


TRACKING_FIELD_PATTERN = re.compile(r"^\s*([A-Za-z0-9-]+):\s*(.*?)\s*$")
TERSE_FIELD_PATTERN = re.compile(r"([A-Za-z0-9-]+)=(.*?)(?=\s+[A-Za-z0-9-]+=|$)")


class ConnectionEvidenceParser:
    """Pure normalization for RouterOS connection and DNS evidence rows."""

    def __init__(self, integer_parser, *, detail_sample_limit, search_fields):
        self.integer_parser = integer_parser
        self.detail_sample_limit = max(1, int(detail_sample_limit))
        self.search_fields = tuple(search_fields)

    def parse_tracking_summary(self, fields, source="RouterOS connection tracking"):
        fields = {str(key).lower(): value for key, value in (fields or {}).items()}
        total = self.integer_parser(fields.get("total-entries"), -1)
        if total < 0:
            raise RuntimeError(f"{source} missing total-entries")
        return {
            "total": total,
            "ipv4": self.integer_parser(fields.get("total-ip4-entries"), 0),
            "ipv6": self.integer_parser(fields.get("total-ip6-entries"), 0),
        }

    def parse_tracking_text(self, output):
        fields = {}
        for raw_line in str(output or "").splitlines():
            match = TRACKING_FIELD_PATTERN.match(raw_line)
            if match:
                fields[match.group(1).lower()] = match.group(2).strip()
        return fields

    @staticmethod
    def parse_terse_line(line):
        row = {}
        for match in TERSE_FIELD_PATTERN.finditer(str(line or "")):
            key = match.group(1)
            value = match.group(2).strip()
            if re.fullmatch(r"[\d.\s]+", value):
                value = value.replace(" ", "")
            row[key] = value
        return row

    def dedupe_rows(self, source_rows):
        rows = []
        seen = set()
        for raw_row in source_rows or []:
            row = raw_row if isinstance(raw_row, dict) else {}
            if not row:
                continue
            identity = (
                row.get("src-address", ""),
                row.get("dst-address", ""),
                row.get("reply-src-address", ""),
                row.get("reply-dst-address", ""),
                row.get("protocol", ""),
                row.get("timeout", ""),
                row.get("connection-mark", ""),
            )
            if identity in seen:
                continue
            seen.add(identity)
            rows.append(row)
            if len(rows) >= self.detail_sample_limit:
                break
        return rows

    @staticmethod
    def split_endpoint(value):
        text = str(value or "").strip()
        if not text:
            return "", ""
        if text.startswith("["):
            end = text.find("]")
            if end > 0:
                port = text[end + 2 :] if text[end + 1 : end + 2] == ":" else ""
                return text[1:end], port
        match = re.fullmatch(r"(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?", text)
        if match:
            ip_text = match.group(1)
            try:
                ip_text = str(ipaddress.ip_address(ip_text))
            except ValueError:
                pass
            return ip_text, match.group(2) or ""
        try:
            return str(ipaddress.ip_address(text)), ""
        except ValueError:
            return text, ""

    def row_matches_ip(self, row, ip_text):
        for field in ("src-address", "dst-address", "reply-src-address", "reply-dst-address"):
            endpoint_ip, _port = self.split_endpoint(row.get(field))
            if endpoint_ip == ip_text:
                return True
        return False

    def normalize_search_row(self, row):
        src_ip, src_port = self.split_endpoint(row.get("src-address"))
        dst_ip, dst_port = self.split_endpoint(row.get("dst-address"))
        reply_src_ip, reply_src_port = self.split_endpoint(row.get("reply-src-address"))
        reply_dst_ip, reply_dst_port = self.split_endpoint(row.get("reply-dst-address"))
        return {
            "srcAddress": row.get("src-address", ""),
            "dstAddress": row.get("dst-address", ""),
            "replySrcAddress": row.get("reply-src-address", ""),
            "replyDstAddress": row.get("reply-dst-address", ""),
            "srcIp": src_ip,
            "srcPort": src_port,
            "dstIp": dst_ip,
            "dstPort": dst_port,
            "replySrcIp": reply_src_ip,
            "replySrcPort": reply_src_port,
            "replyDstIp": reply_dst_ip,
            "replyDstPort": reply_dst_port,
            "protocol": row.get("protocol", ""),
            "timeout": row.get("timeout", ""),
            "mark": row.get("connection-mark", "-") or "-",
            "origRate": self.integer_parser(row.get("orig-rate"), 0),
            "replRate": self.integer_parser(row.get("repl-rate"), 0),
            "origBytes": self.integer_parser(row.get("orig-bytes"), 0),
            "replBytes": self.integer_parser(row.get("repl-bytes"), 0),
            "raw": {key: row.get(key, "") for key in self.search_fields},
        }

    @staticmethod
    def normalize_dns_rows(rows, limit=None):
        normalized_rows = []
        for item in rows or []:
            if isinstance(item, list):
                normalized_rows.extend(item)
            elif isinstance(item, dict):
                normalized_rows.append(item)
        if limit is None:
            return normalized_rows
        return normalized_rows[:limit]
