import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import { Capture } from '@/types/rfid';

const STORAGE_KEY_CAPTURES = '@captures';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export class CaptureService {
  private static instance: CaptureService;

  private constructor() {}

  static getInstance(): CaptureService {
    if (!CaptureService.instance) {
      CaptureService.instance = new CaptureService();
    }
    return CaptureService.instance;
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async createCapture(rfidTag?: string, additionalData?: any): Promise<Capture> {
    let location: LocationData | undefined;
    
    try {
      location = await this.getCurrentLocation();
    } catch (error) {
      console.warn('Could not get location for capture:', error);
      // Continue without location data for offline capability
    }

    const capture: Capture = {
      id: this.generateId(),
      rfid_tag: rfidTag,
      latitude: location?.latitude,
      longitude: location?.longitude,
      timestamp: new Date(),
      data: additionalData,
      synced: false,
    };

    await this.saveCapture(capture);
    return capture;
  }

  async saveCapture(capture: Capture): Promise<void> {
    try {
      const captures = await this.getAllCaptures();
      captures.push(capture);
      await AsyncStorage.setItem(STORAGE_KEY_CAPTURES, JSON.stringify(captures));
    } catch (error) {
      console.error('Failed to save capture:', error);
      throw error;
    }
  }

  async getAllCaptures(): Promise<Capture[]> {
    try {
      const capturesJson = await AsyncStorage.getItem(STORAGE_KEY_CAPTURES);
      if (capturesJson) {
        const captures = JSON.parse(capturesJson);
        // Convert timestamp strings back to Date objects
        return captures.map((capture: any) => ({
          ...capture,
          timestamp: new Date(capture.timestamp),
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to load captures:', error);
      return [];
    }
  }

  async deleteCapture(id: string): Promise<void> {
    try {
      const captures = await this.getAllCaptures();
      const filteredCaptures = captures.filter(capture => capture.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY_CAPTURES, JSON.stringify(filteredCaptures));
    } catch (error) {
      console.error('Failed to delete capture:', error);
      throw error;
    }
  }

  async markCaptureSynced(id: string): Promise<void> {
    try {
      const captures = await this.getAllCaptures();
      const updatedCaptures = captures.map(capture =>
        capture.id === id ? { ...capture, synced: true } : capture
      );
      await AsyncStorage.setItem(STORAGE_KEY_CAPTURES, JSON.stringify(updatedCaptures));
    } catch (error) {
      console.error('Failed to mark capture as synced:', error);
      throw error;
    }
  }

  async getUnsyncedCaptures(): Promise<Capture[]> {
    const captures = await this.getAllCaptures();
    return captures.filter(capture => !capture.synced);
  }
}