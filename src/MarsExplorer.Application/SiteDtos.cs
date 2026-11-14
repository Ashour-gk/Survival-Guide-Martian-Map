using MarsExplorer.Domain;

namespace MarsExplorer.Application;

public sealed record LayerDto(Guid Id, string Key, string Title, string Kind, string SourceName,
    string? SourceUrl, string? TileUrlTemplate, string? MarsTrekLayerId, string? Format,
    int MinZoom, int MaxZoom, string BoundsJson, string? ResolutionM,
    string Provenance, string VerificationStatus, DateTimeOffset? LastVerifiedAt,
    bool Enabled, string Citation);

public sealed record SiteDto(Guid Id, string Slug, string Name, double CenterLat, double CenterLon,
    string BoundsJson, double TileExtentM);

public sealed record HazardDto(Guid Id, string Name, string Kind, int Severity,
    System.Text.Json.JsonElement Geometry, string Source, string Provenance);

public static class SiteMapping
{
    public static SiteDto ToDto(this Site site) => new(site.Id, site.Slug, site.Name,
        site.CenterLat, site.CenterLon, site.BoundsJson, site.TileExtentM);

    public static LayerDto ToDto(this Layer layer) => new(layer.Id, layer.Key, layer.Title,
        layer.Kind, layer.SourceName, layer.SourceUrl, layer.TileUrlTemplate,
        layer.MarsTrekLayerId, layer.Format, layer.MinZoom, layer.MaxZoom,
        layer.BoundsJson, layer.ResolutionM, layer.Provenance,
        layer.VerificationStatus, layer.LastVerifiedAt, layer.Enabled, layer.Citation);
}

