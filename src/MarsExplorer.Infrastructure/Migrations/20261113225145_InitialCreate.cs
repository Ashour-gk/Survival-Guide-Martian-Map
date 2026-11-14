using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MarsExplorer.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "mars");

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                schema: "mars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    CrewId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    TotpSecret = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    FailedLoginCount = table.Column<int>(type: "int", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastActiveAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.CheckConstraint("CK_AspNetUsers_Role", "[Role] IN ('Administrator', 'Astronaut', 'Researcher')");
                    table.CheckConstraint("CK_AspNetUsers_Status", "[Status] IN ('Active', 'Suspended', 'Invited')");
                });

            migrationBuilder.CreateTable(
                name: "Sites",
                schema: "mars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    Slug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                    CenterLat = table.Column<double>(type: "float", nullable: false),
                    CenterLon = table.Column<double>(type: "float", nullable: false),
                    BoundsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TileExtentM = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sites", x => x.Id);
                    table.CheckConstraint("CK_Sites_BoundsJson", "ISJSON([BoundsJson]) = 1");
                });

            migrationBuilder.CreateTable(
                name: "HazardZones",
                schema: "mars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    SiteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Severity = table.Column<int>(type: "int", nullable: false),
                    GeoJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Provenance = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HazardZones", x => x.Id);
                    table.CheckConstraint("CK_HazardZones_GeoJson", "ISJSON([GeoJson]) = 1");
                    table.ForeignKey(
                        name: "FK_HazardZones_Sites_SiteId",
                        column: x => x.SiteId,
                        principalSchema: "mars",
                        principalTable: "Sites",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Layers",
                schema: "mars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    SiteId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Key = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    SourceName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourceUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TileUrlTemplate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MarsTrekLayerId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Format = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MinZoom = table.Column<int>(type: "int", nullable: false),
                    MaxZoom = table.Column<int>(type: "int", nullable: false),
                    BoundsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ResolutionM = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Provenance = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    VerificationStatus = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    LastVerifiedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Enabled = table.Column<bool>(type: "bit", nullable: false),
                    Citation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Layers", x => x.Id);
                    table.CheckConstraint("CK_Layers_BoundsJson", "ISJSON([BoundsJson]) = 1");
                    table.ForeignKey(
                        name: "FK_Layers_Sites_SiteId",
                        column: x => x.SiteId,
                        principalSchema: "mars",
                        principalTable: "Sites",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_CrewId",
                schema: "mars",
                table: "AspNetUsers",
                column: "CrewId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HazardZones_SiteId",
                schema: "mars",
                table: "HazardZones",
                column: "SiteId");

            migrationBuilder.CreateIndex(
                name: "IX_Layers_Key",
                schema: "mars",
                table: "Layers",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Layers_SiteId",
                schema: "mars",
                table: "Layers",
                column: "SiteId");

            migrationBuilder.CreateIndex(
                name: "IX_Sites_Slug",
                schema: "mars",
                table: "Sites",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetUsers",
                schema: "mars");

            migrationBuilder.DropTable(
                name: "HazardZones",
                schema: "mars");

            migrationBuilder.DropTable(
                name: "Layers",
                schema: "mars");

            migrationBuilder.DropTable(
                name: "Sites",
                schema: "mars");
        }
    }
}
