using MarsExplorer.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MarsExplorer.Api.Controllers;

[ApiController]
[Route("api/v1/point")]
public sealed class PointController(MarsExplorerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid siteId, [FromQuery] double lat, [FromQuery] double lon, CancellationToken ct = default)
    {
        if (!double.IsFinite(lat) || !double.IsFinite(lon) || lat is < -90 or > 90 || lon is < -180 or > 360)
            return BadRequest(new ProblemDetails { Title = "Invalid coordinates", Detail = "Latitude and longitude are outside the supported range.", Status = 400 });
        var site = await db.Sites.AsNoTracking().FirstOrDefaultAsync(x => x.Id == siteId, ct);
        if (site is null) return NotFound(new ProblemDetails { Title = "Site not found", Status = 404 });
        return Ok(new
        {
            siteId,
            latitude = lat,
            longitude = lon,
            dataStatus = "Unavailable",
            message = "No verified elevation, slope, thermal, radiation, mineral, or hazard dataset is connected for this location.",
            elevation = new { value = (double?)null, unit = "m", provenance = "Unavailable" },
            slope = new { value = (double?)null, unit = "deg", provenance = "Unavailable" },
            groundTempModelled = new { value = (double?)null, unit = "°C", provenance = "Unavailable" },
            doseModelled = new { value = (double?)null, unit = "µSv/h", provenance = "Unavailable" },
            unit = (object?)null,
            hazardZone = (object?)null
        });
    }
}
