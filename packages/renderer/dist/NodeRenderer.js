import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useActionRunner } from "./ActionRunnerContext.js";
function humanize(id) {
    return id.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}
function resolveLabel(node, mode) {
    if (typeof node.props?.label === "string")
        return node.props.label;
    if (typeof node.bindings?.label === "string")
        return node.bindings.label;
    if (mode === "design")
        return humanize(node.id);
    return undefined;
}
const BOOLEAN_WIDGET_TYPES = new Set(["core.Checkbox", "core.Switch"]);
const IDENTITY_SELECTOR = () => undefined;
const EMPTY_ERRORS = [];
const EMPTY_ERRORS_SELECTOR = () => EMPTY_ERRORS;
export function NodeRenderer({ nodeId, doc, engine, registry, mode }) {
    const dispatch = useDispatch();
    const actionRunner = useActionRunner();
    const node = doc.nodes[nodeId];
    const valuePath = node && typeof node.bindings?.value === "string" ? node.bindings.value : undefined;
    const optionsPath = node && typeof node.bindings?.options === "string" ? node.bindings.options : undefined;
    const valueSelector = useMemo(() => (valuePath ? engine.selectors.makeSelectValue(valuePath) : IDENTITY_SELECTOR), [valuePath, engine.selectors]);
    const optionsSelector = useMemo(() => {
        if (!optionsPath)
            return IDENTITY_SELECTOR;
        if (optionsPath.startsWith("data.byKey.")) {
            const key = optionsPath.slice("data.byKey.".length);
            return engine.selectors.makeSelectDataByKey(key);
        }
        return engine.selectors.makeSelectValue(optionsPath);
    }, [optionsPath, engine.selectors]);
    const errorsSelector = useMemo(() => (valuePath ? engine.selectors.makeSelectError(valuePath) : EMPTY_ERRORS_SELECTOR), [valuePath, engine.selectors]);
    const visible = useSelector(engine.selectors.makeSelectNodeVisible(nodeId));
    const disabled = useSelector(engine.selectors.makeSelectNodeDisabled(nodeId));
    const value = useSelector(valueSelector);
    const options = useSelector(optionsSelector);
    const errors = useSelector(errorsSelector);
    const hasExplicitOnChange = Boolean(node?.events?.onChange && node.events.onChange.length > 0);
    const hasExplicitOnClick = Boolean(node?.events?.onClick && node.events.onClick.length > 0);
    const hasExplicitOnBlur = Boolean(node?.events?.onBlur && node.events.onBlur.length > 0);
    const isBoolean = node ? BOOLEAN_WIDGET_TYPES.has(node.type) : false;
    const nodeType = node?.type ?? "";
    const handleChange = useCallback((v) => {
        if (hasExplicitOnChange && actionRunner && node) {
            actionRunner.run(node.events.onChange, {
                nodeId,
                nodeType,
                eventPayload: isBoolean ? { checked: Boolean(v), value: v } : { value: v },
                mode,
            });
        }
        else if (valuePath) {
            dispatch(engine.actions.setValue({ path: valuePath, value: v }));
        }
    }, [hasExplicitOnChange, actionRunner, node, nodeId, nodeType, valuePath, dispatch, engine.actions, mode, isBoolean]);
    const handleClick = useCallback(() => {
        if (hasExplicitOnClick && actionRunner && node) {
            actionRunner.run(node.events.onClick, {
                nodeId,
                nodeType,
                eventPayload: {},
                mode,
            });
        }
    }, [hasExplicitOnClick, actionRunner, node, nodeId, nodeType, mode]);
    const handleBlur = useCallback(() => {
        if (hasExplicitOnBlur && actionRunner && node) {
            actionRunner.run(node.events.onBlur, {
                nodeId,
                nodeType,
                eventPayload: { value },
                mode,
            });
        }
    }, [hasExplicitOnBlur, actionRunner, node, nodeId, nodeType, mode, value]);
    if (!node)
        return null;
    if (!visible)
        return null;
    const Widget = registry[node.type];
    if (!Widget) {
        return (_jsxs("div", { "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? node.type : undefined, children: ["[Unknown: ", node.type, "]"] }));
    }
    const widgetProps = {
        nodeId,
        nodeType: node.type,
        props: node.props,
        layout: node.layout,
        doc,
        value,
        onChange: (valuePath || hasExplicitOnChange) ? handleChange : undefined,
        onClick: hasExplicitOnClick ? handleClick : undefined,
        onBlur: hasExplicitOnBlur ? handleBlur : undefined,
        disabled,
        error: errors,
        label: resolveLabel(node, mode),
        options: options ?? node.props?.options,
        mode,
    };
    if (node.children && node.children.length > 0) {
        return (_jsx(Widget, { ...widgetProps, children: node.children.map((cid) => (_jsx(NodeRenderer, { nodeId: cid, doc: doc, engine: engine, registry: registry, mode: mode }, cid))) }));
    }
    return _jsx(Widget, { ...widgetProps });
}
