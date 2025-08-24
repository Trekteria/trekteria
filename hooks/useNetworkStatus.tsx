import { useNetworkStore } from '../store/networkStore';

export const useNetworkStatus = () => {
     const { isOnline } = useNetworkStore();

     return {
          isOnline,
          isOffline: isOnline === false,
     };
};
