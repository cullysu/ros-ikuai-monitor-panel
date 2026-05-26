param(
    [string]$ListenHost = "127.0.0.1",
    [int]$ListenPort = 28646,
    [string]$TargetHost = "172.18.0.2",
    [int]$TargetPort = 28646,
    [Parameter(Mandatory = $true)]
    [string]$ForwardToken
)

$ErrorActionPreference = "Stop"

$source = @"
using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

public static class RouterOsPanelLocalForwarder
{
    private static readonly string[] HopByHopHeaders = new[] {
        "Connection", "Keep-Alive", "Proxy-Authenticate", "Proxy-Authorization",
        "TE", "Trailer", "Transfer-Encoding", "Upgrade"
    };

    public static void Run(string listenHost, int listenPort, string targetHost, int targetPort, string forwardToken)
    {
        if (String.IsNullOrWhiteSpace(forwardToken))
        {
            throw new ArgumentException("ForwardToken must match ROS_PANEL_LOCALHOST_FORWARD_TOKEN in the RouterOS container envlist.");
        }

        var listener = new HttpListener();
        listener.Prefixes.Add("http://" + listenHost + ":" + listenPort + "/");
        listener.Start();
        Console.WriteLine("RouterOS panel localhost forwarder: http://" + listenHost + ":" + listenPort + "/ -> " + targetHost + ":" + targetPort);
        Console.WriteLine("Press Ctrl+C to stop.");

        var client = new HttpClient(new HttpClientHandler {
            AllowAutoRedirect = false,
            UseCookies = false
        });

        while (true)
        {
            var context = listener.GetContext();
            ThreadPool.QueueUserWorkItem(_ => Handle(context, client, listenHost, listenPort, targetHost, targetPort, forwardToken).GetAwaiter().GetResult());
        }
    }

    private static async Task Handle(HttpListenerContext context, HttpClient client, string listenHost, int listenPort, string targetHost, int targetPort, string forwardToken)
    {
        try
        {
            var request = context.Request;
            var target = new Uri("http://" + targetHost + ":" + targetPort + request.RawUrl);
            var message = new HttpRequestMessage(new HttpMethod(request.HttpMethod), target);

            foreach (string key in request.Headers.AllKeys)
            {
                if (key == null || HopByHopHeaders.Contains(key, StringComparer.OrdinalIgnoreCase) || key.Equals("Host", StringComparison.OrdinalIgnoreCase) || key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }
                message.Headers.TryAddWithoutValidation(key, request.Headers.GetValues(key));
            }

            message.Headers.Host = listenHost + ":" + listenPort;
            message.Headers.TryAddWithoutValidation("X-Ros-Panel-Localhost-Forward", forwardToken);

            if (request.HasEntityBody)
            {
                var memory = new MemoryStream();
                request.InputStream.CopyTo(memory);
                memory.Position = 0;
                message.Content = new ByteArrayContent(memory.ToArray());
                if (!String.IsNullOrWhiteSpace(request.ContentType))
                {
                    message.Content.Headers.TryAddWithoutValidation("Content-Type", request.ContentType);
                }
            }

            using (var response = await client.SendAsync(message))
            {
                var payload = await response.Content.ReadAsByteArrayAsync();
                context.Response.StatusCode = (int)response.StatusCode;
                context.Response.StatusDescription = response.ReasonPhrase;

                foreach (var header in response.Headers)
                {
                    if (!HopByHopHeaders.Contains(header.Key, StringComparer.OrdinalIgnoreCase))
                    {
                        context.Response.Headers[header.Key] = String.Join(",", header.Value);
                    }
                }
                foreach (var header in response.Content.Headers)
                {
                    if (!HopByHopHeaders.Contains(header.Key, StringComparer.OrdinalIgnoreCase) && !header.Key.Equals("Content-Length", StringComparison.OrdinalIgnoreCase))
                    {
                        context.Response.Headers[header.Key] = String.Join(",", header.Value);
                    }
                }

                context.Response.ContentLength64 = payload.LongLength;
                context.Response.Close(payload, false);
            }
        }
        catch (Exception ex)
        {
            var payload = System.Text.Encoding.UTF8.GetBytes("Forwarder error: " + ex.Message);
            context.Response.StatusCode = 502;
            context.Response.ContentType = "text/plain; charset=utf-8";
            context.Response.ContentLength64 = payload.LongLength;
            context.Response.Close(payload, false);
        }
    }
}
"@

Add-Type -TypeDefinition $source -ReferencedAssemblies "System.Net.Http.dll"
[RouterOsPanelLocalForwarder]::Run($ListenHost, $ListenPort, $TargetHost, $TargetPort, $ForwardToken)
