using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MarsExplorer.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddObservationUploads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Observations",
                schema: "mars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    Code = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    AuthorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    LocationName = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false),
                    GeologicalCharacteristics = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MineralIdentification = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WaterIndicators = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Environment = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TemperatureC = table.Column<double>(type: "float", nullable: true),
                    DoseUSvH = table.Column<double>(type: "float", nullable: true),
                    Terrain = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HazardClass = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Sol = table.Column<int>(type: "int", nullable: false),
                    Lmst = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(24)", maxLength: 24, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Observations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Observations_AspNetUsers_AuthorId",
                        column: x => x.AuthorId,
                        principalSchema: "mars",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ObservationFiles",
                schema: "mars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    ObservationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StoredName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    OriginalName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Mime = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Sha256 = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObservationFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ObservationFiles_Observations_ObservationId",
                        column: x => x.ObservationId,
                        principalSchema: "mars",
                        principalTable: "Observations",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ObservationFiles_ObservationId",
                schema: "mars",
                table: "ObservationFiles",
                column: "ObservationId");

            migrationBuilder.CreateIndex(
                name: "IX_ObservationFiles_StoredName",
                schema: "mars",
                table: "ObservationFiles",
                column: "StoredName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Observations_AuthorId",
                schema: "mars",
                table: "Observations",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_Observations_Code",
                schema: "mars",
                table: "Observations",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Observations_Status",
                schema: "mars",
                table: "Observations",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ObservationFiles",
                schema: "mars");

            migrationBuilder.DropTable(
                name: "Observations",
                schema: "mars");
        }
    }
}
