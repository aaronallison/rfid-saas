import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Organization } from '../types';

export default function OrganizationSelectScreen() {
  const { user, selectOrganization, signOut } = useAuth();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const handleSelectOrganization = async (org: Organization) => {
    try {
      setSelecting(org.id);
      selectOrganization(org);
    } catch (error) {
      console.error('Error selecting organization:', error);
      Alert.alert(
        'Error',
        'Failed to select organization. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSelecting(null);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              setSigningOut(true);
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert(
                'Error',
                'Failed to sign out. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setSigningOut(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderOrganization = ({ item }: { item: Organization }) => {
    const isSelecting = selecting === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.orgItem, isSelecting && styles.orgItemSelecting]}
        onPress={() => handleSelectOrganization(item)}
        disabled={isSelecting || signingOut}
        accessibilityLabel={`Select organization ${item.name}`}
        accessibilityHint={`Tap to select ${item.name} as your active organization`}
        accessibilityRole="button"
      >
        <View style={styles.orgContent}>
          <Text style={styles.orgName}>{item.name}</Text>
          <Text style={styles.orgId}>ID: {item.id}</Text>
        </View>
        {isSelecting && (
          <ActivityIndicator 
            size="small" 
            color="#007AFF" 
            style={styles.loadingIndicator}
          />
        )}
      </TouchableOpacity>
    );
  };

  // Add null safety checks
  const organizations = user?.organizations || [];
  
  if (organizations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Organizations</Text>
          <Text style={styles.emptyMessage}>
            You don't have access to any organizations. Please contact your administrator.
          </Text>
          <TouchableOpacity 
            style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]} 
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityLabel="Sign out"
            accessibilityHint="Tap to sign out of your account"
            accessibilityRole="button"
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Organization</Text>
        <Text style={styles.subtitle}>
          Choose which organization to work with{organizations.length > 1 ? ` (${organizations.length} available)` : ''}
        </Text>
      </View>

      <FlatList
        data={organizations}
        renderItem={renderOrganization}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="organizations-list"
      />

      <TouchableOpacity 
        style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]} 
        onPress={handleSignOut}
        disabled={signingOut}
        accessibilityLabel="Sign out"
        accessibilityHint="Tap to sign out of your account"
        accessibilityRole="button"
      >
        {signingOut ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
  },
  orgItem: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orgItemSelecting: {
    opacity: 0.7,
  },
  orgContent: {
    flex: 1,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  orgId: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 24,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  loadingIndicator: {
    marginLeft: 12,
  },
});