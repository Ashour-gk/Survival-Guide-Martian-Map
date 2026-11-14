FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /workspace
COPY MarsExplorer.sln ./
COPY src/MarsExplorer.Domain/MarsExplorer.Domain.csproj src/MarsExplorer.Domain/
COPY src/MarsExplorer.Application/MarsExplorer.Application.csproj src/MarsExplorer.Application/
COPY src/MarsExplorer.Infrastructure/MarsExplorer.Infrastructure.csproj src/MarsExplorer.Infrastructure/
COPY src/MarsExplorer.Api/MarsExplorer.Api.csproj src/MarsExplorer.Api/
RUN dotnet restore src/MarsExplorer.Api/MarsExplorer.Api.csproj
COPY src/ src/
RUN dotnet publish src/MarsExplorer.Api/MarsExplorer.Api.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /out .
EXPOSE 5080
ENTRYPOINT ["dotnet", "MarsExplorer.Api.dll"]
