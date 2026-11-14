using System.Security.Claims;
using System.Text.Json;
using MarsExplorer.Domain;
using MarsExplorer.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MarsExplorer.Api.Controllers;

public sealed record RouteStopDto(double X, double Y);
public sealed record SaveRouteRequest(List<RouteStopDto> Stops);

[ApiController]
[Authorize(Roles = "Administrator,Astronaut")]
[Route("api/v1/routes/me")]
public sealed class RoutesController(MarsExplorerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var row = await db.MissionRoutes.AsNoTracking().FirstOrDefaultAsync(x => x.OwnerId == userId, ct);
        var stops = row is null ? Array.Empty<RouteStopDto>() : JsonSerializer.Deserialize<RouteStopDto[]>(row.StopsJson) ?? [];
        return Ok(new { stops, updatedAt = row?.UpdatedAt });
    }

    [HttpPut]
    public async Task<IActionResult> Save([FromBody] SaveRouteRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        if (request.Stops.Count > 100 || request.Stops.Any(x => !double.IsFinite(x.X) || !double.IsFinite(x.Y) || x.X is < 0 or > 1000 || x.Y is < 0 or > 750))
            return BadRequest(new ProblemDetails { Title = "Invalid route", Detail = "A route can contain up to 100 stops inside the supported Gale tile.", Status = 400 });

        var row = await db.MissionRoutes.FirstOrDefaultAsync(x => x.OwnerId == userId, ct);
        var stopsJson = JsonSerializer.Serialize(request.Stops);
        if (row is null)
        {
            row = new MissionRoute { Id = Guid.NewGuid(), OwnerId = userId, StopsJson = stopsJson, UpdatedAt = DateTimeOffset.UtcNow };
            db.MissionRoutes.Add(row);
        }
        else
        {
            row.StopsJson = stopsJson;
            row.UpdatedAt = DateTimeOffset.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        return Ok(new { stops = request.Stops, updatedAt = row.UpdatedAt });
    }

    private bool TryGetUserId(out Guid id) => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out id);
}
