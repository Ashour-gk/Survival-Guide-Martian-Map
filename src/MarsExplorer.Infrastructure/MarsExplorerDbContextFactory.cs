using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace MarsExplorer.Infrastructure;

public sealed class MarsExplorerDbContextFactory : IDesignTimeDbContextFactory<MarsExplorerDbContext>
{
    public MarsExplorerDbContext CreateDbContext(string[] args)
    {
        var provider = Environment.GetEnvironmentVariable("Database__Provider") ?? "SqlServer";
        var optionsBuilder = new DbContextOptionsBuilder<MarsExplorerDbContext>();
        if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            var connection = Environment.GetEnvironmentVariable("ConnectionStrings__MarsExplorerSqlite") ?? "Data Source=mars-explorer.db;Cache=Shared";
            optionsBuilder.UseSqlite(connection);
        }
        else
        {
            var connection = Environment.GetEnvironmentVariable("ConnectionStrings__MarsExplorer")
                ?? "Server=localhost;Database=MarsExplorer;Trusted_Connection=True;TrustServerCertificate=True";
            optionsBuilder.UseSqlServer(connection);
        }
        var options = optionsBuilder.Options;
        return new MarsExplorerDbContext(options);
    }
}
