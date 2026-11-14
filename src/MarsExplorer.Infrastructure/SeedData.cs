using System.Text.Json;
using MarsExplorer.Domain;
using Microsoft.EntityFrameworkCore;

namespace MarsExplorer.Infrastructure;

public static class SeedData
{
    private static readonly Guid GaleId = Guid.Parse("8a56a967-33e3-49de-bc41-0a9e00000001");
    private static readonly Guid JezeroId = Guid.Parse("8a56a967-33e3-49de-bc41-0a9e00000002");

    public static async Task InitializeAsync(MarsExplorerDbContext db, CancellationToken ct)
    {
        if (db.Database.IsSqlite()) await db.Database.EnsureCreatedAsync(ct);
        else await db.Database.MigrateAsync(ct);
        await SeedSitesAsync(db, ct);
    }

    public static async Task SeedSitesAsync(MarsExplorerDbContext db, CancellationToken ct)
    {
        if (!await db.Sites.AnyAsync(x => x.Slug == "gale-crater", ct)) db.Sites.Add(new Site
        {
            Id = GaleId,
            Slug = "gale-crater",
            Name = "Gale Crater · Curiosity exploration region",
            CenterLat = -4.7,
            CenterLon = 137.38,
            BoundsJson = JsonSerializer.Serialize(new { north = -4.67, south = -4.73, east = 137.41, west = 137.35 }),
            TileExtentM = 1500
        });
        if (!await db.Sites.AnyAsync(x => x.Slug == "jezero-crater", ct)) db.Sites.Add(new Site
        {
            Id = JezeroId,
            Slug = "jezero-crater",
            Name = "Jezero Crater · Perseverance exploration region",
            CenterLat = 18.4661,
            CenterLon = 77.4298,
            BoundsJson = JsonSerializer.Serialize(new { north = 18.5161, south = 18.4161, east = 77.4798, west = 77.3798 }),
            TileExtentM = 6000
        });
        await db.SaveChangesAsync(ct);
    }
}
