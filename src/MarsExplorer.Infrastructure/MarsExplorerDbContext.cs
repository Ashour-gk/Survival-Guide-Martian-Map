using MarsExplorer.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace MarsExplorer.Infrastructure;

public sealed class MarsExplorerDbContext(DbContextOptions<MarsExplorerDbContext> options)
    : DbContext(options)
{
    public DbSet<Site> Sites => Set<Site>();
    public DbSet<Layer> Layers => Set<Layer>();
    public DbSet<HazardZone> HazardZones => Set<HazardZone>();
    public DbSet<ApplicationUser> Users => Set<ApplicationUser>();
    public DbSet<Observation> Observations => Set<Observation>();
    public DbSet<ObservationFile> ObservationFiles => Set<ObservationFile>();
    public DbSet<ObservationAnnotation> ObservationAnnotations => Set<ObservationAnnotation>();
    public DbSet<MissionRoute> MissionRoutes => Set<MissionRoute>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        var sqlite = Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite";
        if (!sqlite) model.HasDefaultSchema("mars");
        string JsonCheck(string column) => sqlite ? $"json_valid([{column}]) = 1" : $"ISJSON([{column}]) = 1";

        model.Entity<Site>(e =>
        {
            e.HasKey(x => x.Id);
            if (!sqlite) e.Property(x => x.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(80).IsRequired();
            e.Property(x => x.Name).HasMaxLength(180).IsRequired();
            if (!sqlite) e.Property(x => x.BoundsJson).HasColumnType("nvarchar(max)");
            e.ToTable(t => t.HasCheckConstraint("CK_Sites_BoundsJson", JsonCheck("BoundsJson")));
        });

        model.Entity<Layer>(e =>
        {
            e.HasKey(x => x.Id);
            if (!sqlite) e.Property(x => x.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            e.HasIndex(x => x.Key).IsUnique();
            e.HasIndex(x => x.SiteId);
            e.Property(x => x.Key).HasMaxLength(100).IsRequired();
            e.Property(x => x.Title).HasMaxLength(180).IsRequired();
            e.Property(x => x.Kind).HasMaxLength(24).IsRequired();
            e.Property(x => x.Provenance).HasMaxLength(24).IsRequired();
            e.Property(x => x.VerificationStatus).HasMaxLength(24).IsRequired();
            if (!sqlite) e.Property(x => x.BoundsJson).HasColumnType("nvarchar(max)");
            if (!sqlite) e.Property(x => x.Citation).HasColumnType("nvarchar(max)");
            e.HasOne(x => x.Site).WithMany(x => x.Layers).HasForeignKey(x => x.SiteId).OnDelete(DeleteBehavior.NoAction);
            e.ToTable(t => t.HasCheckConstraint("CK_Layers_BoundsJson", JsonCheck("BoundsJson")));
        });

        model.Entity<HazardZone>(e =>
        {
            e.HasKey(x => x.Id);
            if (!sqlite) e.Property(x => x.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            e.HasIndex(x => x.SiteId);
            e.Property(x => x.Name).HasMaxLength(180).IsRequired();
            e.Property(x => x.Kind).HasMaxLength(40).IsRequired();
            if (!sqlite) e.Property(x => x.GeoJson).HasColumnType("nvarchar(max)");
            e.HasOne(x => x.Site).WithMany(x => x.Hazards).HasForeignKey(x => x.SiteId).OnDelete(DeleteBehavior.NoAction);
            e.ToTable(t => t.HasCheckConstraint("CK_HazardZones_GeoJson", JsonCheck("GeoJson")));
        });

        model.Entity<ApplicationUser>(e =>
        {
            e.ToTable("AspNetUsers");
            e.HasKey(x => x.Id);
            if (!sqlite) e.Property(x => x.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            e.HasIndex(x => x.CrewId).IsUnique();
            e.Property(x => x.CrewId).HasMaxLength(40).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(160).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.Role).HasMaxLength(40).IsRequired();
            e.Property(x => x.Status).HasMaxLength(24).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_AspNetUsers_Status", "[Status] IN ('Active', 'Suspended', 'Invited')");
                t.HasCheckConstraint("CK_AspNetUsers_Role", "[Role] IN ('Administrator', 'Astronaut', 'Researcher')");
            });
        });

        model.Entity<Observation>(e =>
        {
            e.ToTable("Observations");
            e.HasKey(x => x.Id);
            if (!sqlite) e.Property(x => x.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => x.AuthorId);
            e.HasIndex(x => x.Status);
            e.Property(x => x.Code).HasMaxLength(24).IsRequired();
            e.Property(x => x.Title).HasMaxLength(160).IsRequired();
            e.Property(x => x.Category).HasMaxLength(32).IsRequired();
            e.Property(x => x.LocationName).HasMaxLength(180).IsRequired();
            e.Property(x => x.Status).HasMaxLength(24).IsRequired();
            if (sqlite) e.Property(x => x.RowVersion).IsConcurrencyToken();
            else e.Property(x => x.RowVersion).IsRowVersion();
            e.HasOne(x => x.Author).WithMany().HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.NoAction);
        });

        model.Entity<ObservationFile>(e =>
        {
            e.ToTable("ObservationFiles");
            e.HasKey(x => x.Id);
            if (!sqlite) e.Property(x => x.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            e.HasIndex(x => x.ObservationId);
            e.HasIndex(x => x.StoredName).IsUnique();
            e.Property(x => x.StoredName).HasMaxLength(120).IsRequired();
            e.Property(x => x.OriginalName).HasMaxLength(255).IsRequired();
            e.Property(x => x.Mime).HasMaxLength(80).IsRequired();
            e.Property(x => x.Sha256).HasMaxLength(64).IsRequired();
            e.HasOne(x => x.Observation).WithMany(x => x.Files).HasForeignKey(x => x.ObservationId).OnDelete(DeleteBehavior.NoAction);
        });

        model.Entity<ObservationAnnotation>(e =>
        {
            e.ToTable("ObservationAnnotations");
            e.HasKey(x => x.Id);
            if (!sqlite) e.Property(x => x.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            e.HasIndex(x => x.ObservationId);
            e.Property(x => x.Text).HasMaxLength(4000).IsRequired();
            e.HasOne(x => x.Observation).WithMany(x => x.Annotations).HasForeignKey(x => x.ObservationId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.Author).WithMany().HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.NoAction);
        });

        model.Entity<MissionRoute>(e =>
        {
            e.ToTable("MissionRoutes");
            e.HasKey(x => x.Id);
            if (!sqlite) e.Property(x => x.Id).HasDefaultValueSql("NEWSEQUENTIALID()");
            e.HasIndex(x => x.OwnerId).IsUnique();
            if (!sqlite) e.Property(x => x.StopsJson).HasColumnType("nvarchar(max)");
            if (sqlite) e.Property(x => x.RowVersion).IsConcurrencyToken();
            else e.Property(x => x.RowVersion).IsRowVersion();
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.NoAction);
            e.ToTable(t => t.HasCheckConstraint("CK_MissionRoutes_StopsJson", JsonCheck("StopsJson")));
        });

        if (sqlite)
        {
            var dateTimeOffset = new ValueConverter<DateTimeOffset, long>(value => value.UtcTicks, value => new DateTimeOffset(value, TimeSpan.Zero));
            var nullableDateTimeOffset = new ValueConverter<DateTimeOffset?, long?>(value => value.HasValue ? value.Value.UtcTicks : null, value => value.HasValue ? new DateTimeOffset(value.Value, TimeSpan.Zero) : null);
            foreach (var property in model.Model.GetEntityTypes().SelectMany(entity => entity.GetProperties()))
            {
                if (property.ClrType == typeof(DateTimeOffset)) property.SetValueConverter(dateTimeOffset);
                else if (property.ClrType == typeof(DateTimeOffset?)) property.SetValueConverter(nullableDateTimeOffset);
            }
        }
    }

    public override int SaveChanges()
    {
        AssignMissingIds();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        AssignMissingIds();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void AssignMissingIds()
    {
        foreach (var entry in ChangeTracker.Entries().Where(entry => entry.State == EntityState.Added && entry.Metadata.FindProperty("Id")?.ClrType == typeof(Guid)))
        {
            var id = entry.Property("Id");
            if ((Guid)id.CurrentValue! == Guid.Empty) id.CurrentValue = Guid.NewGuid();
        }
    }
}
