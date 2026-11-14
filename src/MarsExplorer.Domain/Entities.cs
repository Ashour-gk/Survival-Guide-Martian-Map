namespace MarsExplorer.Domain;

public sealed class Site
{
    public Guid Id { get; set; }
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public double CenterLat { get; set; }
    public double CenterLon { get; set; }
    public required string BoundsJson { get; set; }
    public double TileExtentM { get; set; }
    public ICollection<Layer> Layers { get; set; } = [];
    public ICollection<HazardZone> Hazards { get; set; } = [];
}

public sealed class Layer
{
    public Guid Id { get; set; }
    public Guid? SiteId { get; set; }
    public Site? Site { get; set; }
    public required string Key { get; set; }
    public required string Title { get; set; }
    public required string Kind { get; set; }
    public required string SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? TileUrlTemplate { get; set; }
    public string? MarsTrekLayerId { get; set; }
    public string? Format { get; set; }
    public int MinZoom { get; set; }
    public int MaxZoom { get; set; }
    public required string BoundsJson { get; set; }
    public string? ResolutionM { get; set; }
    public required string Provenance { get; set; }
    public required string VerificationStatus { get; set; }
    public DateTimeOffset? LastVerifiedAt { get; set; }
    public bool Enabled { get; set; }
    public required string Citation { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class HazardZone
{
    public Guid Id { get; set; }
    public Guid SiteId { get; set; }
    public Site? Site { get; set; }
    public required string Name { get; set; }
    public required string Kind { get; set; }
    public int Severity { get; set; }
    public required string GeoJson { get; set; }
    public required string Source { get; set; }
    public required string Provenance { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class ApplicationUser
{
    public Guid Id { get; set; }
    public required string CrewId { get; set; }
    public required string DisplayName { get; set; }
    public required string Email { get; set; }
    public required string Role { get; set; }
    public required string Status { get; set; }
    public required string PasswordHash { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }
    public DateTimeOffset? LastActiveAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class Observation
{
    public Guid Id { get; set; }
    public required string Code { get; set; }
    public Guid AuthorId { get; set; }
    public ApplicationUser? Author { get; set; }
    public required string Title { get; set; }
    public required string Category { get; set; }
    public required string Description { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public required string LocationName { get; set; }
    public required string GeologicalCharacteristics { get; set; }
    public required string MineralIdentification { get; set; }
    public required string WaterIndicators { get; set; }
    public required string Environment { get; set; }
    public double? TemperatureC { get; set; }
    public double? DoseUSvH { get; set; }
    public required string Terrain { get; set; }
    public required string HazardClass { get; set; }
    public int Sol { get; set; }
    public required string Lmst { get; set; }
    public required string Notes { get; set; }
    public required string Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public ICollection<ObservationFile> Files { get; set; } = [];
    public ICollection<ObservationAnnotation> Annotations { get; set; } = [];
}

public sealed class ObservationFile
{
    public Guid Id { get; set; }
    public Guid ObservationId { get; set; }
    public Observation? Observation { get; set; }
    public required string StoredName { get; set; }
    public required string OriginalName { get; set; }
    public required string Mime { get; set; }
    public long SizeBytes { get; set; }
    public required string Sha256 { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class ObservationAnnotation
{
    public Guid Id { get; set; }
    public Guid ObservationId { get; set; }
    public Observation? Observation { get; set; }
    public Guid AuthorId { get; set; }
    public ApplicationUser? Author { get; set; }
    public required string Text { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class MissionRoute
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public ApplicationUser? Owner { get; set; }
    public required string StopsJson { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public byte[] RowVersion { get; set; } = [];
}

