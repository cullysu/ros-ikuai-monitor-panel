"""Interface counter observation, rate, and quality calculations."""

import copy
import re
import time


_runtime = None


def bind_interface_metrics_runtime(runtime):
    global _runtime
    _runtime = runtime


def observed_interface_counter(value):
    """Return a RouterOS interface counter only when it was actually observed."""
    counter = _runtime.to_int(value, None)
    return counter if counter is not None and counter >= 0 else None


def interface_is_derived(name, iface_type):
    type_text = str(iface_type or "").strip().lower()
    name_text = str(name or "").strip().lower()
    return type_text in {"vlan", "macvlan"} or name_text.startswith(("vlan", "macvlan"))


def interface_parent_hint(item):
    item = item if isinstance(item, dict) else {}
    own_name = str(item.get("name") or "").strip()
    for key in ("interface", "master-interface", "actual-interface", "parent"):
        value = str(item.get(key) or "").strip()
        if value and value != own_name:
            return value
    return None


def interface_logical_pair_key(item):
    item = item if isinstance(item, dict) else {}
    name = str(item.get("name") or "").strip().lower()
    match = re.fullmatch(r"(?:vlan|macvlan)(.+)", name)
    if match and match.group(1):
        return f"logical-pair:{match.group(1)}"
    return None


def interface_quality_group_key(item):
    item = item if isinstance(item, dict) else {}
    parent = interface_parent_hint(item)
    logical_pair = interface_logical_pair_key(item)
    iface_type = str(item.get("type") or "").strip().lower() or "interface"
    vlan_id = str(item.get("vlan-id") or "").strip()
    own_name = str(item.get("name") or "").strip()
    if parent:
        return ":".join(part for part in (parent, iface_type, vlan_id or own_name) if part)
    if logical_pair:
        return logical_pair
    return own_name or iface_type


class InterfaceMetricsMixin:
    def compute_rates(self, interfaces, fresh_counter_sample=False):
        if not fresh_counter_sample:
            with self.lock:
                return copy.deepcopy(self.current_rates)
        ts = time.time()
        with self.lock:
            previous = copy.deepcopy(self.prev_counters)
            previous_ts = self.prev_ts
            previous_rates = copy.deepcopy(self.current_rates)
            zero_candidates = copy.deepcopy(self.zero_rate_candidates)
        interval = max(ts - previous_ts, 1) if previous_ts else 1
        rates = {}
        current = {}
        sample_ready = False
        counter_reset = False

        def previous_direction_rate(interface_name, direction):
            value = previous_rates.get(interface_name, {}).get(f"{direction}Bps")
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        def confirm_zero_rate(interface_name, direction, raw_rate, has_baseline, reset):
            if reset:
                zero_candidates.setdefault(interface_name, {})[direction] = 0
                return None
            if not has_baseline:
                zero_candidates.setdefault(interface_name, {})[direction] = 0
                return None
            previous_rate = previous_direction_rate(interface_name, direction)
            if raw_rate == 0 and previous_rate > 0:
                direction_counts = zero_candidates.setdefault(interface_name, {})
                direction_counts[direction] = _runtime.to_int(direction_counts.get(direction), 0) + 1
                if direction_counts[direction] < _runtime.RATE_ZERO_CONFIRM_SAMPLES:
                    return previous_rate
                return 0
            zero_candidates.setdefault(interface_name, {})[direction] = 0
            return raw_rate

        for item in interfaces:
            name = item.get("name")
            if not name:
                continue
            rx = observed_interface_counter(item.get("rx-byte"))
            tx = observed_interface_counter(item.get("tx-byte"))
            if rx is None or tx is None:
                zero_candidates.pop(name, None)
                rates[name] = {
                    "rxBps": None,
                    "txBps": None,
                    "rateSampleReady": False,
                    "counterReset": False,
                }
                continue
            current[name] = (rx, tx)
            has_baseline = name in previous
            prev_rx, prev_tx = previous.get(name, (rx, tx))
            reset = has_baseline and (rx < prev_rx or tx < prev_tx)
            counter_reset = counter_reset or reset
            sample_ready = sample_ready or (has_baseline and not reset)
            raw_rx_bps = max(rx - prev_rx, 0) / interval if has_baseline and not reset else None
            raw_tx_bps = max(tx - prev_tx, 0) / interval if has_baseline and not reset else None
            rates[name] = {
                "rxBps": confirm_zero_rate(name, "rx", raw_rx_bps, has_baseline, reset),
                "txBps": confirm_zero_rate(name, "tx", raw_tx_bps, has_baseline, reset),
                "rateSampleReady": has_baseline and not reset,
                "counterReset": reset,
            }
        with self.lock:
            self.prev_counters = current
            self.prev_ts = ts
            self.current_rates = copy.deepcopy(rates)
            self.zero_rate_candidates = zero_candidates
            self.last_counter_sample_at = _runtime.format_iso_now()
            self.last_rate_sample_ready = sample_ready
            self.last_counter_reset = counter_reset
            if sample_ready:
                self.rate_history_sample_count += 1
        return rates

    def compute_interface_quality(self, interfaces, fresh_counter_sample=False):
        if not fresh_counter_sample:
            with self.lock:
                return copy.deepcopy(self.current_interface_quality)

        updated_at = _runtime.format_iso_now()
        with self.lock:
            previous = copy.deepcopy(self.prev_quality_counters)
            sample_count = self.interface_quality_sample_count + 1

        current = {}
        quality = {}
        for item in interfaces:
            name = item.get("name")
            if not name:
                continue
            counters = {
                "rxPackets": observed_interface_counter(item.get("rx-packet")),
                "txPackets": observed_interface_counter(item.get("tx-packet")),
                "rxDrop": observed_interface_counter(item.get("rx-drop")),
                "txDrop": observed_interface_counter(item.get("tx-drop")),
                "rxError": observed_interface_counter(item.get("rx-error")),
                "txError": observed_interface_counter(item.get("tx-error")),
            }
            if any(value is None for value in counters.values()):
                is_derived = interface_is_derived(name, item.get("type"))
                quality[name] = {
                    "packetTotal": None,
                    "packetDelta": None,
                    "dropTotal": None,
                    "errorTotal": None,
                    "dropDelta": None,
                    "errorDelta": None,
                    "rxDropDelta": None,
                    "txDropDelta": None,
                    "rxErrorDelta": None,
                    "txErrorDelta": None,
                    "lossRate": None,
                    "errorRate": None,
                    "qualityUpdatedAt": updated_at,
                    "qualitySampleCount": sample_count,
                    "qualitySampleReady": False,
                    "qualityCounterReset": False,
                    "isDerivedInterface": is_derived,
                    "isLogicalInterface": is_derived,
                    "qualityDisplayWeight": 0.35 if is_derived else 1.0,
                    "qualityEvidenceLevel": "logical" if is_derived else "primary",
                    "qualityParent": interface_parent_hint(item),
                    "logicalPairKey": interface_logical_pair_key(item),
                    "qualityGroupKey": interface_quality_group_key(item),
                }
                continue
            current[name] = counters
            prev = previous.get(name)
            has_baseline = isinstance(prev, dict)
            counter_reset = bool(
                has_baseline
                and any(counters[key] < _runtime.to_int(prev.get(key)) for key in counters)
            )
            delta_available = has_baseline and not counter_reset
            if delta_available:
                delta = {key: max(counters[key] - _runtime.to_int(prev.get(key)), 0) for key in counters}
            else:
                delta = {key: None for key in counters}

            packet_total = counters["rxPackets"] + counters["txPackets"]
            packet_delta = delta["rxPackets"] + delta["txPackets"] if delta_available else None
            drop_total = counters["rxDrop"] + counters["txDrop"]
            error_total = counters["rxError"] + counters["txError"]
            drop_delta = delta["rxDrop"] + delta["txDrop"] if delta_available else None
            error_delta = delta["rxError"] + delta["txError"] if delta_available else None
            loss_rate = (drop_delta / packet_delta) if packet_delta is not None and packet_delta > 0 else None
            error_rate = (error_delta / packet_delta) if packet_delta is not None and packet_delta > 0 else None
            is_derived = interface_is_derived(name, item.get("type"))
            quality[name] = {
                "packetTotal": packet_total,
                "packetDelta": packet_delta,
                "dropTotal": drop_total,
                "errorTotal": error_total,
                "dropDelta": drop_delta,
                "errorDelta": error_delta,
                "rxDropDelta": delta["rxDrop"],
                "txDropDelta": delta["txDrop"],
                "rxErrorDelta": delta["rxError"],
                "txErrorDelta": delta["txError"],
                "lossRate": loss_rate,
                "errorRate": error_rate,
                "qualityUpdatedAt": updated_at,
                "qualitySampleCount": sample_count,
                "qualitySampleReady": has_baseline and not counter_reset,
                "qualityCounterReset": counter_reset,
                "isDerivedInterface": is_derived,
                "isLogicalInterface": is_derived,
                "qualityDisplayWeight": 0.35 if is_derived else 1.0,
                "qualityEvidenceLevel": "logical" if is_derived else "primary",
                "qualityParent": interface_parent_hint(item),
                "logicalPairKey": interface_logical_pair_key(item),
                "qualityGroupKey": interface_quality_group_key(item),
            }

        with self.lock:
            self.prev_quality_counters = current
            self.current_interface_quality = copy.deepcopy(quality)
            self.last_quality_sample_at = updated_at
            self.interface_quality_sample_count = sample_count
        return quality
