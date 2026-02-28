import type { WidgetRegistry } from "@ai-low-code/renderer";
import { FormGrid } from "./FormGrid.js";
import { Section } from "./Section.js";
import { TextInput } from "./TextInput.js";
import { Checkbox } from "./Checkbox.js";
import { Select } from "./Select.js";
import { RadioGroup } from "./RadioGroup.js";

export const defaultRegistry: WidgetRegistry = {
  "layout.FormGrid": FormGrid,
  FormGrid: FormGrid,
  "core.Section": Section,
  Section: Section,
  "core.TextInput": TextInput,
  "core.Checkbox": Checkbox,
  "core.Select": Select,
  "core.RadioGroup": RadioGroup,
};

export { FormGrid, Section, TextInput, Checkbox, Select, RadioGroup };
