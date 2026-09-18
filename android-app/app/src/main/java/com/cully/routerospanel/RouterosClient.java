package com.cully.routerospanel;

import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.ConnectException;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

final class RouterosClient {
    static final class LoginException extends RuntimeException {
        final JSONObject test;
        LoginException(String message, JSONObject test) { super(message); this.test = test; }
    }

    // Remembered device endpoint (never the password) so reopening the app
    // prefills the connection form; the password itself stays memory-only.
    private java.io.File rememberedDeviceFile = null;

    private String host = "";
    private String user = "";
    private String password = "";
    private String restScheme = "http";
    private int restPort = 80;
    private int sshPort = 22;
    private boolean restVerifyTls = false;
    private boolean configured = false;
    private JSONObject lastTest = null;
    private String identity = "";
    private final Map<String, long[]> lastCounters = new HashMap<String, long[]>();
    private long lastCounterAt = 0L;
    private final List<JSONObject> trafficSamples = new ArrayList<JSONObject>();
    private final List<JSONObject> resourceSamples = new ArrayList<JSONObject>();
    private final List<String> historyTimes = new ArrayList<String>();
    private final List<Object> historyUp = new ArrayList<Object>();
    private final List<Object> historyDown = new ArrayList<Object>();
    private final List<Object> historyCpu = new ArrayList<Object>();
    private final List<Object> historyMemory = new ArrayList<Object>();
    private final List<Object> historyDisk = new ArrayList<Object>();

    synchronized void clear() {
        configured = false;
        host = "";
        user = "";
        password = "";
        lastTest = null;
        identity = "";
        lastCounters.clear();
        lastCounterAt = 0L;
        trafficSamples.clear();
        resourceSamples.clear();
        historyTimes.clear();
        historyUp.clear();
        historyDown.clear();
        historyCpu.clear();
        historyMemory.clear();
        historyDisk.clear();
        if (rememberedDeviceFile != null) rememberedDeviceFile.delete();
    }

    synchronized void attachRememberedDeviceFile(java.io.File file) {
        rememberedDeviceFile = file;
        try {
            if (!file.exists()) return;
            JSONObject saved = new JSONObject(new String(java.nio.file.Files.readAllBytes(file.toPath()), java.nio.charset.StandardCharsets.UTF_8));
            host = saved.optString("host", "");
            user = saved.optString("user", "");
            restScheme = "https".equals(saved.optString("restScheme")) ? "https" : "http";
            restPort = saved.optInt("restPort", restScheme.equals("https") ? 443 : 80);
            sshPort = saved.optInt("sshPort", 22);
            restVerifyTls = saved.optBoolean("restVerifyTls", restScheme.equals("https"));
        } catch (Exception ignored) {
        }
    }

    private synchronized void rememberDevice() {
        if (rememberedDeviceFile == null) return;
        try {
            JSONObject saved = new JSONObject();
            saved.put("host", host);
            saved.put("user", user);
            saved.put("restScheme", restScheme);
            saved.put("restPort", restPort);
            saved.put("sshPort", sshPort);
            saved.put("restVerifyTls", restVerifyTls);
            java.nio.file.Files.write(rememberedDeviceFile.toPath(), saved.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        } catch (Exception ignored) {
        }
    }

    synchronized boolean isConfigured() {
        return configured;
    }

    synchronized JSONObject profile() throws Exception {
        JSONObject profile = new JSONObject();
        profile.put("configured", configured);
        profile.put("host", host);
        profile.put("user", user);
        profile.put("sshPort", sshPort);
        profile.put("sshHostKeyFingerprint", "");
        profile.put("restScheme", restScheme);
        profile.put("restPort", restPort);
        profile.put("restVerifyTls", restVerifyTls);
        profile.put("insecureRestConfirmed", !"https".equals(restScheme) || !restVerifyTls);
        profile.put("source", configured ? "android-app" : "");
        profile.put("savedId", "");
        profile.put("updatedAt", rfc3339(System.currentTimeMillis()));
        profile.put("passwordSet", configured && password.length() > 0);
        profile.put("lastTest", lastTest == JSONObject.NULL || lastTest == null ? JSONObject.NULL : lastTest);
        return profile;
    }

    synchronized JSONObject connect(JSONObject input) throws Exception {
        String nextHost = input.optString("host", "").trim();
        String nextUser = input.optString("user", "").trim();
        String nextPassword = input.optString("password", "");
        String scheme = "http".equals(input.optString("restScheme")) ? "http" : "https";
        int nextRestPort = input.optInt("restPort", "https".equals(scheme) ? 443 : 80);
        int nextSshPort = input.optInt("sshPort", 22);
        boolean verifyTls = input.optBoolean("restVerifyTls", "https".equals(scheme));
        if (nextHost.length() == 0 || nextUser.length() == 0 || nextPassword.length() == 0) {
            throw new IllegalArgumentException("地址、用户名和密码不能为空");
        }
        long started = System.currentTimeMillis();
        JSONObject rest = testRest(scheme, nextHost, nextRestPort, nextUser, nextPassword, verifyTls);
        JSONObject ssh = testSsh(nextHost, nextSshPort);
        JSONObject test = new JSONObject();
        test.put("rest", rest);
        test.put("ssh", ssh);
        test.put("elapsedMs", System.currentTimeMillis() - started);
        boolean restOk = rest.optBoolean("ok", false);
        boolean sshOk = ssh.optBoolean("ok", false);
        if (!restOk && !sshOk) {
            throw new LoginException(rest.optString("error", ssh.optString("error", "RouterOS 登录失败")), test);
        }
        if (!restOk && sshOk && !input.optBoolean("continueWithVerifiedRestOnly", false)) {
            throw new LoginException("SSH 连接成功，但 REST 验证失败；手机界面需要 REST。", test);
        }
        host = nextHost;
        user = nextUser;
        password = nextPassword;
        restScheme = scheme;
        restPort = nextRestPort;
        sshPort = nextSshPort;
        restVerifyTls = verifyTls;
        configured = restOk;
        if (configured) rememberDevice();
        lastTest = test;
        identity = rest.optString("identity", "");
        lastCounters.clear();
        lastCounterAt = 0L;
        return test;
    }

    synchronized JSONObject snapshot() throws Exception {
        if (!configured) {
            return emptySnapshot("needs_config", "RouterOS 连接尚未配置");
        }
        JSONObject resource = object(request("/rest/system/resource"));
        JSONObject identityRow = object(request("/rest/system/identity"));
        JSONArray pppoeRaw = array(request("/rest/interface/pppoe-client"));
        JSONArray interfacesRaw = array(request("/rest/interface"));
        JSONArray addressesRaw = array(request("/rest/ip/address"));
        JSONArray routesRaw = array(request("/rest/ip/route"));
        JSONArray arpRaw = array(request("/rest/ip/arp"));
        JSONArray leasesRaw = array(request("/rest/ip/dhcp-server/lease"));

        identity = identityRow.optString("name", identity);
        int cpu = parseInt(resource.optString("cpu-load", "0"));
        long totalMemory = parseLong(resource.optString("total-memory", "0"));
        long freeMemory = parseLong(resource.optString("free-memory", "0"));
        long totalDisk = parseLong(resource.optString("total-hdd-space", "0"));
        long freeDisk = parseLong(resource.optString("free-hdd-space", "0"));
        double memoryUsage = totalMemory > 0 ? round(((totalMemory - freeMemory) * 100.0) / totalMemory) : 0;
        double diskUsage = totalDisk > 0 ? round(((totalDisk - freeDisk) * 100.0) / totalDisk) : 0;

        Map<String, List<String>> ips = new HashMap<String, List<String>>();
        for (int i = 0; i < addressesRaw.length(); i++) {
            JSONObject row = addressesRaw.optJSONObject(i);
            if (row == null) continue;
            String iface = row.optString("interface", row.optString("actual-interface", ""));
            if (iface.length() == 0) continue;
            if (!ips.containsKey(iface)) ips.put(iface, new ArrayList<String>());
            ips.get(iface).add(row.optString("address", "-"));
        }

        Map<String, JSONObject> ifaceByName = new HashMap<String, JSONObject>();
        long now = System.currentTimeMillis();
        long previousSampleAt = lastCounterAt;
        JSONArray interfaces = new JSONArray();
        for (int i = 0; i < interfacesRaw.length(); i++) {
            JSONObject row = interfacesRaw.optJSONObject(i);
            if (row == null) continue;
            String name = row.optString("name", "");
            if (name.length() == 0) continue;
            long rx = parseLong(row.optString("rx-byte", "0"));
            long tx = parseLong(row.optString("tx-byte", "0"));
            int[] rates = ratesFor(name, rx, tx, now, previousSampleAt);
            JSONObject item = new JSONObject();
            item.put("name", name);
            item.put("type", row.optString("type", "-"));
            item.put("running", bool(row, "running"));
            item.put("disabled", bool(row, "disabled"));
            item.put("mac", row.optString("mac-address", "-"));
            item.put("parentInterface", row.optString("interface", row.optString("master-interface", "-")));
            item.put("ips", new JSONArray(ips.containsKey(name) ? ips.get(name) : new ArrayList<String>()));
            item.put("rxBytes", rx);
            item.put("txBytes", tx);
            item.put("rxRate", rates[0]);
            item.put("txRate", rates[1]);
            item.put("upRate", rates[1]);
            item.put("downRate", rates[0]);
            String actualMtu = row.optString("actual-mtu", "").trim();
            if (actualMtu.length() > 0) item.put("mtu", actualMtu);
            interfaces.put(item);
            ifaceByName.put(name, item);
        }
        lastCounterAt = now;

        JSONArray pppoe = new JSONArray();
        JSONArray wan = new JSONArray();
        long upTotal = 0;
        long downTotal = 0;
        int online = 0;
        List<JSONObject> pppoeRows = new ArrayList<JSONObject>();
        for (int i = 0; i < pppoeRaw.length(); i++) {
            JSONObject row = pppoeRaw.optJSONObject(i);
            if (row == null) continue;
            pppoeRows.add(row);
        }
        Collections.sort(pppoeRows, new Comparator<JSONObject>() {
            @Override public int compare(JSONObject left, JSONObject right) {
                return left.optString("name").compareToIgnoreCase(right.optString("name"));
            }
        });
        for (JSONObject row : pppoeRows) {
            String name = row.optString("name", "PPPoE");
            JSONObject iface = ifaceByName.containsKey(name) ? ifaceByName.get(name) : new JSONObject();
            boolean running = bool(row, "running") && !bool(row, "disabled");
            if (running) online += 1;
            long upRate = iface.optLong("txRate", 0);
            long downRate = iface.optLong("rxRate", 0);
            if (running) {
                upTotal += upRate;
                downTotal += downRate;
            }
            JSONObject item = new JSONObject();
            item.put("name", name);
            item.put("interface", row.optString("interface", "-"));
            item.put("parent", row.optString("interface", "-"));
            item.put("running", running);
            item.put("disabled", bool(row, "disabled"));
            item.put("status", running ? "online" : "offline");
            JSONArray wanAddresses = new JSONArray(ips.containsKey(name) ? ips.get(name) : new ArrayList<String>());
            item.put("addresses", wanAddresses);
            if (wanAddresses.length() > 0) {
                String firstAddress = wanAddresses.optString(0, "");
                int slash = firstAddress.indexOf('/');
                if (slash > 0) {
                    item.put("address", firstAddress.substring(0, slash));
                    item.put("netmask", prefixToNetmask(firstAddress.substring(slash + 1)));
                }
            }
            String wanMtu = iface.optString("mtu", "").trim();
            if (wanMtu.length() > 0) item.put("mtu", wanMtu);
            item.put("upRate", running ? upRate : JSONObject.NULL);
            item.put("downRate", running ? downRate : JSONObject.NULL);
            item.put("rxBytes", iface.optLong("rxBytes", 0));
            item.put("txBytes", iface.optLong("txBytes", 0));
            item.put("access", "PPPoE");
            item.put("uptime", row.optString("uptime", ""));
            String comment = row.optString("comment", "").trim();
            if (comment.length() > 0) item.put("provider", comment);
            pppoe.put(item);
            JSONObject wanItem = new JSONObject(item.toString());
            wanItem.put("kind", "pppoe");
            wan.put(wanItem);
        }

        JSONArray routeItems = new JSONArray();
        JSONArray defaultRoutes = new JSONArray();
        List<JSONObject> routeRows = new ArrayList<JSONObject>();
        for (int i = 0; i < routesRaw.length(); i++) {
            JSONObject row = routesRaw.optJSONObject(i);
            if (row == null) continue;
            String dst = row.optString("dst-address", "-");
            boolean isDefault = "0.0.0.0/0".equals(dst) || "::/0".equals(dst);
            boolean rowDisabled = bool(row, "disabled");
            boolean rowActive = bool(row, "active");
            JSONObject item = new JSONObject();
            item.put("dstAddress", dst);
            item.put("gateway", row.optString("gateway", "-"));
            item.put("distance", row.optString("distance", "-"));
            item.put("table", row.optString("routing-table", "main"));
            item.put("active", rowActive);
            item.put("disabled", rowDisabled);
            item.put("dynamic", bool(row, "dynamic"));
            item.put("static", bool(row, "static"));
            item.put("default", isDefault);
            routeRows.add(item);
        }
        Collections.sort(routeRows, new Comparator<JSONObject>() {
            @Override public int compare(JSONObject left, JSONObject right) {
                int score;
                score = Boolean.compare(left.optBoolean("disabled"), right.optBoolean("disabled"));
                if (score != 0) return score;
                score = Boolean.compare(right.optBoolean("active"), left.optBoolean("active"));
                if (score != 0) return score;
                score = Boolean.compare("main".equals(right.optString("table")), "main".equals(left.optString("table")));
                if (score != 0) return score;
                score = Integer.compare(parseDistance(left.optString("distance")), parseDistance(right.optString("distance")));
                if (score != 0) return score;
                return left.optString("dstAddress").compareToIgnoreCase(right.optString("dstAddress"));
            }
        });
        for (JSONObject item : routeRows) {
            routeItems.put(item);
            if (item.optBoolean("default")) defaultRoutes.put(item);
        }
        for (int w = 0; w < wan.length(); w++) {
            JSONObject wanItem = wan.optJSONObject(w);
            if (wanItem == null) continue;
            String wanName = wanItem.optString("name", "");
            for (int r = 0; r < defaultRoutes.length(); r++) {
                JSONObject route = defaultRoutes.optJSONObject(r);
                if (route == null || !route.optBoolean("active") || route.optBoolean("disabled")) continue;
                if (route.optString("gateway", "").equals(wanName)) {
                    wanItem.put("gateway", wanName);
                    break;
                }
            }
        }

        JSONArray arpItems = new JSONArray();
        JSONArray terminals = new JSONArray();
        for (int i = 0; i < arpRaw.length(); i++) {
            JSONObject row = arpRaw.optJSONObject(i);
            if (row == null) continue;
            JSONObject item = new JSONObject();
            item.put("ip", row.optString("address", "-"));
            item.put("mac", row.optString("mac-address", "-"));
            item.put("status", row.optString("status", "-"));
            item.put("dynamic", bool(row, "dynamic"));
            arpItems.put(item);
            JSONObject terminal = new JSONObject();
            terminal.put("ip", item.getString("ip"));
            terminal.put("mac", item.getString("mac"));
            terminal.put("status", item.getString("status"));
            terminal.put("hostname", "-");
            terminal.put("upRate", 0);
            terminal.put("downRate", 0);
            terminals.put(terminal);
        }

        JSONArray leases = new JSONArray();
        for (int i = 0; i < leasesRaw.length(); i++) {
            JSONObject row = leasesRaw.optJSONObject(i);
            if (row == null) continue;
            JSONObject item = new JSONObject();
            item.put("address", row.optString("address", "-"));
            item.put("hostname", row.optString("host-name", "-"));
            item.put("mac", row.optString("mac-address", "-"));
            item.put("status", row.optString("status", "-"));
            item.put("lastSeen", JSONObject.NULL);
            item.put("static", !bool(row, "dynamic"));
            leases.put(item);
        }

        String observedAt = rfc3339(now);
        appendHistory(observedAt, cpu, memoryUsage, diskUsage, upTotal, downTotal, previousSampleAt);
        JSONObject overview = new JSONObject();
        overview.put("identity", identity);
        overview.put("version", resource.optString("version", "-"));
        overview.put("boardName", resource.optString("board-name", "-"));
        overview.put("architecture", resource.optString("architecture-name", "-"));
        overview.put("uptime", resource.optString("uptime", "-"));
        overview.put("systemTime", observedAt);
        overview.put("cpuLoad", cpu);
        overview.put("memoryUsage", memoryUsage);
        overview.put("diskUsage", diskUsage);
        overview.put("uplinkBps", upTotal);
        overview.put("downlinkBps", downTotal);
        overview.put("onlineTerminals", terminals.length());
        overview.put("connectionTotal", 0);
        JSONObject history = new JSONObject();
        history.put("timestamps", new JSONArray(historyTimes));
        history.put("cpu", new JSONArray(historyCpu));
        history.put("memory", new JSONArray(historyMemory));
        history.put("disk", new JSONArray(historyDisk));
        history.put("uplink", new JSONArray(historyUp));
        history.put("downlink", new JSONArray(historyDown));
        history.put("trafficSamples", new JSONArray(trafficSamples));
        history.put("resourceSamples", new JSONArray(resourceSamples));
        overview.put("history", history);

        JSONObject meta = new JSONObject();
        meta.put("target", host);
        meta.put("routerHost", host);
        meta.put("pollSeconds", 10);
        meta.put("profile", "routeros_only");
        meta.put("pppoeCount", pppoe.length());
        meta.put("wanCount", wan.length());
        meta.put("lineCount", wan.length());
        meta.put("realtimeUpdatedAt", observedAt);
        meta.put("staticUpdatedAt", observedAt);
        JSONObject capabilities = new JSONObject();
        capabilities.put("restTrusted", true);
        capabilities.put("sshRead", lastTest != null && lastTest.optJSONObject("ssh") != null && lastTest.optJSONObject("ssh").optBoolean("ok"));
        capabilities.put("routerosWrite", false);
        capabilities.put("localAliasWrite", false);
        meta.put("capabilities", capabilities);

        JSONObject snapshot = new JSONObject();
        snapshot.put("status", "ok");
        snapshot.put("updatedAt", observedAt);
        snapshot.put("error", JSONObject.NULL);
        snapshot.put("meta", meta);
        snapshot.put("overview", overview);
        snapshot.put("interfaces", interfaces);
        snapshot.put("pppoe", pppoe);
        snapshot.put("wan", wan);
        snapshot.put("terminals", terminals);
        snapshot.put("arp", new JSONObject().put("items", arpItems).put("alerts", new JSONArray()));
        snapshot.put("dhcp", new JSONObject().put("leases", leases).put("pools", new JSONArray()).put("servers", new JSONArray()).put("clients", new JSONArray()));
        snapshot.put("routes", new JSONObject().put("items", routeItems).put("defaultRoutes", defaultRoutes).put("staticRoutes", new JSONArray()));
        snapshot.put("connections", new JSONObject().put("total", 0).put("tcp", 0).put("udp", 0).put("icmp", 0).put("active", new JSONArray()).put("topIps", new JSONArray()).put("protocolTop", new JSONArray()));
        snapshot.put("dns", new JSONObject().put("forwardRules", new JSONArray()).put("ipv6Nd", new JSONArray()).put("ipv6DhcpClients", new JSONArray()));
        snapshot.put("loadBalance", new JSONObject().put("distribution", new JSONArray()).put("defaultRoutes", defaultRoutes).put("mangleRules", new JSONArray()).put("routingRules", new JSONArray()));
        snapshot.put("security", new JSONObject().put("filters", new JSONArray()).put("alerts", new JSONArray()).put("addressLists", new JSONArray()));
        snapshot.put("logs", new JSONObject().put("all", new JSONArray()).put("system", new JSONArray()).put("firewall", new JSONArray()).put("dhcp", new JSONArray()).put("dns", new JSONArray()));
        return snapshot;
    }

    private void appendHistory(String observedAt, int cpu, double memory, double disk, long up, long down, long previousSampleAt) throws Exception {
        historyTimes.add(observedAt);
        historyCpu.add(cpu);
        historyMemory.add(memory);
        historyDisk.add(disk);
        historyUp.add(up);
        historyDown.add(down);
        JSONObject traffic = new JSONObject();
        traffic.put("timestamp", observedAt);
        traffic.put("source", "rest-interface-counters");
        traffic.put("evidenceMode", previousSampleAt == 0L ? "unavailable" : "current");
        traffic.put("uplink", previousSampleAt == 0L ? JSONObject.NULL : up);
        traffic.put("downlink", previousSampleAt == 0L ? JSONObject.NULL : down);
        trafficSamples.add(traffic);
        JSONObject resource = new JSONObject();
        resource.put("timestamp", observedAt);
        resource.put("source", "rest-system-resource");
        resource.put("evidenceMode", "current");
        resource.put("cpu", cpu);
        resource.put("memory", memory);
        resource.put("disk", disk);
        resourceSamples.add(resource);
        trim(historyTimes);
        trim(historyCpu);
        trim(historyMemory);
        trim(historyDisk);
        trim(historyUp);
        trim(historyDown);
        trim(trafficSamples);
        trim(resourceSamples);
    }

    private void trim(List<?> list) {
        while (list.size() > 90) list.remove(0);
    }

    private int[] ratesFor(String name, long rx, long tx, long now, long previousSampleAt) {
        long[] previous = lastCounters.get(name);
        int down = 0;
        int up = 0;
        if (previous != null && previousSampleAt > 0 && now > previousSampleAt) {
            double seconds = (now - previousSampleAt) / 1000.0;
            if (seconds >= 0.5) {
                down = (int) Math.max(0, Math.round((rx - previous[0]) / seconds));
                up = (int) Math.max(0, Math.round((tx - previous[1]) / seconds));
            }
        }
        lastCounters.put(name, new long[] { rx, tx });
        return new int[] { down, up };
    }

    private JSONObject emptySnapshot(String status, String error) throws Exception {
        String now = rfc3339(System.currentTimeMillis());
        JSONObject snapshot = new JSONObject();
        snapshot.put("status", status);
        snapshot.put("updatedAt", now);
        snapshot.put("error", error);
        snapshot.put("meta", new JSONObject().put("pollSeconds", 10).put("target", host).put("routerHost", host));
        snapshot.put("overview", new JSONObject());
        snapshot.put("interfaces", new JSONArray());
        snapshot.put("pppoe", new JSONArray());
        snapshot.put("wan", new JSONArray());
        snapshot.put("terminals", new JSONArray());
        snapshot.put("arp", new JSONObject().put("items", new JSONArray()).put("alerts", new JSONArray()));
        snapshot.put("dhcp", new JSONObject().put("leases", new JSONArray()).put("pools", new JSONArray()).put("servers", new JSONArray()).put("clients", new JSONArray()));
        snapshot.put("routes", new JSONObject().put("items", new JSONArray()).put("defaultRoutes", new JSONArray()).put("staticRoutes", new JSONArray()));
        snapshot.put("connections", new JSONObject().put("total", 0).put("active", new JSONArray()).put("topIps", new JSONArray()).put("protocolTop", new JSONArray()));
        snapshot.put("dns", new JSONObject());
        snapshot.put("loadBalance", new JSONObject());
        snapshot.put("security", new JSONObject());
        snapshot.put("logs", new JSONObject().put("all", new JSONArray()).put("system", new JSONArray()).put("firewall", new JSONArray()).put("dhcp", new JSONArray()).put("dns", new JSONArray()));
        return snapshot;
    }

    private JSONObject testRest(String scheme, String host, int port, String user, String password, boolean verifyTls) {
        long started = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        try {
            JSONObject resource = object(request(scheme, host, port, user, password, verifyTls, "/rest/system/resource"));
            JSONObject identityRow = object(request(scheme, host, port, user, password, verifyTls, "/rest/system/identity"));
            result.put("ok", true);
            result.put("error", "");
            result.put("elapsedMs", System.currentTimeMillis() - started);
            result.put("identity", identityRow.optString("name", resource.optString("board-name", "RouterOS")));
            result.put("status", 200);
            result.put("scheme", scheme);
            result.put("port", port);
            result.put("verifyTls", verifyTls);
        } catch (Exception exception) {
            try {
                result.put("ok", false);
                result.put("error", describeRestFailure(exception, scheme, port));
                result.put("elapsedMs", System.currentTimeMillis() - started);
                result.put("scheme", scheme);
                result.put("port", port);
                result.put("verifyTls", verifyTls);
            } catch (Exception ignored) {}
        }
        return result;
    }

    private static String describeRestFailure(Exception exception, String scheme, int port) {
        if (exception instanceof ConnectException) {
            return scheme + " 端口 " + port + " 连接被拒绝：该服务未在 RouterOS 上开启，或地址/端口填错";
        }
        if (exception instanceof SocketTimeoutException) {
            return scheme + " 端口 " + port + " 连接超时：地址不可达，或被 RouterOS /ip service 白名单拦截";
        }
        if (exception instanceof UnknownHostException) {
            return "无法解析主机名，请填写 RouterOS 的 IP 地址";
        }
        if (exception instanceof SSLHandshakeException) {
            return "HTTPS 证书校验失败：RouterOS 自签证书需要关闭「校验 TLS 证书」并确认风险后重试";
        }
        String message = exception.getMessage();
        return message == null || message.length() == 0 ? "REST 连接失败" : message;
    }

    private JSONObject testSsh(String host, int port) {
        long started = System.currentTimeMillis();
        JSONObject result = new JSONObject();
        Socket socket = null;
        try {
            socket = new Socket();
            socket.connect(new InetSocketAddress(host, port), 4000);
            socket.setSoTimeout(2500);
            byte[] buffer = new byte[64];
            int read = socket.getInputStream().read(buffer);
            String banner = read > 0 ? new String(buffer, 0, read, StandardCharsets.ISO_8859_1) : "";
            boolean ok = banner.startsWith("SSH-");
            result.put("ok", ok);
            result.put("error", ok ? "" : "SSH 端口有响应，但不是 SSH banner");
            result.put("elapsedMs", System.currentTimeMillis() - started);
            result.put("port", port);
            result.put("identity", banner.trim());
        } catch (Exception exception) {
            try {
                result.put("ok", false);
                String reason;
                if (exception instanceof ConnectException) {
                    reason = "SSH 端口 " + port + " 连接被拒绝：ssh 服务未开启或端口填错";
                } else if (exception instanceof SocketTimeoutException) {
                    reason = "SSH 端口 " + port + " 连接超时：地址不可达或被白名单拦截";
                } else {
                    reason = "Android 客户端只探测 SSH 端口，未做完整登录：" + exception.getMessage();
                }
                result.put("error", reason);
                result.put("elapsedMs", System.currentTimeMillis() - started);
                result.put("port", port);
            } catch (Exception ignored) {}
        } finally {
            try { if (socket != null) socket.close(); } catch (Exception ignored) {}
        }
        return result;
    }

    private String request(String path) throws Exception {
        return request(restScheme, host, restPort, user, password, restVerifyTls, path);
    }

    private String request(String scheme, String host, int port, String user, String password, boolean verifyTls, String path) throws Exception {
        URL url = new URL(scheme + "://" + host + ":" + port + path);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        if (connection instanceof HttpsURLConnection && !verifyTls) {
            HttpsURLConnection secure = (HttpsURLConnection) connection;
            SSLSocketFactory factory = trustAllSocketFactory();
            if (factory != null) secure.setSSLSocketFactory(factory);
            secure.setHostnameVerifier(TRUST_ALL_HOSTNAMES);
        }
        connection.setRequestMethod("GET");
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(8000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept", "application/json");
        String token = Base64.encodeToString((user + ":" + password).getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
        connection.setRequestProperty("Authorization", "Basic " + token);
        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String body = read(stream);
        connection.disconnect();
        if (status == 401) throw new Exception("RouterOS 拒绝登录（401），检查用户名和密码");
        if (status == 403) throw new Exception("RouterOS 拒绝访问（403），检查用户权限或 allowed-address");
        if (status < 200 || status >= 300) throw new Exception("RouterOS 返回 HTTP " + status);
        return body;
    }

    private static final HostnameVerifier TRUST_ALL_HOSTNAMES = new HostnameVerifier() {
        @Override public boolean verify(String hostname, javax.net.ssl.SSLSession session) { return true; }
    };

    private static SSLSocketFactory trustAllSocketFactory() {
        try {
            X509TrustManager manager = new X509TrustManager() {
                @Override public void checkClientTrusted(X509Certificate[] chain, String authType) {}
                @Override public void checkServerTrusted(X509Certificate[] chain, String authType) {}
                @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            };
            SSLContext context = SSLContext.getInstance("TLS");
            context.init(null, new TrustManager[] { manager }, new SecureRandom());
            return context.getSocketFactory();
        } catch (Exception exception) {
            return null;
        }
    }

    private static String read(InputStream input) throws Exception {
        if (input == null) return "";
        StringBuilder builder = new StringBuilder();
        BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8));
        String line;
        while ((line = reader.readLine()) != null) builder.append(line);
        reader.close();
        return builder.toString();
    }

    private static JSONObject object(String raw) throws Exception {
        String text = raw == null ? "" : raw.trim();
        if (text.startsWith("[")) {
            JSONArray array = new JSONArray(text);
            return array.length() > 0 ? array.optJSONObject(0) : new JSONObject();
        }
        if (text.startsWith("{")) return new JSONObject(text);
        return new JSONObject();
    }

    private static JSONArray array(String raw) throws Exception {
        String text = raw == null ? "" : raw.trim();
        if (text.startsWith("[")) return new JSONArray(text);
        if (text.startsWith("{")) {
            JSONObject object = new JSONObject(text);
            if (object.has("data") && object.opt("data") instanceof JSONArray) return object.getJSONArray("data");
            JSONArray array = new JSONArray();
            array.put(object);
            return array;
        }
        return new JSONArray();
    }

    private static boolean bool(JSONObject object, String key) {
        Object value = object.opt(key);
        return value instanceof Boolean ? ((Boolean) value).booleanValue() : "true".equalsIgnoreCase(String.valueOf(value));
    }

    private static String prefixToNetmask(String prefixText) {
        try {
            int prefix = Integer.parseInt(prefixText.trim());
            if (prefix < 0 || prefix > 32) return "";
            long mask = prefix == 0 ? 0L : (0xffffffffL << (32 - prefix)) & 0xffffffffL;
            return String.format(Locale.US, "%d.%d.%d.%d",
                    (mask >> 24) & 0xff, (mask >> 16) & 0xff, (mask >> 8) & 0xff, mask & 0xff);
        } catch (Exception ignored) {
            return "";
        }
    }

    private static int parseDistance(String value) {
        try { return Integer.parseInt(value.replaceAll("[^0-9]", "").trim()); } catch (Exception ignored) { return Integer.MAX_VALUE; }
    }

    private static int parseInt(String value) {
        try { return Integer.parseInt(value.replaceAll("[^0-9-]", "")); } catch (Exception ignored) { return 0; }
    }

    private static long parseLong(String value) {
        try { return Long.parseLong(value.replaceAll("[^0-9-]", "")); } catch (Exception ignored) { return 0L; }
    }

    private static double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    static String rfc3339(long millis) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS", Locale.US);
        format.setTimeZone(TimeZone.getDefault());
        int offset = TimeZone.getDefault().getOffset(millis);
        String sign = offset >= 0 ? "+" : "-";
        int hours = Math.abs(offset) / 3600000;
        int minutes = (Math.abs(offset) / 60000) % 60;
        return format.format(new Date(millis)) + sign + String.format(Locale.US, "%02d:%02d", hours, minutes);
    }
}
