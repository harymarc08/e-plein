import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
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
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Véhicules" component={VehiculeScreen} />
        <Tab.Screen name="Plein" component={PleinScreen} />
        <Tab.Screen name="Essence" component={EssenceScreen} />
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
