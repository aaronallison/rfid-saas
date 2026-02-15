import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface LocationError {
  code: string;
  message: string;
}

export type LocationResult = {
  success: true;
  data: LocationCoords;
} | {
  success: false;
  error: LocationError;
};

export class LocationService {
  private static permissionGranted: boolean | null = null;
  private static watchId: Location.LocationSubscription | null = null;

  /**
   * Request location permissions from the user
   * @returns Promise<boolean> - true if permission granted, false otherwise
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      // Check if location services are enabled first
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        console.warn('Location services are disabled');
        this.permissionGranted = false;
        return false;
      }

      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus === 'granted') {
        this.permissionGranted = true;
        return true;
      }
      
      this.permissionGranted = false;
      return false;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      this.permissionGranted = false;
      return false;
    }
  }

  /**
   * Get current location coordinates
   * @param options - Location request options
   * @returns Promise<LocationResult> - Location data or error
   */
  static async getCurrentLocation(options?: {
    accuracy?: Location.Accuracy;
    timeout?: number;
    maximumAge?: number;
  }): Promise<LocationResult> {
    try {
      // Check and request permissions if needed
      if (this.permissionGranted === null || this.permissionGranted === false) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
          return {
            success: false,
            error: {
              code: 'PERMISSION_DENIED',
              message: 'Location permission is required to get current location'
            }
          };
        }
      }

      // Verify location services are still enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        return {
          success: false,
          error: {
            code: 'SERVICES_DISABLED',
            message: 'Location services are disabled on this device'
          }
        };
      }

      const locationOptions: Location.LocationOptions = {
        accuracy: options?.accuracy || Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
      };

      // Add timeout if provided
      if (options?.timeout) {
        // Note: expo-location doesn't directly support timeout, but we can implement it
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Location request timeout')), options.timeout);
        });

        const locationPromise = Location.getCurrentPositionAsync(locationOptions);
        
        const location = await Promise.race([locationPromise, timeoutPromise]);
        
        return {
          success: true,
          data: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
          }
        };
      } else {
        const location = await Location.getCurrentPositionAsync(locationOptions);

        return {
          success: true,
          data: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
          }
        };
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      
      // Determine error type
      let errorCode = 'UNKNOWN_ERROR';
      let errorMessage = 'An unknown error occurred while getting location';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorCode = 'TIMEOUT';
          errorMessage = 'Location request timed out';
        } else if (error.message.includes('permission')) {
          errorCode = 'PERMISSION_DENIED';
          errorMessage = 'Location permission was denied';
        } else if (error.message.includes('unavailable')) {
          errorCode = 'UNAVAILABLE';
          errorMessage = 'Location is temporarily unavailable';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage
        }
      };
    }
  }

  /**
   * Check if location services are enabled on the device
   * @returns Promise<boolean> - true if enabled, false otherwise
   */
  static async isLocationEnabled(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      return enabled;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  /**
   * Get current permission status
   * @returns Promise<Location.LocationPermissionResponse> - Permission status
   */
  static async getPermissionStatus(): Promise<Location.LocationPermissionResponse> {
    try {
      return await Location.getForegroundPermissionsAsync();
    } catch (error) {
      console.error('Error getting permission status:', error);
      // Return a default permission response if there's an error
      return {
        status: Location.PermissionStatus.UNDETERMINED,
        canAskAgain: true,
        granted: false,
        expires: 'never'
      };
    }
  }

  /**
   * Watch location changes and call callback with updates
   * @param callback - Function to call with location updates
   * @param options - Watch options
   * @returns Promise<boolean> - true if watch started successfully
   */
  static async watchLocation(
    callback: (result: LocationResult) => void,
    options?: {
      accuracy?: Location.Accuracy;
      timeInterval?: number;
      distanceInterval?: number;
    }
  ): Promise<boolean> {
    try {
      // Stop any existing watch
      await this.stopWatchingLocation();

      // Check permissions
      if (this.permissionGranted === null || this.permissionGranted === false) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
          callback({
            success: false,
            error: {
              code: 'PERMISSION_DENIED',
              message: 'Location permission is required to watch location'
            }
          });
          return false;
        }
      }

      const watchOptions: Location.LocationOptions = {
        accuracy: options?.accuracy || Location.Accuracy.High,
        timeInterval: options?.timeInterval || 10000, // 10 seconds default
        distanceInterval: options?.distanceInterval || 10, // 10 meters default
      };

      this.watchId = await Location.watchPositionAsync(watchOptions, (location) => {
        callback({
          success: true,
          data: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
          }
        });
      });

      return true;
    } catch (error) {
      console.error('Error starting location watch:', error);
      callback({
        success: false,
        error: {
          code: 'WATCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to start location watch'
        }
      });
      return false;
    }
  }

  /**
   * Stop watching location changes
   * @returns Promise<void>
   */
  static async stopWatchingLocation(): Promise<void> {
    try {
      if (this.watchId) {
        this.watchId.remove();
        this.watchId = null;
      }
    } catch (error) {
      console.error('Error stopping location watch:', error);
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   * @param coord1 - First coordinate
   * @param coord2 - Second coordinate
   * @returns number - Distance in meters
   */
  static calculateDistance(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Reset permission state (useful for testing or when permissions change)
   */
  static resetPermissionState(): void {
    this.permissionGranted = null;
  }

  /**
   * Get a cached location if available and not too old
   * @param maxAge - Maximum age of cached location in milliseconds
   * @returns Promise<LocationResult | null> - Cached location or null
   */
  static async getCachedLocation(maxAge: number = 60000): Promise<LocationResult | null> {
    try {
      if (this.permissionGranted === false) {
        return null;
      }

      const location = await Location.getLastKnownPositionAsync({
        maxAge,
        requiredAccuracy: 1000, // 1km accuracy threshold
      });

      if (!location) {
        return null;
      }

      return {
        success: true,
        data: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || undefined,
          altitude: location.coords.altitude || undefined,
          heading: location.coords.heading || undefined,
          speed: location.coords.speed || undefined,
        }
      };
    } catch (error) {
      console.error('Error getting cached location:', error);
      return null;
    }
  }
}