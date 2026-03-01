import { FormGrid } from "./FormGrid.js";
import { Section } from "./Section.js";
import { TextInput } from "./TextInput.js";
import { Checkbox } from "./Checkbox.js";
import { Select } from "./Select.js";
import { RadioGroup } from "./RadioGroup.js";
import { Stack } from "./Stack.js";
export const defaultRegistry = {
    "layout.FormGrid": FormGrid,
    FormGrid: FormGrid,
    "core.Section": Section,
    Section: Section,
    "core.TextInput": TextInput,
    "core.Checkbox": Checkbox,
    "core.Select": Select,
    "core.RadioGroup": RadioGroup,
    "layout.Stack": Stack,
    Stack,
};
export { FormGrid, Section, TextInput, Checkbox, Select, RadioGroup, Stack };
export { getPropSchema } from "./propertySchemas.js";
export { mapFieldToWidget } from "./fieldMapping.js";
