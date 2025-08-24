import React, { useEffect, useRef } from 'react';
import { useNetworkStore } from '../store/networkStore';

interface NetworkProviderProps {
     children: React.ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
     const { initializeNetworkMonitoring, cleanupNetworkMonitoring } = useNetworkStore();
     const isInitialized = useRef(false);

     useEffect(() => {
          if (!isInitialized.current) {
               isInitialized.current = true;
               initializeNetworkMonitoring();

               return () => {
                    cleanupNetworkMonitoring();
                    isInitialized.current = false;
               };
          }
     }, [initializeNetworkMonitoring, cleanupNetworkMonitoring]);

     return <>{children}</>;
};
