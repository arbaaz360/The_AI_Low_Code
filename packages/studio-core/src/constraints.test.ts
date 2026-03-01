import { describe, it, expect } from "vitest";
import { isContainerType, canContain, isGridContainerType } from "./constraints.js";

describe("constraints", () => {
  describe("isContainerType", () => {
    it("returns true for FormGrid and layout.FormGrid", () => {
      expect(isContainerType("FormGrid")).toBe(true);
      expect(isContainerType("layout.FormGrid")).toBe(true);
    });
    it("returns true for Section and core.Section", () => {
      expect(isContainerType("Section")).toBe(true);
      expect(isContainerType("core.Section")).toBe(true);
    });
    it("returns true for Stack and layout.Stack", () => {
      expect(isContainerType("Stack")).toBe(true);
      expect(isContainerType("layout.Stack")).toBe(true);
    });
    it("returns false for leaf widgets", () => {
      expect(isContainerType("core.TextInput")).toBe(false);
      expect(isContainerType("core.Checkbox")).toBe(false);
      expect(isContainerType("core.Select")).toBe(false);
      expect(isContainerType("core.RadioGroup")).toBe(false);
    });
  });

  describe("canContain", () => {
    it("allows FormGrid to contain Section and TextInput", () => {
      expect(canContain("FormGrid", "core.Section")).toBe(true);
      expect(canContain("FormGrid", "core.TextInput")).toBe(true);
    });
    it("allows Section to contain TextInput", () => {
      expect(canContain("core.Section", "core.TextInput")).toBe(true);
      expect(canContain("Section", "core.Checkbox")).toBe(true);
    });
    it("disallows TextInput from containing anything", () => {
      expect(canContain("core.TextInput", "core.Section")).toBe(false);
      expect(canContain("core.TextInput", "core.TextInput")).toBe(false);
    });
    it("disallows Checkbox, Select, RadioGroup from containing", () => {
      expect(canContain("core.Checkbox", "core.TextInput")).toBe(false);
      expect(canContain("core.Select", "core.Section")).toBe(false);
      expect(canContain("core.RadioGroup", "core.TextInput")).toBe(false);
    });
  });

  describe("isGridContainerType", () => {
    it("returns true for FormGrid and Section", () => {
      expect(isGridContainerType("FormGrid")).toBe(true);
      expect(isGridContainerType("layout.FormGrid")).toBe(true);
      expect(isGridContainerType("core.Section")).toBe(true);
      expect(isGridContainerType("Section")).toBe(true);
    });
    it("returns false for Stack and leaf widgets", () => {
      expect(isGridContainerType("layout.Stack")).toBe(false);
      expect(isGridContainerType("core.TextInput")).toBe(false);
    });
  });
});
