using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using MarsExplorer.Domain;
using MarsExplorer.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MarsExplorer.Api.Controllers;

public sealed record ObservationUploadRequest(
    string Title, string Category, double Lat, double Lon, string LocationName,
    string Description, string Geology, string Minerals, string WaterIndicators,
    string Environment, double? TempC, double? DoseUSvH, string Terrain,
    string HazardClass, int Sol, string Lmst, string Notes);

[ApiController]
[Authorize]
[Route("api/v1/observations")]
public sealed class ObservationsController(MarsExplorerDbContext db, IConfiguration config, IWebHostEnvironment environment) : ControllerBase
{
    private const long MaxPhotoBytes = 5 * 1024 * 1024;
    private const int MaxPhotos = 5;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var currentUserId)) return Unauthorized();
        var query = db.Observations.AsNoTracking().Where(x => x.AuthorId == currentUserId);
        var total = await query.CountAsync(ct);
        var rows = await query.Include(x => x.Author).Include(x => x.Files).Include(x => x.Annotations).ThenInclude(x => x.Author)
            .OrderByDescending(x => x.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return Ok(new { items = rows.Select(ToObservationDto), page, pageSize, total });
    }

    [HttpPost]
    [Authorize(Roles = "Administrator,Astronaut")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(27 * 1024 * 1024)]
    public async Task<IActionResult> Create([FromForm] string observationJson, [FromForm] List<IFormFile>? photos, CancellationToken ct)
    {
        photos ??= [];
        ObservationUploadRequest? request;
        try { request = JsonSerializer.Deserialize<ObservationUploadRequest>(observationJson, new JsonSerializerOptions(JsonSerializerDefaults.Web)); }
        catch (JsonException) { return BadRequest(new ProblemDetails { Title = "Invalid observation data", Status = 400 }); }
        if (request is null) return BadRequest(new ProblemDetails { Title = "Observation data is required", Status = 400 });
        var validation = Validate(request, photos);
        if (validation is not null) return BadRequest(new ProblemDetails { Title = "Observation could not be submitted", Detail = validation, Status = 400 });
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var authorId)) return Unauthorized();

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == authorId && x.Status == "Active", ct);
        if (user is null) return Forbid();

        var observation = new Observation
        {
            Id = Guid.NewGuid(), Code = $"OBS-{(await db.Observations.CountAsync(ct) + 1):D4}",
            AuthorId = authorId, Title = request.Title.Trim(), Category = request.Category,
            Description = request.Description.Trim(), Latitude = request.Lat, Longitude = request.Lon,
            LocationName = request.LocationName.Trim(), GeologicalCharacteristics = request.Geology,
            MineralIdentification = request.Minerals, WaterIndicators = request.WaterIndicators,
            Environment = request.Environment, TemperatureC = request.TempC, DoseUSvH = request.DoseUSvH,
            Terrain = request.Terrain, HazardClass = request.HazardClass, Sol = request.Sol,
            Lmst = request.Lmst, Notes = request.Notes, Status = "Submitted", CreatedAt = DateTimeOffset.UtcNow
        };

        var savedPaths = new List<string>();
        var uploadRoot = UploadRoot;
        Directory.CreateDirectory(uploadRoot);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            foreach (var photo in photos)
            {
                var data = await ReadAndVerifyPhoto(photo, ct);
                if (data is null) throw new InvalidDataException($"{Path.GetFileName(photo.FileName)} is not a valid JPEG, PNG, or WebP image.");
                var file = MakeFile(observation.Id, photo.FileName, data.Value.Bytes, data.Value.Mime, data.Value.Extension);
                var path = SafeStoragePath(uploadRoot, file.StoredName);
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                await System.IO.File.WriteAllBytesAsync(path, data.Value.Bytes, ct);
                savedPaths.Add(path);
                observation.Files.Add(file);
            }
            db.Observations.Add(observation);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (InvalidDataException ex)
        {
            foreach (var path in savedPaths) System.IO.File.Delete(path);
            return BadRequest(new ProblemDetails { Title = "Unsupported photo", Detail = ex.Message, Status = 400 });
        }
        catch
        {
            foreach (var path in savedPaths) System.IO.File.Delete(path);
            throw;
        }

        return CreatedAtAction(nameof(Get), new { id = observation.Id }, new
        {
            id = observation.Id, code = observation.Code, status = observation.Status,
            files = observation.Files.Select(x => ToDto(observation.Id, x))
        });
    }

    [HttpPost("{id:guid}/files")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(27 * 1024 * 1024)]
    public async Task<IActionResult> AddFiles(Guid id, [FromForm] List<IFormFile>? photos, CancellationToken ct)
    {
        photos ??= [];
        var observation = await db.Observations.Include(x => x.Files).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (observation is null || !Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var authorId) || observation.AuthorId != authorId) return NotFound();
        if (observation.Files.Count + photos.Count > MaxPhotos) return BadRequest(new ProblemDetails { Title = "Too many photos", Detail = $"An observation can have up to {MaxPhotos} photos.", Status = 400 });
        var validation = ValidatePhotos(photos);
        if (validation is not null) return BadRequest(new ProblemDetails { Title = "Photos could not be uploaded", Detail = validation, Status = 400 });
        var savedPaths = new List<string>();
        try
        {
            foreach (var photo in photos)
            {
                var data = await ReadAndVerifyPhoto(photo, ct);
                if (data is null) throw new InvalidDataException($"{Path.GetFileName(photo.FileName)} is not a valid JPEG, PNG, or WebP image.");
                var file = MakeFile(observation.Id, photo.FileName, data.Value.Bytes, data.Value.Mime, data.Value.Extension);
                var path = SafeStoragePath(UploadRoot, file.StoredName);
                Directory.CreateDirectory(Path.GetDirectoryName(path)!);
                await System.IO.File.WriteAllBytesAsync(path, data.Value.Bytes, ct);
                savedPaths.Add(path);
                observation.Files.Add(file);
            }
            await db.SaveChangesAsync(ct);
        }
        catch (InvalidDataException ex)
        {
            foreach (var path in savedPaths) System.IO.File.Delete(path);
            return BadRequest(new ProblemDetails { Title = "Unsupported photo", Detail = ex.Message, Status = 400 });
        }
        catch
        {
            foreach (var path in savedPaths) System.IO.File.Delete(path);
            throw;
        }
        return Ok(new { files = observation.Files.Select(x => ToDto(observation.Id, x)) });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var observation = await db.Observations.AsNoTracking().Include(x => x.Author).Include(x => x.Files).Include(x => x.Annotations).ThenInclude(x => x.Author)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (observation is null || !CanRead(observation.AuthorId)) return NotFound();
        return Ok(ToObservationDto(observation));
    }

    [HttpGet("{id:guid}/files/{fileId:guid}")]
    public async Task<IActionResult> Download(Guid id, Guid fileId, CancellationToken ct)
    {
        var file = await db.ObservationFiles.AsNoTracking()
            .Where(x => x.Id == fileId && x.ObservationId == id)
            .Select(x => new { x.StoredName, x.OriginalName, x.Mime, x.Observation!.AuthorId })
            .FirstOrDefaultAsync(ct);
        if (file is null || !CanRead(file.AuthorId)) return NotFound();
        var path = SafeStoragePath(UploadRoot, file.StoredName);
        if (!System.IO.File.Exists(path)) return NotFound();
        return PhysicalFile(path, file.Mime);
    }

    private string UploadRoot => Path.GetFullPath(config["Storage:UploadPath"] ??
        Path.Combine(environment.ContentRootPath, "..", "..", "mars-uploads"));

    private bool CanRead(Guid authorId) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) && userId == authorId;

    private static string? Validate(ObservationUploadRequest x, List<IFormFile> photos)
    {
        if (string.IsNullOrWhiteSpace(x.Title) || x.Title.Length > 90) return "Title is required and must be 90 characters or fewer.";
        if (!new[] { "geology", "water", "mineral", "rock", "hazard", "dust", "temperature", "radiation", "unknown", "other" }.Contains(x.Category)) return "Choose a valid observation category.";
        if (!double.IsFinite(x.Lat) || !double.IsFinite(x.Lon) || x.Lat is < -90 or > 90 || x.Lon is < -180 or > 360) return "Coordinates are invalid.";
        if (x.Sol < 0 || x.Sol > 20000) return "Sol must be between 0 and 20,000.";
        if (!new[] { "none", "low", "moderate", "high" }.Contains(x.HazardClass)) return "Choose a valid hazard classification.";
        return ValidatePhotos(photos);
    }

    private static string? ValidatePhotos(List<IFormFile> photos)
    {
        if (photos.Count > MaxPhotos) return $"Attach no more than {MaxPhotos} photos at a time.";
        if (photos.Any(x => x.Length <= 0 || x.Length > MaxPhotoBytes)) return "Each photo must be between 1 byte and 5 MB.";
        return null;
    }

    private static async Task<(byte[] Bytes, string Mime, string Extension)?> ReadAndVerifyPhoto(IFormFile photo, CancellationToken ct)
    {
        await using var stream = new MemoryStream();
        await photo.CopyToAsync(stream, ct);
        var bytes = stream.ToArray();
        if (bytes.Length > MaxPhotoBytes || bytes.Length < 12) return null;
        if (bytes.AsSpan().StartsWith(new byte[] { 0xff, 0xd8, 0xff })) return (bytes, "image/jpeg", ".jpg");
        if (bytes.AsSpan().StartsWith(new byte[] { 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a })) return (bytes, "image/png", ".png");
        if (bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) && bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8)) return (bytes, "image/webp", ".webp");
        return null;
    }

    private static ObservationFile MakeFile(Guid observationId, string originalName, byte[] bytes, string mime, string extension)
    {
        var id = Guid.NewGuid();
        return new ObservationFile
        {
            Id = id, ObservationId = observationId, StoredName = $"{observationId:N}/{id:N}{extension}",
            OriginalName = Path.GetFileName(originalName) is { } name && name.Length > 255 ? name[..255] : Path.GetFileName(originalName),
            Mime = mime, SizeBytes = bytes.LongLength,
            Sha256 = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(),
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private static string SafeStoragePath(string root, string relative)
    {
        var fullRoot = Path.GetFullPath(root + Path.DirectorySeparatorChar);
        var fullPath = Path.GetFullPath(Path.Combine(root, relative));
        if (!fullPath.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Invalid storage key.");
        return fullPath;
    }

    private object ToDto(Guid observationId, ObservationFile file) => new
    {
        id = file.Id, name = file.OriginalName, mime = file.Mime, sizeBytes = file.SizeBytes,
        sha256 = file.Sha256, url = $"/api/v1/observations/{observationId}/files/{file.Id}"
    };

    private object ToObservationDto(Observation observation)
    {
        const double originLat = 18.4661, originLon = 77.4298;
        var uiStatus = "submitted";
        return new
        {
            id = observation.Id, code = observation.Code, title = observation.Title, category = observation.Category,
            x = (observation.Longitude - originLon) / (6d / 58960), y = (originLat - observation.Latitude) / (6d / 59160),
            latitude = observation.Latitude, longitude = observation.Longitude, locationName = observation.LocationName,
            description = observation.Description, geology = observation.GeologicalCharacteristics,
            minerals = observation.MineralIdentification, waterIndicators = observation.WaterIndicators,
            environment = observation.Environment, tempC = observation.TemperatureC, doseUSvH = observation.DoseUSvH,
            terrain = observation.Terrain, hazardClass = observation.HazardClass, sol = observation.Sol, lmst = observation.Lmst,
            contributorId = observation.Author?.CrewId ?? observation.AuthorId.ToString(), notes = observation.Notes, status = uiStatus,
            photos = observation.Files.Select(file => $"/api/v1/observations/{observation.Id}/files/{file.Id}"), attachments = Array.Empty<object>(),
            annotations = observation.Annotations.OrderBy(x => x.CreatedAt).Select(x => new { authorId = x.Author?.CrewId ?? x.AuthorId.ToString(), text = x.Text, createdAt = x.CreatedAt, sol = (int?)null }),
            relatedDatasets = Array.Empty<string>()
        };
    }
}
