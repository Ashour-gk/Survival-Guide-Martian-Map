using System.Text.Json;
using MarsExplorer.Application;
using MarsExplorer.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MarsExplorer.Api.Controllers;

[ApiController]
[Route("api/v1/sites")]
public sealed class SitesController(MarsExplorerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = db.Sites.AsNoTracking().OrderBy(x => x.Name);
        var total = await query.CountAsync(ct);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return Ok(new { items = items.Select(x => x.ToDto()), page, pageSize, total });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var site = await db.Sites.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return site is null ? NotFound(new ProblemDetails { Title = "Site not found", Status = 404 }) : Ok(site.ToDto());
    }

    [HttpGet("{id:guid}/layers")]
    public async Task<IActionResult> Layers(Guid id, CancellationToken ct)
    {
        if (!await db.Sites.AnyAsync(x => x.Id == id, ct)) return NotFound(new ProblemDetails { Title = "Site not found", Status = 404 });
        var layers = await db.Layers.AsNoTracking().Where(x => x.SiteId == id || x.SiteId == null).OrderBy(x => x.Title).ToListAsync(ct);
        return Ok(new { items = layers.Select(x => x.ToDto()), page = 1, pageSize = layers.Count, total = layers.Count });
    }

    [HttpGet("{id:guid}/hazards")]
    public async Task<IActionResult> Hazards(Guid id, CancellationToken ct)
    {
        if (!await db.Sites.AnyAsync(x => x.Id == id, ct)) return NotFound(new ProblemDetails { Title = "Site not found", Status = 404 });
        var zones = await db.HazardZones.AsNoTracking().Where(x => x.SiteId == id).ToListAsync(ct);
        var features = zones.Select(x => new
        {
            type = "Feature", id = x.Id,
            properties = new { name = x.Name, kind = x.Kind, severity = x.Severity, source = x.Source, provenance = x.Provenance },
            geometry = JsonDocument.Parse(x.GeoJson).RootElement
        });
        return Ok(new { type = "FeatureCollection", features });
    }

    [HttpGet("{id:guid}/pov")]
    public async Task<IActionResult> Pov(Guid id, CancellationToken ct)
    {
        if (!await db.Sites.AnyAsync(x => x.Id == id, ct)) return NotFound(new ProblemDetails { Title = "Site not found", Status = 404 });
        return Ok(new { items = Array.Empty<object>(), provenance = "Unavailable", message = "No POV image has been verified and seeded for this site." });
    }
}
