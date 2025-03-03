import { TextStyle } from "react-native";
import { Colors } from "./Colors";

export const Typography = {
  // Font families
  fontFamily: {
    regular: "Montserrat",
    italic: "Montserrat-Italic",
  },

  // Font sizes
  fontSize: {
    small: 12,
    medium: 16,
    large: 20,
    xlarge: 24,
    xxlarge: 32,
  },

  // Text styles
  text: {
    // Headings
    h1: {
      fontFamily: "Montserrat",
      fontSize: 42,
      fontWeight: "500",
      color: Colors.black,
    } as TextStyle,

    h2: {
      fontFamily: "Montserrat",
      fontSize: 25,
      fontWeight: "500",
      color: Colors.black,
    } as TextStyle,

    h3: {
      fontFamily: "Montserrat",
      fontSize: 20,
      fontWeight: "500",
      color: Colors.black,
    } as TextStyle,

    h4: {
      fontFamily: "Montserrat",
      fontSize: 16,
      fontWeight: "500",
      color: Colors.black,
    } as TextStyle,

    // Body text
    body: {
      fontFamily: "OpenSans",
      fontSize: 16,
      fontWeight: "400",
      color: Colors.black,
    } as TextStyle,

    bodySmall: {
      fontFamily: "OpenSans",
      fontSize: 14,
      fontWeight: "400",
      color: Colors.black,
    } as TextStyle,

    // Button text
    button: {
      fontFamily: "Montserrat",
      fontSize: 18,
      fontWeight: "700",
      color: "white",
    } as TextStyle,

    // Other styles
    caption: {
      fontFamily: "OpenSans",
      fontSize: 12,
      fontWeight: "400",
      color: "#666",
    } as TextStyle,

    link: {
      fontFamily: "OpenSans",
      fontSize: 16,
      fontWeight: "400",
      color: Colors.primary,
      textDecorationLine: "underline",
    } as TextStyle,
  },
};
