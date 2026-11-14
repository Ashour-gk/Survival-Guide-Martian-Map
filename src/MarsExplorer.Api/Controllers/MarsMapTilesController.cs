using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace MarsExplorer.Api.Controllers;

[ApiController]
[Route("api/v1/map/tiles")]
public sealed class MarsMapTilesController(IHttpClientFactory clients, IMemoryCache cache) : ControllerBase
{
    private sealed record Source(string Layer, string Mime, string Extension, int MaxZoom,
        double West, double South, double East, double North);

    private static readonly IReadOnlyDictionary<string, Source> Sources = new Dictionary<string, Source>(StringComparer.OrdinalIgnoreCase)
    {
        ["ctxJezero"] = new("JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0", "image/png", "png", 13, 77.1604655, 18.2110274, 77.6991776, 18.7211945),
        ["ctxJezeroPreliminary"] = new("Jezero_CTX_BlockAdj_dd", "image/png", "png", 12, 75.1537692, 15.9058484, 78.8717121, 19.4453003),
        ["hiriseJezero"] = new("JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd", "image/png", "png", 17, 77.2229331, 18.3067994, 77.583964, 18.669315),
        ["viking"] = new("Mars_Viking_MDIM21_ClrMosaic_global_232m", "image/jpeg", "jpg", 7, -180, -90, 180, 90),
        ["mola"] = new("Mars_MGS_MOLA_ClrShade_merge_global_463m", "image/jpeg", "jpg", 7, -180, -90, 180, 90),
        ["molaHrsc"] = new("Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw", "image/jpeg", "jpg", 8, -180, -89.999224, 179.9984479, 90),
        ["themisDay"] = new("THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018", "image/png", "png", 9, -179.9999997, -65.0006576, 179.9998849, 65.0007535),
        ["themisNight"] = new("THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018", "image/png", "png", 9, -179.9999997, -65.0006576, 179.9998849, 65.0007535),
        ["molaRoughness"] = new("mola_roughness", "image/png", "png", 1, -180, -90, 180, 90),
        ["tesDust"] = new("TES_Dust", "image/png", "png", 1, -180, -90, 180, 90),
        ["tesThermalInertia"] = new("TES_Thermal_Inertia", "image/png", "png", 1, -180, -90, 180, 90),
        ["tesPyroxene"] = new("TES_Clinopyroxene", "image/png", "png", 1, -180, -90, 180, 90),
        ["tesPlagioclase"] = new("TES_Plagioclase", "image/png", "png", 1, -180, -89.8749905, 179.874985, 90),
        ["tesGlassClay"] = new("TES_Glass_Clay", "image/png", "png", 1, -180, -90, 180, 90)
    };

    [HttpGet("{basemap}/{z:int}/{row:int}/{column:int}.{extension}")]
    [ResponseCache(Duration = 86400, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> Tile(string basemap, int z, int row, int column, string extension, CancellationToken ct)
    {
        if (!Sources.TryGetValue(basemap, out var source) || !string.Equals(extension, source.Extension, StringComparison.OrdinalIgnoreCase))
            return NotFound();
        if (z < 0 || z > source.MaxZoom || row < 0 || row >= (1 << z) || column < 0 || column >= (1 << (z + 1)))
            return BadRequest(new ProblemDetails { Title = "Invalid tile address", Status = 400 });

        var tileWest = -180 + column * (360d / (1 << (z + 1)));
        var tileEast = -180 + (column + 1) * (360d / (1 << (z + 1)));
        var tileNorth = 90 - row * (180d / (1 << z));
        var tileSouth = 90 - (row + 1) * (180d / (1 << z));
        if (tileEast <= source.West || tileWest >= source.East || tileNorth <= source.South || tileSouth >= source.North)
            return NotFound();

        var key = $"mars-tile:{basemap}:{z}:{row}:{column}";
        try
        {
            var tile = await cache.GetOrCreateAsync(key, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12);
                var url = $"https://trek.nasa.gov/tiles/Mars/EQ/{source.Layer}/1.0.0/default/default028mm/{z}/{row}/{column}.{source.Extension}";
                using var response = await clients.CreateClient("nasa-mars-tiles").GetAsync(url, ct);
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
                response.EnsureSuccessStatusCode();
                return await response.Content.ReadAsByteArrayAsync(ct);
            });
            if (tile is null) return NotFound();
            return File(tile, source.Mime);
        }
        catch (HttpRequestException)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                new ProblemDetails { Title = "Mars imagery unavailable", Detail = "NASA Trek could not serve this map tile.", Status = 502 });
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout,
                new ProblemDetails { Title = "Mars imagery timeout", Status = 504 });
        }
    }
}
