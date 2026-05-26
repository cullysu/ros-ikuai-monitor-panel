param(
    [string]$ListenHost = "127.0.0.1",
    [int]$ListenPort = 28646,
    [string]$TargetHost = "172.18.0.2",
    [int]$TargetPort = 28646
)

$ErrorActionPreference = "Stop"

$source = @"
using System;
using System.Net;
using System.Net.Sockets;
using System.Threading;

public static class RouterOsPanelLocalForwarder
{
    public static void Run(string listenHost, int listenPort, string targetHost, int targetPort)
    {
        var listener = new TcpListener(IPAddress.Parse(listenHost), listenPort);
        listener.Start();
        Console.WriteLine("RouterOS panel localhost forwarder: http://" + listenHost + ":" + listenPort + "/ -> " + targetHost + ":" + targetPort);
        Console.WriteLine("Press Ctrl+C to stop.");
        while (true)
        {
            var client = listener.AcceptTcpClient();
            ThreadPool.QueueUserWorkItem(_ => Handle(client, targetHost, targetPort));
        }
    }

    private static void Handle(TcpClient client, string targetHost, int targetPort)
    {
        TcpClient upstream = null;
        try
        {
            upstream = new TcpClient();
            upstream.Connect(targetHost, targetPort);
            var clientStream = client.GetStream();
            var upstreamStream = upstream.GetStream();
            var left = new Thread(() => Pump(clientStream, upstreamStream));
            var right = new Thread(() => Pump(upstreamStream, clientStream));
            left.IsBackground = true;
            right.IsBackground = true;
            left.Start();
            right.Start();
            left.Join();
        }
        catch
        {
        }
        finally
        {
            try { client.Close(); } catch {}
            try { if (upstream != null) upstream.Close(); } catch {}
        }
    }

    private static void Pump(NetworkStream input, NetworkStream output)
    {
        var buffer = new byte[65536];
        try
        {
            int read;
            while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
            {
                output.Write(buffer, 0, read);
                output.Flush();
            }
        }
        catch
        {
        }
    }
}
"@

Add-Type -TypeDefinition $source
[RouterOsPanelLocalForwarder]::Run($ListenHost, $ListenPort, $TargetHost, $TargetPort)
