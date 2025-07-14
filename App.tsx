import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SQLite from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import VehiculeScreen from './screens/VehiculeScreen';
import PleinScreen from './screens/PleinScreen';
import EssenceScreen from './screens/EssenceScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    const db = SQLite.openDatabaseSync('carburant.db');
    db.execAsync(`CREATE TABLE IF NOT EXISTS TypeEssence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prix_par_litre REAL NOT NULL,
      date_validite TEXT NOT NULL
    );`);
    db.execAsync(`CREATE TABLE IF NOT EXISTS Vehicule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      immatriculation TEXT NOT NULL UNIQUE,
      marque TEXT,
      modele TEXT,
      annee INTEGER,
      type_essence_id INTEGER,
      FOREIGN KEY (type_essence_id) REFERENCES TypeEssence(id)
    );`);
    db.execAsync(`CREATE TABLE IF NOT EXISTS CarburantEntree (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicule_id INTEGER NOT NULL,
      date_heure TEXT NOT NULL,
      km_precedent INTEGER NOT NULL,
      km_actuel INTEGER NOT NULL,
      quantite_litres REAL NOT NULL,
      prix_plein REAL,
      FOREIGN KEY (vehicule_id) REFERENCES Vehicule(id)
    );`);
  }, []);

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: {
              backgroundColor: '#ffffff',
              borderTopWidth: 0,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              height: 70,
              paddingBottom: 10,
              paddingTop: 10,
            },
            tabBarActiveTintColor: '#3b82f6',
            tabBarInactiveTintColor: '#6b7280',
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
              marginTop: 4,
            },
            headerStyle: {
              backgroundColor: '#3b82f6',
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
          }}
        >
          <Tab.Screen 
            name="Véhicules" 
            component={VehiculeScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <View style={[styles.tabIcon, styles.tabIconSquare, { backgroundColor: color }]} />
              ),
            }}
          />
          <Tab.Screen 
            name="Plein" 
            component={PleinScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <View style={[styles.tabIcon, styles.tabIconCircle, { backgroundColor: color }]} />
              ),
            }}
          />
          <Tab.Screen 
            name="Essence" 
            component={EssenceScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <View style={[styles.tabIcon, styles.tabIconRounded, { backgroundColor: color }]} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  tabIconSquare: {
    borderRadius: 4,
  },
  tabIconCircle: {
    borderRadius: 12,
  },
  tabIconRounded: {
    borderRadius: 8,
  },
});
