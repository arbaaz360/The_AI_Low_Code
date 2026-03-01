import { FormGrid } from "./FormGrid.js";
import { Section } from "./Section.js";
import { TextInput } from "./TextInput.js";
import { TextArea } from "./TextArea.js";
import { NumberInput } from "./NumberInput.js";
import { DateInput } from "./DateInput.js";
import { Checkbox } from "./Checkbox.js";
import { Switch } from "./Switch.js";
import { Select } from "./Select.js";
import { RadioGroup } from "./RadioGroup.js";
import { Stack } from "./Stack.js";
import { Button } from "./Button.js";
export const defaultRegistry = {
    // Canonical container IDs
    "layout.FormGrid": FormGrid,
    "layout.Section": Section,
    "layout.Stack": Stack,
    // Canonical input IDs
    "core.TextInput": TextInput,
    "core.TextArea": TextArea,
    "core.NumberInput": NumberInput,
    "core.DateInput": DateInput,
    "core.Checkbox": Checkbox,
    "core.Switch": Switch,
    "core.Select": Select,
    "core.RadioGroup": RadioGroup,
    "core.Button": Button,
    // Legacy aliases for backward compat
    FormGrid: FormGrid,
    "core.Section": Section,
    Section: Section,
    Stack: Stack,
};
export { FormGrid, Section, TextInput, TextArea, NumberInput, DateInput, Checkbox, Switch, Select, RadioGroup, Stack, Button, };
export { getPropSchema } from "./propertySchemas.js";
export { mapFieldToWidget } from "./fieldMapping.js";
