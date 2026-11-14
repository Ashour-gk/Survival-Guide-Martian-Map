using System.Threading.RateLimiting;
using MarsExplorer.Domain;
using MarsExplorer.Infrastructure;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDataProtection()
        .UseEphemeralDataProtectionProvider()
        .SetApplicationName("MarsExplorer.LocalDevelopment");
    builder.Logging.ClearProviders();
    builder.Logging.AddConsole();
    builder.Logging.AddFilter("Microsoft.EntityFrameworkCore.Database.Command", LogLevel.Warning);
}

var databaseProvider = builder.Configuration["Database:Provider"] ?? "SqlServer";
var connectionString = databaseProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase)
    ? builder.Configuration.GetConnectionString("MarsExplorerSqlite") ?? "Data Source=mars-explorer.db;Cache=Shared"
    : builder.Configuration.GetConnectionString("MarsExplorer")
      ?? throw new InvalidOperationException("ConnectionStrings:MarsExplorer is required for SQL Server.");

builder.Services.AddDbContext<MarsExplorerDbContext>(options =>
{
    if (databaseProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase)) options.UseSqlite(connectionString);
    else if (databaseProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase)) options.UseSqlServer(connectionString);
    else throw new InvalidOperationException($"Unsupported Database:Provider '{databaseProvider}'. Use Sqlite or SqlServer.");
});
builder.Services.AddScoped<IPasswordHasher<ApplicationUser>, PasswordHasher<ApplicationUser>>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("nasa-mars-tiles", client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("MarsExplorer/1.0 (NASA WMTS tile client)");
});
builder.Services.AddHttpClient("mars-data", client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("MarsExplorer/1.0 (live NASA PDS and Mars place search)");
});
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo { Title = "Mars Explorer API", Version = "v1" });
    options.AddSecurityDefinition("cookieAuth", new Microsoft.OpenApi.OpenApiSecurityScheme
    {
        Type = Microsoft.OpenApi.SecuritySchemeType.ApiKey, In = Microsoft.OpenApi.ParameterLocation.Cookie,
        Name = ".MarsExplorer.Auth", Description = "HttpOnly sign-in cookie issued by POST /api/v1/auth/login"
    });
});
builder.Services.AddCors(options => options.AddPolicy("frontend", policy => policy
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173", "http://127.0.0.1:5173"])
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = ".MarsExplorer.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options => options.AddPolicy("login", context =>
    RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 })));

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors("frontend");
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    if (HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method) ||
        HttpMethods.IsPatch(context.Request.Method) || HttpMethods.IsDelete(context.Request.Method))
    {
        if (!string.Equals(context.Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.Ordinal))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { title = "Request header required", status = 400, detail = "Send X-Requested-With: XMLHttpRequest for state-changing requests." });
            return;
        }
    }
    await next();
});
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
if (app.Environment.IsDevelopment())
{
    app.MapGet("/", (IConfiguration config) => Results.Redirect(config["Frontend:Url"] ?? "http://localhost:5173/"));
}

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MarsExplorerDbContext>();
    try
    {
        await SeedData.InitializeAsync(db, app.Lifetime.ApplicationStopping);
    }
    catch (Exception ex) when (app.Environment.IsDevelopment())
    {
        Console.Error.WriteLine($"Database initialization failed. The development API will start, but database-backed routes will be unavailable. {ex.GetType().Name}: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    var testCrewId = builder.Configuration["MarsExplorer:TestCrewId"]?.Trim();
    var testPassword = builder.Configuration["MarsExplorer:TestPassword"];
    testCrewId = string.IsNullOrWhiteSpace(testCrewId) ? "MARS-DEMO" : testCrewId;
    testPassword = string.IsNullOrWhiteSpace(testPassword) ? "MarsDemoLocal2026!" : testPassword;
    if (testPassword.Length < 12)
        throw new InvalidOperationException("MarsExplorer:TestPassword must contain at least 12 characters.");

    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<MarsExplorerDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<ApplicationUser>>();
    var user = await db.Users.FirstOrDefaultAsync(x => x.CrewId == testCrewId, app.Lifetime.ApplicationStopping);
    if (user is null)
    {
        user = new ApplicationUser
        {
            Id = Guid.NewGuid(), CrewId = testCrewId, DisplayName = "Local Demo Crew",
            Email = $"{testCrewId.ToLowerInvariant()}@local.test", Role = "Astronaut", Status = "Active",
            PasswordHash = string.Empty, CreatedAt = DateTimeOffset.UtcNow,
        };
        db.Users.Add(user);
    }
    user.PasswordHash = hasher.HashPassword(user, testPassword);
    user.Status = "Active";
    user.FailedLoginCount = 0;
    user.LockoutEnd = null;
    await db.SaveChangesAsync(app.Lifetime.ApplicationStopping);
    Console.WriteLine($"Configured local development demo crew account: {testCrewId}");
}

await app.RunAsync();

public partial class Program;
