package com.cully.routerospanel;

import android.content.res.AssetManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

final class LocalPanelServer {
    private final AssetManager assets;
    private final RouterosClient client;
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final AtomicBoolean running = new AtomicBoolean(false);
    private ServerSocket server;
    private String csrf = UUID.randomUUID().toString().replace("-", "");

    LocalPanelServer(AssetManager assets, RouterosClient client) {
        this.assets = assets;
        this.client = client;
    }

    int start() throws IOException {
        server = new ServerSocket(28648, 16, InetAddress.getByName("127.0.0.1"));
        running.set(true);
        executor.execute(new Runnable() {
            @Override public void run() {
                while (running.get()) {
                    try {
                        final Socket socket = server.accept();
                        executor.execute(new Runnable() {
                            @Override public void run() { handle(socket); }
                        });
                    } catch (Exception ignored) {
                        if (!running.get()) return;
                    }
                }
            }
        });
        return server.getLocalPort();
    }

    void stop() {
        running.set(false);
        try { if (server != null) server.close(); } catch (Exception ignored) {}
        executor.shutdownNow();
    }

    private void handle(Socket socket) {
        String method = "?";
        String path = "?";
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.ISO_8859_1));
            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.length() == 0) return;
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) return;
            method = parts[0];
            path = parts[1];
            int query = path.indexOf('?');
            if (query >= 0) path = path.substring(0, query);
            int contentLength = 0;
            String line;
            while ((line = reader.readLine()) != null && line.length() > 0) {
                int colon = line.indexOf(':');
                if (colon > 0 && "content-length".equalsIgnoreCase(line.substring(0, colon).trim())) {
                    try { contentLength = Integer.parseInt(line.substring(colon + 1).trim()); } catch (Exception ignored) {}
                }
            }
            char[] bodyChars = new char[Math.max(0, contentLength)];
            int read = 0;
            while (read < bodyChars.length) {
                int got = reader.read(bodyChars, read, bodyChars.length - read);
                if (got < 0) break;
                read += got;
            }
            String body = new String(bodyChars, 0, read);
            android.util.Log.i("PanelServer", method + " " + path);
            if (path.startsWith("/api/")) write(socket, api(method, path, body));
            else writeAsset(socket, path);
        } catch (Throwable exception) {
            android.util.Log.e("PanelServer", "request failed: " + method + " " + path, exception);
        } finally {
            try { socket.close(); } catch (Exception ignored) {}
        }
    }

    private Response api(String method, String path, String body) throws Exception {
        if ("GET".equals(method) && "/api/health".equals(path)) {
            JSONObject json = new JSONObject();
            json.put("status", client.isConfigured() ? "ok" : "needs_config");
            json.put("updatedAt", RouterosClient.rfc3339(System.currentTimeMillis()));
            json.put("profile", "routeros_only");
            json.put("target", "127.0.0.1");
            json.put("routerLogin", client.profile());
            json.put("savedLoginCount", 0);
            return json(200, json);
        }
        if ("GET".equals(method) && "/api/router-login".equals(path)) {
            JSONObject json = new JSONObject();
            json.put("ok", true);
            json.put("routerLogin", client.profile());
            json.put("savedLogins", new JSONArray());
            json.put("profileStorageAvailable", false);
            json.put("savePasswordAvailable", false);
            json.put("csrfToken", csrf);
            return json(200, json);
        }
        if ("POST".equals(method) && "/api/router-login".equals(path)) {
            try {
                JSONObject input = body == null || body.length() == 0 ? new JSONObject() : new JSONObject(body);
                JSONObject test = client.connect(input);
                JSONObject json = new JSONObject();
                json.put("ok", true);
                json.put("routerLogin", client.profile());
                json.put("savedLogins", new JSONArray());
                json.put("test", test);
                json.put("warning", test.optJSONObject("ssh") != null && test.optJSONObject("ssh").optBoolean("ok")
                        ? JSONObject.NULL
                        : "REST 已连接。Android 客户端只探测 SSH 端口，不保存密码到安装包。");
                json.put("removed", JSONObject.NULL);
                return json(200, json);
            } catch (Exception exception) {
                JSONObject json = new JSONObject();
                json.put("error", exception.getMessage());
                json.put("code", "router_login_failed");
                if (exception instanceof RouterosClient.LoginException) {
                    json.put("test", ((RouterosClient.LoginException) exception).test);
                }
                return json(400, json);
            }
        }
        if ("POST".equals(method) && "/api/router-logout".equals(path)) {
            client.clear();
            JSONObject json = new JSONObject();
            json.put("ok", true);
            json.put("routerLogin", client.profile());
            json.put("savedLogins", new JSONArray());
            json.put("test", JSONObject.NULL);
            json.put("warning", "");
            json.put("removed", JSONObject.NULL);
            return json(200, json);
        }
        if ("POST".equals(method) && "/api/router-login-forget".equals(path)) {
            JSONObject json = new JSONObject();
            json.put("ok", true);
            json.put("routerLogin", client.profile());
            json.put("savedLogins", new JSONArray());
            json.put("test", JSONObject.NULL);
            json.put("warning", "");
            json.put("removed", false);
            return json(200, json);
        }
        if ("GET".equals(method) && "/api/snapshot".equals(path)) {
            return json(200, client.snapshot());
        }
        if ("GET".equals(method) && ("/api/semantic-triage".equals(path) || "/api/action-queue".equals(path))) {
            JSONObject json = new JSONObject();
            json.put("status", client.isConfigured() ? "ok" : "needs_config");
            json.put("readOnly", true);
            json.put("generatedAt", RouterosClient.rfc3339(System.currentTimeMillis()));
            json.put("queue", new JSONArray());
            json.put("actionQueue", new JSONArray());
            json.put("counts", new JSONObject().put("critical", 0).put("warning", 0).put("info", 0));
            return json(200, json);
        }
        if ("GET".equals(method) && path.startsWith("/api/dns-static")) {
            JSONObject json = new JSONObject();
            json.put("totalCount", 0);
            json.put("offset", 0);
            json.put("limit", 100);
            json.put("visibleRuleCount", 0);
            json.put("rows", new JSONArray());
            return json(200, json);
        }
        if ("GET".equals(method) && "/api/readonly-diagnostics".equals(path)) {
            return json(200, new JSONObject().put("ok", true).put("disabled", true));
        }
        JSONObject missing = new JSONObject();
        missing.put("error", "API route not found");
        missing.put("code", "not_found");
        return json(404, missing);
    }

    private void writeAsset(Socket socket, String path) throws Exception {
        String assetPath = "www" + ("/".equals(path) ? "/index.html" : URLDecoder.decode(path, "UTF-8"));
        if (assetPath.contains("..")) {
            write(socket, new Response(404, "text/plain", "not found".getBytes(StandardCharsets.UTF_8)));
            return;
        }
        InputStream input;
        try {
            input = assets.open(assetPath);
        } catch (Exception ignored) {
            write(socket, new Response(404, "text/plain", "not found".getBytes(StandardCharsets.UTF_8)));
            return;
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int count;
        while ((count = input.read(buffer)) >= 0) output.write(buffer, 0, count);
        input.close();
        write(socket, new Response(200, mime(assetPath), output.toByteArray()));
    }

    private Response json(int status, JSONObject payload) throws Exception {
        return new Response(status, "application/json; charset=utf-8", payload.toString().getBytes(StandardCharsets.UTF_8));
    }

    private void write(Socket socket, Response response) throws Exception {
        OutputStream output = socket.getOutputStream();
        String header = "HTTP/1.1 " + response.status + (response.status == 200 ? " OK" : " ERR") + "\r\n"
                + "Content-Type: " + response.mime + "\r\n"
                + "Content-Length: " + response.body.length + "\r\n"
                + "Cache-Control: no-store\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Set-Cookie: ros_panel_csrf=" + csrf + "; Path=/\r\n"
                + "Connection: close\r\n\r\n";
        output.write(header.getBytes(StandardCharsets.ISO_8859_1));
        output.write(response.body);
        output.flush();
    }

    private static String mime(String path) {
        String lower = path.toLowerCase(Locale.US);
        if (lower.endsWith(".html")) return "text/html; charset=utf-8";
        if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (lower.endsWith(".css")) return "text/css; charset=utf-8";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".json") || lower.endsWith(".webmanifest")) return "application/json; charset=utf-8";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    private static final class Response {
        final int status;
        final String mime;
        final byte[] body;
        Response(int status, String mime, byte[] body) {
            this.status = status;
            this.mime = mime;
            this.body = body;
        }
    }
}
