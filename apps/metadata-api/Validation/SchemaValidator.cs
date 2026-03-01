using NJsonSchema;

namespace MetadataApi.Validation;

public class SchemaValidator
{
    private readonly JsonSchema _schema;

    private SchemaValidator(JsonSchema schema) => _schema = schema;

    public static async Task<SchemaValidator> CreateAsync()
    {
        var schemaPath = Path.Combine(AppContext.BaseDirectory, "Schemas", "formdoc.schema.json");
        var schemaJson = await File.ReadAllTextAsync(schemaPath);
        var schema = await JsonSchema.FromJsonAsync(schemaJson);
        return new SchemaValidator(schema);
    }

    public (bool Ok, string[] Errors) Validate(string json)
    {
        var errors = _schema.Validate(json);
        if (errors.Count == 0)
            return (true, []);

        var msgs = errors.Select(e => $"{e.Path}: {e.Kind}").ToArray();
        return (false, msgs);
    }
}
