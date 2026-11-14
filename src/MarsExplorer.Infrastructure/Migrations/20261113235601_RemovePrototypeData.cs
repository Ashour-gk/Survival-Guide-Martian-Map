using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MarsExplorer.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemovePrototypeData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE f FROM [mars].[ObservationFiles] AS f
                INNER JOIN [mars].[Observations] AS o ON o.[Id] = f.[ObservationId]
                INNER JOIN [mars].[AspNetUsers] AS u ON u.[Id] = o.[AuthorId]
                WHERE u.[CrewId] IN ('ADM-01','AST-01','AST-02','AST-03','SCI-01','SCI-02');
                DELETE o FROM [mars].[Observations] AS o
                INNER JOIN [mars].[AspNetUsers] AS u ON u.[Id] = o.[AuthorId]
                WHERE u.[CrewId] IN ('ADM-01','AST-01','AST-02','AST-03','SCI-01','SCI-02');
                DELETE FROM [mars].[AspNetUsers]
                WHERE [CrewId] IN ('ADM-01','AST-01','AST-02','AST-03','SCI-01','SCI-02');
                DELETE FROM [mars].[HazardZones]
                WHERE [Source] = 'MarsExplorer synthetic terrain and interpreted imagery';
                DELETE FROM [mars].[Layers]
                WHERE [Key] IN ('topo','thermal','geology','mineral','radiation','traverse','nav','observations')
                  AND [Citation] LIKE N'%RedTrace Detailed Data Reference.pdf%';
                UPDATE [mars].[Sites]
                SET [Name] = N'Gale Crater · Curiosity exploration region'
                WHERE [Slug] = 'gale-crater';
                """);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Prototype accounts and scientific records are intentionally not restored.
        }
    }
}
