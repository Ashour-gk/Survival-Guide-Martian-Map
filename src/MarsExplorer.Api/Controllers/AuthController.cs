using System.Security.Claims;
using MarsExplorer.Domain;
using MarsExplorer.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace MarsExplorer.Api.Controllers;

public sealed record LoginRequest(string CrewId, string Password);

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(MarsExplorerDbContext db, IPasswordHasher<ApplicationUser> hasher, IConfiguration configuration) : ControllerBase
{
    [HttpGet("demo-account")]
    public IActionResult DemoAccount()
    {
        Response.Headers.CacheControl = "no-store";
        var crewId = configuration["MarsExplorer:DemoCrewId"]?.Trim();
        var password = configuration["MarsExplorer:DemoPassword"];
        return Ok(new
        {
            crewId = string.IsNullOrWhiteSpace(crewId) ? DemoAccountDefaults.CrewId : crewId,
            password = string.IsNullOrWhiteSpace(password) ? DemoAccountDefaults.Password : password,
            label = "Public read-only demo account"
        });
    }

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.CrewId) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new ProblemDetails { Title = "Sign-in fields required", Detail = "Crew ID and password are required.", Status = 400 });
        var user = await db.Users.FirstOrDefaultAsync(x => x.CrewId == request.CrewId.Trim(), ct);
        if (user is null) return Unauthorized(new { code = "invalid_credentials", message = "Crew ID or password is incorrect." });
        if (user.Status != "Active") return StatusCode(403, new { code = "inactive", message = "This account is inactive. Contact your system administrator." });
        var demoCrewId = configuration["MarsExplorer:DemoCrewId"]?.Trim();
        demoCrewId = string.IsNullOrWhiteSpace(demoCrewId) ? DemoAccountDefaults.CrewId : demoCrewId;
        var isDemoAccount = string.Equals(user.CrewId, demoCrewId, StringComparison.OrdinalIgnoreCase);
        if (!isDemoAccount && user.LockoutEnd > DateTimeOffset.UtcNow)
            return StatusCode(423, new { code = "locked", message = "Account temporarily locked. Try again in 15 minutes." });

        var passwordOk = hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) != PasswordVerificationResult.Failed;
        if (!passwordOk)
        {
            if (!isDemoAccount) user.FailedLoginCount++;
            if (!isDemoAccount && user.FailedLoginCount >= 5)
            {
                user.FailedLoginCount = 0;
                user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(15);
            }
            await db.SaveChangesAsync(ct);
            return Unauthorized(new { code = "invalid_credentials", message = "Crew ID or password is incorrect." });
        }

        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        user.LastActiveAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()), new(ClaimTypes.Name, user.DisplayName),
            new("crewId", user.CrewId), new(ClaimTypes.Role, user.Role)
        };
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)),
            new AuthenticationProperties { IsPersistent = true, AllowRefresh = true });
        return Ok(new { id = user.Id, crewId = user.CrewId, displayName = user.DisplayName, role = user.Role });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (User.Identity?.IsAuthenticated != true || !Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        var user = await db.Users.AsNoTracking().Where(x => x.Id == userId)
            .Select(x => new { id = x.Id, crewId = x.CrewId, displayName = x.DisplayName, role = x.Role, status = x.Status })
            .FirstOrDefaultAsync(ct);
        return user is null ? Unauthorized() : Ok(user);
    }
}
