using System.Text.Json;

namespace MetadataApi.Validation;

public record GovIssue(string Severity, string Code, string Message, string? NodeId = null, string? Path = null);

public record GovernanceResult(bool Ok, GovIssue[] Errors, GovIssue[] Warnings);

public class GovernanceContext
{
    public string? Channel { get; set; }
    public string[] AllowedRestHosts { get; set; } = [];
}

public static class GovernanceValidator
{
    private static readonly HashSet<string> CanonicalWidgetTypes =
    [
        "layout.FormGrid", "layout.Section", "layout.Stack",
        "core.TextInput", "core.TextArea", "core.NumberInput", "core.DateInput",
        "core.Checkbox", "core.Switch", "core.Select", "core.RadioGroup", "core.Button"
    ];

    private static readonly Dictionary<string, string> LegacyAliases = new()
    {
        ["FormGrid"] = "layout.FormGrid",
        ["Section"] = "layout.Section",
        ["core.Section"] = "layout.Section",
        ["Stack"] = "layout.Stack",
    };

    private static readonly HashSet<string> AllowedActionTypes =
    [
        "SetValue", "ValidateForm", "Toast", "Navigate", "Batch",
        "If", "CallDataSource", "SetData", "SubmitForm"
    ];

    private static readonly HashSet<string> AllowedEventNames = ["onChange", "onClick", "onBlur"];

    private static readonly string[] AllowedSetValuePathPrefixes = ["form.values.", "ui."];

    private static readonly HashSet<string> AllowedExprOps =
    [
        "lit", "ref", "eq", "neq", "gt", "gte", "lt", "lte",
        "and", "or", "not", "if", "coalesce"
    ];

    private const int MaxExprDepth = 20;
    private const int MaxExprNodeCount = 200;
    private const int MaxNodes = 500;
    private const int MaxDocBytes = 2_000_000;

    public static GovernanceResult Validate(JsonElement doc, GovernanceContext? context = null)
    {
        var errors = new List<GovIssue>();
        var warnings = new List<GovIssue>();
        var isProd = context?.Channel == "prod";

        var rawJson = doc.GetRawText();
        if (rawJson.Length > MaxDocBytes)
            errors.Add(new GovIssue("error", "GOV_DOC_TOO_LARGE", $"Document is {rawJson.Length} bytes (max {MaxDocBytes})"));

        if (doc.ValueKind != JsonValueKind.Object)
        {
            errors.Add(new GovIssue("error", "GOV_INVALID_DOC", "Document is not an object"));
            return new GovernanceResult(false, errors.ToArray(), warnings.ToArray());
        }

        if (doc.TryGetProperty("dataSources", out var dsArr) && dsArr.ValueKind == JsonValueKind.Array)
        {
            foreach (var ds in dsArr.EnumerateArray())
            {
                var dsId = ds.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                var kind = ds.TryGetProperty("kind", out var kindEl) ? kindEl.GetString() ?? "" : "";

                if (isProd && kind == "mock")
                    errors.Add(new GovIssue("error", "GOV_DS_MOCK_IN_PROD", $"Mock datasource \"{dsId}\" not allowed in prod", Path: $"dataSources.{dsId}"));

                if (isProd && kind == "rest" && ds.TryGetProperty("url", out var urlEl))
                {
                    var url = urlEl.GetString() ?? "";
                    if (!IsUrlAllowed(url, context?.AllowedRestHosts ?? []))
                        errors.Add(new GovIssue("error", "GOV_DS_REST_UNSAFE", $"REST datasource \"{dsId}\" URL \"{url}\" not allowed in prod (must be relative or allowlisted)", Path: $"dataSources.{dsId}"));
                }
            }
        }

        if (doc.TryGetProperty("nodes", out var nodesEl) && nodesEl.ValueKind == JsonValueKind.Object)
        {
            var nodeCount = 0;
            foreach (var nodeProp in nodesEl.EnumerateObject())
            {
                nodeCount++;
                var nodeId = nodeProp.Name;
                var node = nodeProp.Value;

                if (node.TryGetProperty("type", out var typeEl))
                {
                    var wType = typeEl.GetString() ?? "";
                    var isCanonical = CanonicalWidgetTypes.Contains(wType);
                    var isLegacy = LegacyAliases.ContainsKey(wType);

                    if (!isCanonical && !isLegacy)
                        errors.Add(new GovIssue("error", "GOV_WIDGET_UNKNOWN", $"Unknown widget type \"{wType}\"", nodeId, $"nodes.{nodeId}.type"));
                    else if (isLegacy && !isCanonical)
                        warnings.Add(new GovIssue("warning", "GOV_WIDGET_LEGACY", $"Legacy widget type \"{wType}\" — use \"{LegacyAliases[wType]}\"", nodeId));
                }

                if (node.TryGetProperty("bindings", out var bindingsEl) && bindingsEl.ValueKind == JsonValueKind.Object)
                {
                    if (bindingsEl.TryGetProperty("value", out var valBind) && valBind.ValueKind == JsonValueKind.String)
                    {
                        var bp = valBind.GetString()!;
                        if (!bp.StartsWith("form.values."))
                            errors.Add(new GovIssue("error", "GOV_BINDING_BAD_VALUE", $"value binding \"{bp}\" must start with \"form.values.\"", nodeId));
                    }

                    if (bindingsEl.TryGetProperty("options", out var optBind) && optBind.ValueKind == JsonValueKind.String)
                    {
                        var op = optBind.GetString()!;
                        if (!op.StartsWith("data.byKey.") && !op.StartsWith("form.options."))
                            errors.Add(new GovIssue("error", "GOV_BINDING_BAD_OPTIONS", $"options binding \"{op}\" not in allowlist", nodeId));
                    }

                    foreach (var bProp in bindingsEl.EnumerateObject())
                    {
                        if (bProp.Value.ValueKind == JsonValueKind.Object)
                            ValidateExpr(bProp.Value, errors, $"nodes.{nodeId}.bindings.{bProp.Name}", nodeId);
                    }
                }

                if (node.TryGetProperty("events", out var eventsEl) && eventsEl.ValueKind == JsonValueKind.Object)
                {
                    foreach (var evtProp in eventsEl.EnumerateObject())
                    {
                        if (!AllowedEventNames.Contains(evtProp.Name))
                            errors.Add(new GovIssue("error", "GOV_EVENT_UNKNOWN", $"Unknown event \"{evtProp.Name}\"", nodeId));

                        if (evtProp.Value.ValueKind == JsonValueKind.Array)
                            ValidateActions(evtProp.Value, errors, $"nodes.{nodeId}.events.{evtProp.Name}", nodeId);
                    }
                }
            }

            if (nodeCount > MaxNodes)
                errors.Add(new GovIssue("error", "GOV_TOO_MANY_NODES", $"Document has {nodeCount} nodes (max {MaxNodes})"));
        }

        if (doc.TryGetProperty("pageEvents", out var pe) && pe.TryGetProperty("onLoad", out var onLoad) && onLoad.ValueKind == JsonValueKind.Array)
            ValidateActions(onLoad, errors, "pageEvents.onLoad");

        return new GovernanceResult(errors.Count == 0, errors.ToArray(), warnings.ToArray());
    }

    private static void ValidateActions(JsonElement arr, List<GovIssue> issues, string basePath, string? nodeId = null)
    {
        int i = 0;
        foreach (var action in arr.EnumerateArray())
        {
            var aPath = $"{basePath}[{i}]";
            var aType = action.TryGetProperty("type", out var t) ? t.GetString() ?? "" : "";
            if (!AllowedActionTypes.Contains(aType))
                issues.Add(new GovIssue("error", "GOV_ACTION_UNKNOWN", $"Unknown action type \"{aType}\"", nodeId, aPath));

            if (aType == "SetValue" && action.TryGetProperty("path", out var pathEl))
            {
                var p = pathEl.GetString() ?? "";
                if (!AllowedSetValuePathPrefixes.Any(pfx => p.StartsWith(pfx)))
                    issues.Add(new GovIssue("error", "GOV_ACTION_BAD_PATH", $"SetValue path \"{p}\" not in allowlist", nodeId, aPath));
            }

            foreach (var nested in new[] { "actions", "then", "else", "onError", "onSuccess" })
            {
                if (action.TryGetProperty(nested, out var nestedArr) && nestedArr.ValueKind == JsonValueKind.Array)
                    ValidateActions(nestedArr, issues, $"{aPath}.{nested}", nodeId);
            }

            i++;
        }
    }

    private static void ValidateExpr(JsonElement expr, List<GovIssue> issues, string path, string? nodeId = null)
    {
        if (expr.ValueKind != JsonValueKind.Object) return;

        var (maxDepth, nodeCount) = MeasureExpr(expr, 1);
        if (maxDepth > MaxExprDepth)
            issues.Add(new GovIssue("error", "GOV_EXPR_TOO_DEEP", $"Expression depth {maxDepth} exceeds max {MaxExprDepth}", nodeId, path));
        if (nodeCount > MaxExprNodeCount)
            issues.Add(new GovIssue("error", "GOV_EXPR_TOO_LARGE", $"Expression has {nodeCount} nodes (max {MaxExprNodeCount})", nodeId, path));

        ValidateExprOps(expr, issues, path, nodeId);
    }

    private static void ValidateExprOps(JsonElement expr, List<GovIssue> issues, string path, string? nodeId)
    {
        if (expr.TryGetProperty("op", out var opEl))
        {
            var op = opEl.GetString() ?? "";
            if (!AllowedExprOps.Contains(op))
                issues.Add(new GovIssue("error", "GOV_EXPR_UNKNOWN_OP", $"Unknown expression op \"{op}\"", nodeId, path));
        }

        foreach (var child in new[] { "left", "right", "then", "else" })
        {
            if (expr.TryGetProperty(child, out var c) && c.ValueKind == JsonValueKind.Object)
                ValidateExprOps(c, issues, path, nodeId);
        }

        if (expr.TryGetProperty("args", out var args) && args.ValueKind == JsonValueKind.Array)
        {
            foreach (var arg in args.EnumerateArray())
            {
                if (arg.ValueKind == JsonValueKind.Object)
                    ValidateExprOps(arg, issues, path, nodeId);
            }
        }
    }

    private static (int MaxDepth, int NodeCount) MeasureExpr(JsonElement expr, int depth)
    {
        int maxD = depth;
        int count = 1;

        foreach (var child in new[] { "left", "right", "then", "else" })
        {
            if (expr.TryGetProperty(child, out var c) && c.ValueKind == JsonValueKind.Object)
            {
                var (d, n) = MeasureExpr(c, depth + 1);
                if (d > maxD) maxD = d;
                count += n;
            }
        }

        if (expr.TryGetProperty("args", out var args) && args.ValueKind == JsonValueKind.Array)
        {
            foreach (var arg in args.EnumerateArray())
            {
                if (arg.ValueKind == JsonValueKind.Object)
                {
                    var (d, n) = MeasureExpr(arg, depth + 1);
                    if (d > maxD) maxD = d;
                    count += n;
                }
            }
        }

        return (maxD, count);
    }

    private static bool IsUrlAllowed(string url, string[] allowedHosts)
    {
        if (url.StartsWith('/') || url.StartsWith("./") || url.StartsWith("../"))
            return true;

        if (url.StartsWith("/__mock__/"))
            return false;

        if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            foreach (var host in allowedHosts)
            {
                if (string.Equals(uri.Host, host, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        return true;
    }
}
