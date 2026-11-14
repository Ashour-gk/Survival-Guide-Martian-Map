using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MarsExplorer.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddObservationAnnotationsAndRoutes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MissionRoutes",
                schema: "mars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    OwnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StopsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MissionRoutes", x => x.Id);
                    table.CheckConstraint("CK_MissionRoutes_StopsJson", "ISJSON([StopsJson]) = 1");
                    table.ForeignKey(
                        name: "FK_MissionRoutes_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalSchema: "mars",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ObservationAnnotations",
                schema: "mars",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWSEQUENTIALID()"),
                    ObservationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObservationAnnotations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ObservationAnnotations_AspNetUsers_AuthorId",
                        column: x => x.AuthorId,
                        principalSchema: "mars",
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ObservationAnnotations_Observations_ObservationId",
                        column: x => x.ObservationId,
                        principalSchema: "mars",
                        principalTable: "Observations",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_MissionRoutes_OwnerId",
                schema: "mars",
                table: "MissionRoutes",
                column: "OwnerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ObservationAnnotations_AuthorId",
                schema: "mars",
                table: "ObservationAnnotations",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_ObservationAnnotations_ObservationId",
                schema: "mars",
                table: "ObservationAnnotations",
                column: "ObservationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MissionRoutes",
                schema: "mars");

            migrationBuilder.DropTable(
                name: "ObservationAnnotations",
                schema: "mars");
        }
    }
}
