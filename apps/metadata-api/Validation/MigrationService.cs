using System.Text.Json;
using System.Text.Json.Nodes;

namespace MetadataApi.Validation;

public record MigrationResult(JsonElement Doc, string From, string To, string[] Warnings, bool Migrated);

public static class MigrationService
{
    public const string CurrentSchemaVersion = "1.1";

    private static readonly Dictionary<string, string> LegacyWidgetMap = new()
    {
        ["FormGrid"] = "layout.FormGrid",
        ["Section"] = "layout.Section",
        ["core.Section"] = "layout.Section",
        ["Stack"] = "layout.Stack",
    };

    public static MigrationResult Migrate(JsonElement doc)
    {
        if (doc.ValueKind != JsonValueKind.Object)
            return new MigrationResult(doc, "unknown", "unknown", [], false);

        var node = JsonNode.Parse(doc.GetRawText())!.AsObject();
        var originalVersion = node.TryGetPropertyValue("schemaVersion", out var sv) && sv is JsonValue svVal
            ? svVal.ToString()
            : "1.0";

        var warnings = new List<string>();
        var currentVersion = originalVersion;
        var didMigrate = false;

        if (currentVersion == "1.0")
        {
            Migrate_1_0_To_1_1(node, warnings);
            currentVersion = "1.1";
            didMigrate = true;
        }

        if (!node.ContainsKey("schemaVersion"))
            node["schemaVersion"] = CurrentSchemaVersion;

        var resultDoc = JsonSerializer.Deserialize<JsonElement>(node.ToJsonString());
        return new MigrationResult(resultDoc, originalVersion, currentVersion, warnings.ToArray(), didMigrate);
    }

    private static void Migrate_1_0_To_1_1(JsonObject doc, List<string> warnings)
    {
        if (!doc.TryGetPropertyValue("nodes", out var nodesNode) || nodesNode is not JsonObject nodes)
            return;

        foreach (var (nodeId, nodeVal) in nodes)
        {
            if (nodeVal is not JsonObject nodeObj) continue;
            if (!nodeObj.TryGetPropertyValue("type", out var typeNode)) continue;
            var wType = typeNode?.ToString() ?? "";
            if (LegacyWidgetMap.TryGetValue(wType, out var canonical))
            {
                warnings.Add($"Node \"{nodeId}\": migrated widget type \"{wType}\" -> \"{canonical}\"");
                nodeObj["type"] = canonical;
            }
        }

        doc["schemaVersion"] = "1.1";
    }
}
