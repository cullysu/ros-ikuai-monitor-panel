"""Fake RouterOS SSH server (paramiko server mode).

Control via _scale/ssh_state.json:
  {"tracking": 1234, "connections": 200, "xss": false, "garbage": false,
   "huge_line": false, "lines_50k": false, "trickle": 0, "delay": 0,
   "refuse_auth": false, "hang": false}

Usage: python fake_ssh.py <port>
"""
import json
import sys
import threading
import time
from pathlib import Path

import paramiko

PORT = int(sys.argv[1])
STATE_FILE = Path(__file__).resolve().parent / "ssh_state.json"
STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
LOCK = threading.Lock()
XSS = '<img src=x onerror="window.__xss=(window.__xss||0)+1">'


def state():
    try:
        with LOCK:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def conn_line(i, st):
    if st.get("xss"):
        src = f'{XSS}:{1000 + i}'
        dst = f'10.6.6.{i % 250 + 1}:443" onerror="{XSS}'
        mark = f'mark{i}" data-x="{XSS}'
    elif st.get("lan20k"):
        src = f'10.0.{(i >> 8) & 255}.{i % 250 + 2}:{4000 + i}'
        dst = f'23.{(i * 7) % 250 + 1}.{(i * 13) % 250 + 1}.{i % 250 + 1}:{443 if i % 3 else 80}'
        mark = f'mark-{i % 8}' if i % 2 else ''
    else:
        src = f'192.168.88.{i % 250 + 2}:{4000 + i}'
        dst = f'23.{(i * 7) % 250 + 1}.{(i * 13) % 250 + 1}.{i % 250 + 1}:{443 if i % 3 else 80}'
        mark = f'mark-{i % 8}' if i % 2 else ''
    fields = [
        f'src-address={src}',
        f'dst-address={dst}',
        f'reply-src-address={dst}',
        f'reply-dst-address={src}',
        'protocol=tcp' if i % 4 else 'protocol=udp',
        f'timeout={"4w2d" if i % 5 else "58s"}',
        f'connection-mark={mark}',
        f'orig-rate={500000 + i * 12345}',
        f'repl-rate={90000 + i * 6789}',
        f'orig-bytes={1000000 + i * 98765}',
        f'repl-bytes={5000000 + i * 4321}',
    ]
    if st.get("garbage") and i % 9 == 0:
        return f'\x00\xff garbage-line-{i} src-address=broken dst-address=' + "A" * 500
    return " ".join(fields)


def handle_exec(channel, command):
    st = state()
    try:
        cmd = command.decode("utf-8", "replace")
    except Exception:
        cmd = ""
    delay = float(st.get("delay") or 0)
    if delay:
        time.sleep(delay)
    if st.get("hang"):
        time.sleep(3600)
        return
    if "connection/tracking" in cmd:
        if st.get("garbage"):
            out = " total-entries: not-a-number\n total-ip4-entries: -5\n junk-line\n total-ip6-entries:\n"
        else:
            n = int(st.get("tracking") or 100)
            out = f" total-entries: {n}\n total-ip4-entries: {int(n * 0.9)}\n total-ip6-entries: {n - int(n * 0.9)}\n"
        channel.sendall(out.encode())
        return
    if "connection print terse" in cmd:
        n = int(st.get("connections") or 0)
        lines = []
        if st.get("huge_line"):
            lines.append("src-address=1.2.3.4:1 dst-address=5.6.7.8:2 " + "B" * 1_000_000)
        count = 50000 if st.get("lines_50k") else n
        trickle = float(st.get("trickle") or 0)
        sent = 0
        for i in range(count):
            lines.append(conn_line(i, st))
        payload = ("\n".join(lines) + "\n").encode()
        if trickle:
            step = max(1, len(payload) // 40)
            for off in range(0, len(payload), step):
                channel.sendall(payload[off:off + step])
                sent += step
                time.sleep(trickle)
            if sent < len(payload):
                channel.sendall(payload[step * (len(payload) // step):])
        else:
            channel.sendall(payload)
        return
    channel.sendall(b"# unknown command\n")


HOST_KEY = paramiko.RSAKey.generate(2048)


class Srv(paramiko.ServerInterface):
    def __init__(self):
        self.exec_command = None
        self.exec_event = threading.Event()

    def get_allowed_auths(self, username):
        return "password"

    def check_auth_password(self, username, password):
        if state().get("refuse_auth"):
            return paramiko.AUTH_FAILED
        if username == "a" and password == "x":
            return paramiko.AUTH_SUCCESSFUL
        return paramiko.AUTH_FAILED

    def check_channel_request(self, kind, chan):
        return paramiko.OPEN_SUCCEEDED

    def check_channel_exec_request(self, channel, command):
        self.exec_command = command
        self.exec_event.set()
        return True


def serve_connection(client):
    t = paramiko.Transport(client)
    try:
        t.add_server_key(HOST_KEY)
        srv = Srv()
        t.start_server(server=srv)
        chan = t.accept(30)
        if chan is None:
            return
        if not srv.exec_event.wait(15):
            chan.close()
            return
        try:
            handle_exec(chan, srv.exec_command or b"")
        except Exception as e:
            try:
                chan.sendall(b"# error\n")
            except Exception:
                pass
        finally:
            # 模拟真 RouterOS：输出先到，通道保持打开一小段，再发退出码
            time.sleep(5.0)
            try:
                chan.send_exit_status(0)
                chan.shutdown_write()
                chan.close()
            except Exception:
                pass
        end = time.time() + 5
        while time.time() < end and t.is_active():
            time.sleep(0.1)
    except Exception:
        pass
    finally:
        try:
            t.close()
        except Exception:
            pass


def main():
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(("127.0.0.1", PORT))
    sock.listen(16)
    print(f"fake ssh on {PORT}", flush=True)
    while True:
        client, addr = sock.accept()
        threading.Thread(target=serve_connection, args=(client,), daemon=True).start()


if __name__ == "__main__":
    main()
