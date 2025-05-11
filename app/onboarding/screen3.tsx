import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OnboardingScreen3() {
  const router = useRouter();

  const handleGetStarted = async () => {
    try {
      // Mark onboarding as completed in AsyncStorage
      await AsyncStorage.setItem("hasCompletedOnboarding", "true");

      // Navigate to the authentication screen
      router.replace("/auth");
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      // Still try to navigate even if saving fails
      router.replace("/auth");
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/onboarding3.png")}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Explore Responsibly & Have Fun</Text>
        <Text style={styles.description}>
          Turn your trips into a game! Complete missions, earn rewards, and
          leave no trace behind. Adventure, but make it fun!
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressIndicatorActive}></View>
        <View style={styles.progressIndicatorActive}></View>
        <View style={styles.progressIndicatorActive}></View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "flex-end",
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    padding: 20,
    marginTop: 10,
  },
  title: {
    ...Typography.text.h1,
    color: "white",
    marginBottom: 10,
  },
  description: {
    ...Typography.text.body,
    color: "white",
    opacity: 0.8,
    lineHeight: 24,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 10,
  },
  progressIndicatorActive: {
    width: 50,
    height: 4,
    borderRadius: 3,
    backgroundColor: "white",
    marginHorizontal: 5,
  },
  progressIndicatorInactive: {
    width: 50,
    height: 4,
    borderRadius: 3,
    backgroundColor: Colors.inactive,
    marginHorizontal: 5,
  },
  button: {
    backgroundColor: "#85CA7B",
    padding: 20,
    borderRadius: 100,
    alignItems: "center",
    margin: 20,
    marginBottom: 40,
  },
  buttonText: {
    ...Typography.text.button,
    color: Colors.black,
  },
});
