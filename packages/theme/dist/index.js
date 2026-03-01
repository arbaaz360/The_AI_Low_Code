import { createTheme } from "@mui/material/styles";
const baseOptions = {
    palette: {
        primary: { main: "#1565c0" },
        secondary: { main: "#7c4dff" },
        background: {
            default: "#f5f5f5",
            paper: "#ffffff",
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h6: { fontWeight: 600, fontSize: "1rem" },
        subtitle2: { fontWeight: 600, fontSize: "0.8125rem" },
        body2: { fontSize: "0.8125rem" },
        caption: { fontSize: "0.75rem" },
        button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    spacing: 8,
    components: {
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { borderRadius: 6 },
                sizeSmall: { fontSize: "0.75rem", padding: "4px 10px" },
            },
        },
        MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: { backgroundImage: "none" },
            },
        },
        MuiTextField: {
            defaultProps: { size: "small", variant: "outlined" },
        },
        MuiSelect: {
            defaultProps: { size: "small" },
        },
        MuiAppBar: {
            styleOverrides: {
                root: { backgroundImage: "none" },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: { textTransform: "none", fontWeight: 600, minHeight: 40 },
            },
        },
        MuiTabs: {
            styleOverrides: {
                root: { minHeight: 40 },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: { borderRadius: 4 },
            },
        },
    },
};
export function createPlatformTheme(overrides) {
    if (!overrides)
        return createTheme(baseOptions);
    return createTheme(baseOptions, overrides);
}
