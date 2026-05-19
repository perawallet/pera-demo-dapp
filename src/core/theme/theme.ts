import {createTheme} from "@mui/material/styles";

const PERA_YELLOW = "#FFEE55";
const PERA_INK = "#0F172A"; // slate-900, reads cleanly on yellow

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {main: "#1f2937"}, // slate-800
    secondary: {main: "#7c3aed"}, // violet-600
    background: {default: "#f9fafb", paper: "#ffffff"}
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif"
    ].join(","),
    h6: {fontWeight: 600, letterSpacing: -0.2}
  },
  shape: {borderRadius: 8},
  components: {
    MuiButton: {defaultProps: {disableElevation: true}},
    MuiAppBar: {
      defaultProps: {elevation: 1, color: "default"},
      styleOverrides: {
        colorDefault: {
          backgroundColor: PERA_YELLOW,
          color: PERA_INK
        }
      }
    }
  }
});

export default theme;
