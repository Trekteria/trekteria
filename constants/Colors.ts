/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";
const primaryColor = "#1D6A54"; // TrailMate primary green color
const primaryColorDark = "#1D6A54"; // Slightly lighter green for dark mode
const blackColor = "#232323"; // TrailMate black color (instead of pure black)
const whiteColor = "#FAFAFA";
const darkBackgroundColor = "#1A1A1A"; // Darker background for dark mode
const inactiveColor = "#A3A3A3";
const inactiveColorDark = "#666666"; // Darker gray for dark mode inactive elements
const darkModeTextColor = "#ECEDEE";
const borderColorLight = "#E0E0E0";
const borderColorDark = "#3A3A3A";

export const Colors = {
  primary: primaryColor, // Add primary color for easy access
  black: blackColor, // Add black color for easy access
  white: whiteColor,
  inactive: inactiveColor,
  light: {
    text: blackColor, // Changed to use our custom black
    background: "#FAFAFA",
    tint: primaryColor, // Changed to use primary green
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: primaryColor, // Changed to use primary green
    primary: primaryColor, // Add primary color to light theme
    black: blackColor, // Add black color to light theme
    borderColor: borderColorLight,
    card: "#F9F9F9", // Light card background
    buttonBackground: primaryColor,
    buttonText: "#FFFFFF",
    inactive: inactiveColor,
  },
  dark: {
    text: darkModeTextColor,
    background: darkBackgroundColor, // Changed to use a darker background for dark mode
    tint: primaryColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: primaryColorDark,
    primary: primaryColorDark, // Slightly lighter primary for dark mode
    black: blackColor, // Add black color to dark theme
    borderColor: borderColorDark,
    card: "#2C2C2C", // Dark card background
    buttonBackground: primaryColor,
    buttonText: "#FFFFFF",
    inactive: inactiveColorDark,
  },
};
