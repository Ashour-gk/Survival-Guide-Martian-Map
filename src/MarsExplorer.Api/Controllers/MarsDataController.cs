using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace MarsExplorer.Api.Controllers;

[ApiController]
[Route("api/v1/data")]
public sealed class MarsDataController(IHttpClientFactory clients, IMemoryCache cache) : ControllerBase
{
    private const double PerseveranceLat = 18.44463;
    private const double PerseveranceLon = 77.45088;
    private const string MedaArchive = "https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html";

    private static readonly IReadOnlyDictionary<string, string> ProductQueries = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["curiosity"] = "curiosity",
        ["perseverance"] = "perseverance",
        ["hirise"] = "hirise",
        ["mars"] = "mars"
    };

    [HttpGet("meda-map-layers")]
    public IActionResult MedaMapLayers()
    {
        Response.Headers["X-Data-Source"] = "NASA PDS Atmospheres Node - Mars 2020 MEDA archive";
        return Ok(new
        {
            type = "FeatureCollection",
            source = MedaArchive,
            spatialNote = "The point marks Perseverance's published landing-site reference. MEDA instruments travel with the rover; these archives are not a global raster or a live rover-position feed.",
            features = new[]
            {
                new
                {
                    type = "Feature", id = "meda-weather-archive",
                    geometry = new { type = "Point", coordinates = new[] { PerseveranceLon, PerseveranceLat } },
                    properties = new
                    {
                        category = "weather", name = "Perseverance MEDA · weather archive",
                        sensors = new[] { "Air temperature (ATS)", "Pressure (PS)", "Wind (WIND)", "Humidity (RHS)", "Thermal infrared (TIRS)" },
                        sourceName = "NASA Planetary Data System · Atmospheres Node",
                        sourceUrl = MedaArchive,
                        dataLinks = new[]
                        {
                            new { label = "Air temperature (ATS)", url = "https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated_ATS.htm" },
                            new { label = "Pressure (PS)", url = "https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated-PS.htm" },
                            new { label = "Wind (WIND)", url = "https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated-WIND.htm" },
                            new { label = "Humidity (RHS)", url = "https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated-RHS.htm" },
                            new { label = "Thermal infrared (TIRS)", url = "https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated-TIRS.htm" }
                        },
                        provenance = "Archived rover measurements; values and coverage depend on selected sol."
                    }
                },
                new
                {
                    type = "Feature", id = "meda-radiation-archive",
                    geometry = new { type = "Point", coordinates = new[] { PerseveranceLon, PerseveranceLat } },
                    properties = new
                    {
                        category = "radiation", name = "Perseverance MEDA · radiation and dust archive",
                        sensors = new[] { "Radiation and Dust Sensor (RDS): UV photodiodes and SkyCam" },
                        sourceName = "NASA Planetary Data System · Atmospheres Node",
                        sourceUrl = MedaArchive,
                        dataLinks = new[]
                        {
                            new { label = "Radiation and Dust Sensor (RDS)", url = "https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/logs/mars2020_meda_calibrated_RDS.htm" }
                        },
                        provenance = "Archived rover-site UV and dust measurements; not ionizing-dose or map-wide radiation data."
                    }
                }
            }
        });
    }

    [HttpGet("pds/{mission}")]
    public async Task<IActionResult> Products(string mission, CancellationToken ct)
    {
        if (!ProductQueries.TryGetValue(mission, out var keyword))
            return BadRequest(new ProblemDetails { Title = "Unknown PDS search", Detail = "Use curiosity, perseverance, hirise, or mars.", Status = 400 });

        var cacheKey = $"pds-products:{keyword}";
        try
        {
            var json = await cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
                var url = $"https://pds.nasa.gov/api/search/1/products?keywords={Uri.EscapeDataString(keyword)}&limit=20";
                using var response = await clients.CreateClient("mars-data").GetAsync(url, ct);
                response.EnsureSuccessStatusCode();
                return await response.Content.ReadAsStringAsync(ct);
            });
            Response.Headers["X-Data-Source"] = "NASA Planetary Data System Search API";
            return Content(json!, "application/json");
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new ProblemDetails { Title = "NASA PDS is unavailable", Detail = "The live product search could not be reached. Please retry shortly.", Status = 502 });
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return StatusCode(504, new ProblemDetails { Title = "NASA PDS search timed out", Status = 504 });
        }
    }

    [HttpGet("geocode/mars")]
    public async Task<IActionResult> Geocode([FromQuery] string query, CancellationToken ct)
    {
        query = query?.Trim() ?? string.Empty;
        if (query.Length is < 2 or > 120)
            return BadRequest(new ProblemDetails { Title = "Invalid place query", Detail = "Enter between 2 and 120 characters.", Status = 400 });

        var cacheKey = $"mars-geocode:{query.ToLowerInvariant()}";
        try
        {
            var json = await cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6);
                var url = $"https://geocode.openspaceproject.com/1/search/mars?query={Uri.EscapeDataString(query)}";
                using var response = await clients.CreateClient("mars-data").GetAsync(url, ct);
                response.EnsureSuccessStatusCode();
                return await response.Content.ReadAsStringAsync(ct);
            });
            Response.Headers["X-Data-Source"] = "OpenSpace Mars Geocoder";
            return Content(json!, "application/json");
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new ProblemDetails { Title = "Mars place search is unavailable", Detail = "The live geocoder could not be reached. Please retry shortly.", Status = 502 });
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return StatusCode(504, new ProblemDetails { Title = "Mars place search timed out", Status = 504 });
        }
    }

    [HttpGet("nasa-images")]
    public async Task<IActionResult> NasaImages([FromQuery] string query = "Mars", [FromQuery] int page = 1, CancellationToken ct = default)
    {
        query = query?.Trim() ?? string.Empty;
        page = Math.Clamp(page, 1, 20);
        if (query.Length is < 2 or > 100)
            return BadRequest(new ProblemDetails { Title = "Invalid NASA image search", Detail = "Enter between 2 and 100 characters.", Status = 400 });

        var cacheKey = $"nasa-images:{query.ToLowerInvariant()}:{page}";
        try
        {
            var json = await cache.GetOrCreateAsync(cacheKey, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
                var url = $"https://images-api.nasa.gov/search?q={Uri.EscapeDataString(query)}&media_type=image&page={page}";
                using var response = await clients.CreateClient("mars-data").GetAsync(url, ct);
                response.EnsureSuccessStatusCode();
                return await response.Content.ReadAsStringAsync(ct);
            });
            Response.Headers["X-Data-Source"] = "NASA Image and Video Library API";
            return Content(json!, "application/json");
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new ProblemDetails { Title = "NASA Images is unavailable", Detail = "The live image search could not be reached. Please retry shortly.", Status = 502 });
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return StatusCode(504, new ProblemDetails { Title = "NASA Images search timed out", Status = 504 });
        }
    }
}
