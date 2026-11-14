using MarsExplorer.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MarsExplorer.Api.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController(MarsExplorerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        try
        {
            var canConnect = await db.Database.CanConnectAsync(ct);
            return Ok(new { status = canConnect ? "ok" : "degraded", database = canConnect ? "connected" : "unavailable" });
        }
        catch
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new ProblemDetails { Title = "Database unavailable", Status = 503, Detail = "The API could not connect to SQL Server." });
        }
    }
}
