/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";
const primaryColor = "#42643D"; // TrailMate primary green color
const blackColor = "#232323"; // TrailMate black color (instead of pure black)
const inactiveColor = "#A3A3A3";

export const Colors = {
  primary: primaryColor, // Add primary color for easy access
  black: blackColor, // Add black color for easy access
  inactive: inactiveColor,
  light: {
    text: blackColor, // Changed to use our custom black
    background: "#fff",
    tint: primaryColor, // Changed to use primary green
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: primaryColor, // Changed to use primary green
    primary: primaryColor, // Add primary color to light theme
    black: blackColor, // Add black color to light theme
  },
  dark: {
    text: "#ECEDEE",
    background: blackColor, // Changed to use our custom black for dark mode background
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    primary: primaryColor, // Add primary color to dark theme
    black: blackColor, // Add black color to dark theme
  },
};
