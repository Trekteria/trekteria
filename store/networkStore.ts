import { create } from "zustand";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

interface NetworkState {
  // Simple online/offline status
  isOnline: boolean | null;

  // Actions
  updateNetworkStatus: (state: NetInfoState) => void;
  initializeNetworkMonitoring: () => void;
  cleanupNetworkMonitoring: () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  // Initial state
  isOnline: null,

  // Actions
  updateNetworkStatus: (state: NetInfoState) => {
    const isOnline =
      state.isConnected === true && state.isInternetReachable === true;
    const currentState = get();

    // Only log if status actually changed
    if (currentState.isOnline !== isOnline) {
      console.log("Network:", isOnline ? "🟢 ONLINE" : "🔴 OFFLINE");
    }

    set({ isOnline });
  },

  initializeNetworkMonitoring: () => {
    console.log("Starting network monitoring...");

    // Get initial state
    NetInfo.fetch().then((state) => {
      get().updateNetworkStatus(state);
    });

    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      get().updateNetworkStatus(state);
    });

    // Store unsubscribe function
    (get() as any).unsubscribe = unsubscribe;
  },

  cleanupNetworkMonitoring: () => {
    const unsubscribe = (get() as any).unsubscribe;
    if (unsubscribe) {
      unsubscribe();
    }
  },
}));
