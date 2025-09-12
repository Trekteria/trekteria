import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";
import { Typography } from "../../constants/Typography";
import { supabase } from "../../services/supabaseConfig";
import { useColorScheme } from "../../hooks/useColorScheme";
import { useTemperatureUnit } from "../../hooks/useTemperatureUnit";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Share } from "react-native";
import { trackScreen, trackEvent, analyticsService } from "../../services/analyticsService";
import { sqliteService } from "../../services/database/sqliteService";

// Function to check if user is logged in via OAuth (Google)
const isOAuthUser = (user: any): boolean => {
  if (!user) return false;

  // Check if user has identities (OAuth users have identities)
  if (user.identities && user.identities.length > 0) {
    // Check if any identity is from Google
    return user.identities.some((identity: any) =>
      identity.provider === 'google'
    );
  }

  // Fallback: check app_metadata for provider
  if (user.app_metadata && user.app_metadata.provider) {
    return user.app_metadata.provider === 'google';
  }

  return false;
};

export default function SettingsPage() {
  const router = useRouter();
  const { colorScheme, setColorScheme, effectiveColorScheme } = useColorScheme();
  const { temperatureUnit, setTemperatureUnit } = useTemperatureUnit();
  const { isOnline } = useNetworkStatus();
  const isDarkMode = effectiveColorScheme === 'dark';
  const [measurementUnit, setMeasurementUnit] = useState("Imperial");
  const [showTemperatureModal, setShowTemperatureModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isOAuth, setIsOAuth] = useState(false);

  // Track screen view
  useEffect(() => {
    trackScreen('settings');
  }, []);

  // Check if user is OAuth user on component mount
  useEffect(() => {
    const checkUserAuthType = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (user) {
          setIsOAuth(isOAuthUser(user));
        }
      } catch (error) {
        console.error('Error checking user auth type:', error);
      }
    };

    checkUserAuthType();
  }, []);

  const handleLogout = async () => {
    try {
      trackEvent('settings_logout_clicked', {
        category: 'authentication'
      });

      const { error } = await supabase.auth.signOut();
      if (error) {
        trackEvent('settings_logout_failed', {
          error_message: error.message,
          category: 'authentication'
        });
        Alert.alert("Error", "Failed to log out. Please try again.");
      } else {
        trackEvent('settings_logout_success', {
          category: 'authentication'
        });

        // Clear local SQLite data
        try {
          await sqliteService.clearAllData();
          console.log('🗑️ Local SQLite data cleared successfully');
        } catch (error) {
          console.warn('⚠️ Failed to clear local SQLite data:', error);
        }

        analyticsService.clearUser();
        router.replace("/auth");
      }
    } catch (error) {
      trackEvent('settings_logout_failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        category: 'authentication'
      });
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      trackEvent('settings_delete_account_clicked', {
        category: 'authentication'
      });

      // Show first confirmation dialog
      Alert.alert(
        "Delete Account",
        "Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              // Show second confirmation dialog
              Alert.alert(
                "Final Confirmation",
                "This will permanently delete your account and all associated data. Type 'DELETE' to confirm.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "DELETE",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        // Get current user
                        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
                        if (getUserError || !user) {
                          throw new Error('Failed to get user information');
                        }

                        const userId = user.id;

                        // Delete all user data from Supabase tables first
                        try {
                          // Delete user's feedback
                          const { error: feedbackError } = await supabase
                            .from('feedback')
                            .delete()
                            .eq('userId', userId);

                          if (feedbackError) {
                            console.warn('Failed to delete feedback:', feedbackError);
                          }

                          // Delete user's trips
                          const { error: tripsError } = await supabase
                            .from('trips')
                            .delete()
                            .eq('userId', userId);

                          if (tripsError) {
                            console.warn('Failed to delete trips:', tripsError);
                          }

                          // Delete user's plans
                          const { error: plansError } = await supabase
                            .from('plans')
                            .delete()
                            .eq('userId', userId);

                          if (plansError) {
                            console.warn('Failed to delete plans:', plansError);
                          }

                          // Delete user profile
                          const { error: userError } = await supabase
                            .from('users')
                            .delete()
                            .eq('user_id', userId);

                          if (userError) {
                            console.warn('Failed to delete user profile:', userError);
                          }

                          console.log('✅ User data deleted from Supabase');
                        } catch (error) {
                          console.warn('⚠️ Failed to delete some user data from Supabase:', error);
                          // Continue with deletion process even if some data deletion fails
                        }

                        // Clear local SQLite data
                        try {
                          await sqliteService.clearAllData();
                          console.log('🗑️ Local SQLite data cleared successfully');
                        } catch (error) {
                          console.warn('⚠️ Failed to clear local SQLite data:', error);
                        }

                        // Try to call RPC function to delete user account
                        // This requires a Supabase database function to be created
                        try {
                          const { error: rpcError } = await supabase.rpc('delete_user_account', {
                            user_id: userId
                          });

                          if (rpcError) {
                            console.warn('⚠️ RPC delete function not available or failed:', rpcError);
                            // Fallback: Sign out the user (data already deleted above)
                            const { error: signOutError } = await supabase.auth.signOut();
                            if (signOutError) {
                              throw signOutError;
                            }
                            console.log('✅ User signed out (RPC delete not available)');
                          } else {
                            console.log('✅ User account fully deleted via RPC function');
                          }
                        } catch (error) {
                          console.warn('⚠️ RPC delete not available, signing out instead:', error);
                          // Fallback: Sign out the user
                          const { error: signOutError } = await supabase.auth.signOut();
                          if (signOutError) {
                            throw signOutError;
                          }
                        }

                        trackEvent('settings_delete_account_success', {
                          category: 'authentication'
                        });

                        analyticsService.clearUser();

                        Alert.alert(
                          "Account Deleted",
                          "Your account has been successfully deleted. You will now be redirected to the login screen.",
                          [
                            {
                              text: "OK",
                              onPress: () => router.replace("/auth")
                            }
                          ]
                        );
                      } catch (error) {
                        trackEvent('settings_delete_account_failed', {
                          error_message: error instanceof Error ? error.message : 'Unknown error',
                          category: 'authentication'
                        });
                        Alert.alert(
                          "Error",
                          "Failed to delete account. Please try again or contact support if the problem persists."
                        );
                      }
                    }
                  }
                ]
              );
            }
          }
        ]
      );
    } catch (error) {
      trackEvent('settings_delete_account_failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        category: 'authentication'
      });
      Alert.alert("Error", "Failed to initiate account deletion. Please try again.");
    }
  };

  // Get the appropriate theme colors
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const handleAppShare = async () => {
    try {
      const result = await Share.share({
        title: "TrailMate - Your Hiking Companion",
        message: "TrailMate is a great hiking companion! Download it here: https://yourappstorelink.com",
        url: "https://yourappstorelink.com", // optional on Android
      });

      // Optional: check result.action to see if shared or dismissed
    } catch (error) {
      console.error("Error sharing app:", error);
    }
  };


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons
              name="chevron-back"
              size={28}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: theme.primary }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
        {/* Preferences Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Preferences</Text>

        {/* Theme Selection */}
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => setShowThemeModal(true)}
        >
          <Text style={[styles.label, { color: theme.text }]}>Theme</Text>
          <View style={styles.valueContainer}>
            <Text style={[styles.value, { color: theme.icon }]}>
              {colorScheme === 'system' ? 'System' : colorScheme === 'dark' ? 'Dark' : 'Light'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.icon} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => setShowTemperatureModal(true)}
        >
          <Text style={[styles.label, { color: theme.text }]}>Temperature</Text>
          <View style={styles.valueContainer}>
            <Text style={[styles.value, { color: theme.icon }]}>{temperatureUnit}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.icon} />
          </View>
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => setShowUnitModal(true)}
        >
          <Text style={[styles.label, { color: theme.text }]}>Unit</Text>
          <View style={styles.valueContainer}>
            <Text style={[styles.value, { color: theme.icon }]}>{measurementUnit}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.icon} />
          </View>
        </TouchableOpacity> */}

        {/* Account Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Account</Text>
        <TouchableOpacity
          style={[
            styles.row,
            {
              borderBottomColor: theme.borderColor,
              opacity: isOnline ? 1 : 0.5
            }
          ]}
          onPress={() => {
            if (isOnline) {
              router.push("/(app)/settings/change-name");
            } else {
              Alert.alert(
                "Offline Mode",
                "Name changes are not available while offline. Please connect to the internet to update your name.",
                [{ text: "OK" }]
              );
            }
          }}
        >
          <Text style={[styles.label, { color: theme.text }]}>Change name</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={[
            styles.row,
            {
              borderBottomColor: theme.borderColor,
              opacity: isOAuth ? 0.5 : 1
            }
          ]}
          onPress={() => {
            if (!isOAuth) {
              router.push("/(app)/settings/change-email");
            } else {
              Alert.alert(
                "Email Change Not Available",
                "Email changes are not available for Google sign-in accounts. Please manage your email through your Google account settings.",
                [{ text: "OK" }]
              );
            }
          }}
        >
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Change email</Text>
          </View>
        </TouchableOpacity> */}
        <TouchableOpacity
          style={[
            styles.row,
            {
              borderBottomColor: theme.borderColor,
              opacity: isOAuth ? 0.5 : (isOnline ? 1 : 0.5)
            }
          ]}
          onPress={() => {
            if (!isOnline) {
              Alert.alert(
                "Offline Mode",
                "Password changes are not available while offline. Please connect to the internet to update your password.",
                [{ text: "OK" }]
              );
            } else if (!isOAuth) {
              router.push("/(app)/settings/change-password");
            } else {
              Alert.alert(
                "Password Change Not Available",
                "Password changes are not available for Google sign-in accounts. Please manage your password through your Google account settings.",
                [{ text: "OK" }]
              );
            }
          }}
        >
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Change password</Text>
          </View>
        </TouchableOpacity>

        {/* Temperature Selection Modal */}
        <Modal
          visible={showTemperatureModal}
          transparent={true}
          animationType="slide"
        >
          <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Temperature Unit</Text>

              <TouchableOpacity
                style={[
                  styles.modalOption,
                  temperatureUnit === "°F" && { backgroundColor: Colors.primary + '20' }
                ]}
                onPress={() => {
                  trackEvent('settings_temperature_unit_changed', {
                    new_unit: '°F',
                    previous_unit: temperatureUnit,
                    category: 'preferences'
                  });
                  setTemperatureUnit("°F");
                  setShowTemperatureModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: theme.text }]}>Fahrenheit (°F)</Text>
                {temperatureUnit === "°F" && (
                  <Ionicons name="checkmark" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalOption,
                  temperatureUnit === "°C" && { backgroundColor: Colors.primary + '20' }
                ]}
                onPress={() => {
                  trackEvent('settings_temperature_unit_changed', {
                    new_unit: '°C',
                    previous_unit: temperatureUnit,
                    category: 'preferences'
                  });
                  setTemperatureUnit("°C");
                  setShowTemperatureModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: theme.text }]}>Celsius (°C)</Text>
                {temperatureUnit === "°C" && (
                  <Ionicons name="checkmark" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: theme.buttonBackground }]}
                onPress={() => setShowTemperatureModal(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Unit Selection Modal */}
        <Modal
          visible={showUnitModal}
          transparent={true}
          animationType="slide"
        >
          <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Measurement Unit</Text>

              <TouchableOpacity
                style={[
                  styles.modalOption,
                  measurementUnit === "Imperial" && { backgroundColor: Colors.primary + '20' }
                ]}
                onPress={() => {
                  setMeasurementUnit("Imperial");
                  setShowUnitModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: theme.text }]}>Imperial (miles, feet)</Text>
                {measurementUnit === "Imperial" && (
                  <Ionicons name="checkmark" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalOption,
                  measurementUnit === "Metric" && { backgroundColor: Colors.primary + '20' }
                ]}
                onPress={() => {
                  setMeasurementUnit("Metric");
                  setShowUnitModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: theme.text }]}>Metric (kilometers, meters)</Text>
                {measurementUnit === "Metric" && (
                  <Ionicons name="checkmark" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowUnitModal(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Theme Selection Modal */}
        <Modal
          visible={showThemeModal}
          transparent={true}
          animationType="slide"
        >
          <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Theme</Text>

              <TouchableOpacity
                style={[
                  styles.modalOption,
                  colorScheme === "light" && { backgroundColor: Colors.primary + '20' }
                ]}
                onPress={() => {
                  trackEvent('settings_theme_changed', {
                    new_theme: 'light',
                    previous_theme: colorScheme,
                    category: 'preferences'
                  });
                  setColorScheme("light");
                  setShowThemeModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: theme.text }]}>Light</Text>
                {colorScheme === "light" && (
                  <Ionicons name="checkmark" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalOption,
                  colorScheme === "dark" && { backgroundColor: Colors.primary + '20' }
                ]}
                onPress={() => {
                  trackEvent('settings_theme_changed', {
                    new_theme: 'dark',
                    previous_theme: colorScheme,
                    category: 'preferences'
                  });
                  setColorScheme("dark");
                  setShowThemeModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: theme.text }]}>Dark</Text>
                {colorScheme === "dark" && (
                  <Ionicons name="checkmark" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalOption,
                  colorScheme === "system" && { backgroundColor: Colors.primary + '20' }
                ]}
                onPress={() => {
                  trackEvent('settings_theme_changed', {
                    new_theme: 'system',
                    previous_theme: colorScheme,
                    category: 'preferences'
                  });
                  setColorScheme("system");
                  setShowThemeModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: theme.text }]}>System</Text>
                {colorScheme === "system" && (
                  <Ionicons name="checkmark" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: theme.buttonBackground }]}
                onPress={() => setShowThemeModal(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Support Section */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Support</Text>

        {/* Share with friends */}
        {/* <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => router.push("/result")}
        >
          <Text style={[styles.label, { color: theme.text }]}>Share with friends</Text>
        </TouchableOpacity> */}

        {/* <TouchableOpacity onPress={handleAppShare} style={[styles.row, { borderBottomColor: theme.borderColor }]}>
          <Text style={[styles.label, { color: theme.text }]}>Share TrailMate with Friends</Text>
        </TouchableOpacity> */}

        {/* Feedback */}
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => router.push("/(app)/settings/feedback")}
        >
          <Text style={[styles.label, { color: theme.text }]}>Feedback</Text>
        </TouchableOpacity>

        {/* Rate the app */}
        {/* <TouchableOpacity
          style={[styles.row, { borderBottomColor: theme.borderColor }]}
          onPress={() => router.push("/result")}
        >
          <Text style={[styles.label, { color: theme.text }]}>Rate on App Store</Text>
        </TouchableOpacity> */}

        {/* Delete Account Button */}
        <TouchableOpacity
          style={[
            styles.deleteAccountButton,
            {
              backgroundColor: 'transparent',
              borderColor: '#FF4444',
              borderWidth: 2,
              opacity: isOnline ? 1 : 0.5
            }
          ]}
          onPress={() => {
            if (!isOnline) {
              Alert.alert(
                "Offline Mode",
                "Account deletion is not available while offline. Please connect to the internet to delete your account.",
                [{ text: "OK" }]
              );
            } else {
              handleDeleteAccount();
            }
          }}
        >
          <Text style={[styles.deleteAccountText, { color: '#FF4444' }]}>Delete Account</Text>
        </TouchableOpacity>

        {/* Log Out Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.buttonBackground }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutText, { color: theme.buttonText }]}>Log Out</Text>
        </TouchableOpacity>

        {/* Footer Version */}
        {/* <Text style={[styles.version, { color: theme.icon }]}>1.0.0</Text> */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
  },
  container: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    ...Typography.text.h1, // 42px, Montserrat, medium weight
  },
  sectionHeader: {
    ...Typography.text.h2, // 25px, Montserrat
    marginTop: 20,
    marginBottom: 10,
  },
  row: {
    borderBottomWidth: 1,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    ...Typography.text.body, // 16px, OpenSans
  },
  value: {
    ...Typography.text.body, // same as label, but with gray override
  },
  deleteAccountButton: {
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: "center",
  },
  deleteAccountText: {
    ...Typography.text.button, // 18px, Montserrat, bold
  },
  logoutButton: {
    marginTop: 15,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: "center",
  },
  logoutText: {
    ...Typography.text.button, // 18px, Montserrat, bold
  },
  version: {
    ...Typography.text.caption, // 12px, OpenSans
    textAlign: "center",
    marginTop: 20,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    ...Typography.text.h3,
    marginBottom: 20,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 100,
    marginBottom: 10,
  },
  modalOptionText: {
    ...Typography.text.body,
  },
  modalCloseButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 100,
    backgroundColor: Colors.primary,
  },
  modalCloseText: {
    ...Typography.text.button,
    color: "white",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  oauthNote: {
    ...Typography.text.caption,
    marginLeft: 5,
  },
  oauthInfo: {
    ...Typography.text.caption,
    marginBottom: 10,
  },
});
